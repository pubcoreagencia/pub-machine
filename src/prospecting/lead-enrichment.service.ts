import { LeadScoringService, ScoredLead } from './lead-scoring.service';

export interface RawLead {
  id: string;
  email?: string;
  companyName: string;
  domain?: string;
  phone?: string;
  linkedinUrl?: string;
  source: string;
  capturedAt: Date;
}

export interface EnrichmentProvider {
  name: string;
  enrich(lead: RawLead, signal: AbortSignal): Promise<EnrichmentData>;
}

export interface EnrichmentData {
  industry?: string;
  companySize?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | unknown;
  revenueUsd?: number;
  headquarters?: string;
  technologies?: string[];
  decisionMaker?: {
    name: string;
    title: string;
    seniority: 'IC' | 'manager' | 'director' | 'vp' | 'c-level';
  };
  socialProfiles?: Record<string, string>;
  fundingStage?: string;
  intentSignals?: string[];
}

export interface EnrichmentResult {
  lead: RawLead;
  data: EnrichmentData;
  providers: string[];
  durationMs: number;
  cached: boolean;
}

export class LeadEnrichmentService {
  private readonly cache = new Map<string, { result: EnrichmentResult; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<EnrichmentResult>>();
  private readonly scoreService: LeadScoringService;

  constructor(
    private readonly providers: EnrichmentProvider[],
    private readonly opts: { ttlMs?: number; concurrency?: number; timeoutMs?: number } = {},
    scoreService?: LeadScoringService,
  ) {
    this.opts.ttlMs ??= 1000 * 60 * 60 * 6;
    this.opts.concurrency ??= 4;
    this.opts.timeoutMs ??= 8000;
    this.scoreService = scoreService ?? new LeadScoringService();
  }

  async enrich(lead: RawLead): Promise<EnrichmentResult> {
    const key = this.cacheKey(lead);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }

    const inflight = this.inFlight.get(key);
    if (inflight) return inflight;

    const promise = this.execute(lead, key);
    this.inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
  }

  async enrichMany(leads: RawLead[]): Promise<EnrichmentResult[]> {
    const queue = [...leads];
    const results: EnrichmentResult[] = [];
    const workers = Array.from({ length: this.opts.concurrency! }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) return;
        results.push(await this.enrich(next));
      }
    });
    await Promise.all(workers);
    return results;
  }

  async enrichAndScore(lead: RawLead): Promise<ScoredLead & { enrichment: EnrichmentResult }> {
    const enrichment = await this.enrich(lead);
    const scored = this.scoreService.score({
      ...lead,
      industry: enrichment.data.industry,
      companySize: typeof enrichment.data.companySize === 'string' ? enrichment.data.companySize : undefined,
      revenueUsd: enrichment.data.revenueUsd,
      intentSignals: enrichment.data.intentSignals,
    } as any);
    return { ...scored, enrichment };
  }

  clearCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  private async execute(lead: RawLead, key: string): Promise<EnrichmentResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs!);

    try {
      const settled = await Promise.allSettled(
        this.providers.map(async (p) => ({ name: p.name, data: await p.enrich(lead, controller.signal) })),
      );

      const merged: EnrichmentData = {};
      const used: string[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled') {
          used.push(r.value.name);
          Object.assign(merged, r.value.data);
          if (r.value.data.technologies) {
            merged.technologies = Array.from(new Set([...(merged.technologies ?? []), ...r.value.data.technologies]));
          }
          if (r.value.data.intentSignals) {
            merged.intentSignals = Array.from(new Set([...(merged.intentSignals ?? []), ...r.value.data.intentSignals]));
          }
        }
      }

      const result: EnrichmentResult = {
        lead,
        data: merged,
        providers: used,
        durationMs: Date.now() - start,
        cached: false,
      };
      this.cache.set(key, { result, expiresAt: Date.now() + this.opts.ttlMs! });
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  private cacheKey(lead: RawLead): string {
    return `${lead.email ?? ''}::${lead.domain ?? ''}::${lead.companyName.toLowerCase().trim()}`;
  }
}

export class ClearbitProvider implements EnrichmentProvider {
  readonly name = 'clearbit';
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {}

  async enrich(lead: RawLead, signal: AbortSignal): Promise<EnrichmentData> {
    if (!lead.domain) return {};
    const res = await this.fetcher(`https://person.clearbit.com/v2/people/find?email=${encodeURIComponent(lead.email ?? '')}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal,
    });
    if (!res.ok) return {};
    const json: any = await res.json();
    return {
      decisionMaker: json?.person
        ? {
            name: `${json.person.name?.givenName ?? ''} ${json.person.name?.familyName ?? ''}`.trim(),
            title: json.person.employment?.title ?? 'Unknown',
            seniority: mapSeniority(json.person.employment?.seniority),
          }
        : undefined,
    };
  }
}

export class ApolloProvider implements EnrichmentProvider {
  readonly name = 'apollo';
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {}

  async enrich(lead: RawLead, signal: AbortSignal): Promise<EnrichmentData> {
    const res = await this.fetcher('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
      body: JSON.stringify({ q_person_email: lead.email, q_organization_domains: lead.domain ? [lead.domain] : undefined }),
      signal,
    });
    if (!res.ok) return {};
    const json: any = await res.json();
    const person = json?.people?.[0];
    const org = person?.organization;
    return {
      industry: org?.industry,
      companySize: org?.estimated_num_employees ? mapSize(org.estimated_num_employees) : undefined,
      revenueUsd: org?.estimated_annual_revenue_usd,
      headquarters: org?.city ? `${org.city}, ${org.country}` : undefined,
      technologies: org?.technology_stack ?? [],
      decisionMaker: person
        ? { name: person.name, title: person.title ?? 'Unknown', seniority: mapSeniority(person.seniority) }
        : undefined,
      fundingStage: org?.latest_funding_stage,
    };
  }
}

function mapSeniority(input?: string): 'IC' | 'manager' | 'director' | 'vp' | 'c-level' {
  const v = (input ?? '').toLowerCase();
  if (v.includes('cxo') || v.includes('owner') || v.includes('founder')) return 'c-level';
  if (v.includes('vp') || v.includes('vice')) return 'vp';
  if (v.includes('director')) return 'director';
  if (v.includes('manager') || v.includes('lead') || v.includes('head')) return 'manager';
  return 'IC';
}

function mapSize(employees: number): EnrichmentData['companySize'] {
  if (employees < 10) return 'micro';
  if (employees < 50) return 'small';
  if (employees < 250) return 'medium';
  if (employees < 1000) return 'large';
  return 'enterprise';
}
