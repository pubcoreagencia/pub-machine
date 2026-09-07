import { LeadScoringService, ScoreBreakdown } from './lead-scoring.service';
import { LeadIntentSignalsService, IntentSignal } from './lead-intent-signals.service';
import { LeadEnrichmentService, EnrichedLeadProfile } from './lead-enrichment.service';

export interface RawLead {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
  jobTitle?: string;
  source: 'inbound' | 'outbound' | 'referral' | 'event' | 'cold_list';
  capturedAt: string;
  notes?: string;
}

export type PipelineStage =
  | 'new'
  | 'enriched'
  | 'qualified'
  | 'hot'
  | 'nurture'
  | 'discarded';

export interface PrioritizedLead {
  leadId: string;
  email: string;
  fullName?: string;
  companyName?: string;
  jobTitle?: string;
  source: RawLead['source'];
  pipelineStage: PipelineStage;
  priorityScore: number;
  priorityTier: 'S' | 'A' | 'B' | 'C' | 'D';
  scoreBreakdown: ScoreBreakdown;
  intentSignals: IntentSignal[];
  enrichment?: EnrichedLeadProfile;
  reasoning: string[];
  nextAction: string;
  nextActionDueAt: string;
  slaHours: number;
  processedAt: string;
}

export interface OrchestratorConfig {
  hotThreshold: number;
  qualifyThreshold: number;
  nurtureThreshold: number;
  discardThreshold: number;
  sourceWeights: Record<RawLead['source'], number>;
  tierRanges: { tier: PrioritizedLead['priorityTier']; min: number }[];
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  hotThreshold: 85,
  qualifyThreshold: 65,
  nurtureThreshold: 40,
  discardThreshold: 15,
  sourceWeights: {
    referral: 1.25,
    inbound: 1.15,
    event: 1.1,
    outbound: 1.0,
    cold_list: 0.85,
  },
  tierRanges: [
    { tier: 'S', min: 90 },
    { tier: 'A', min: 75 },
    { tier: 'B', min: 55 },
    { tier: 'C', min: 30 },
    { tier: 'D', min: 0 },
  ],
};

const SLA_BY_TIER: Record<PrioritizedLead['priorityTier'], number> = {
  S: 1,
  A: 4,
  B: 12,
  C: 48,
  D: 168,
};

const NEXT_ACTION_BY_STAGE: Record<PipelineStage, string> = {
  new: 'Enrich lead profile',
  enriched: 'Score and route to SDR',
  qualified: 'Schedule discovery call',
  hot: 'Immediate outreach by senior closer',
  nurture: 'Add to drip campaign',
  discarded: 'Archive and mark as low-fit',
};

export class LeadPrioritizationOrchestrator {
  constructor(
    private readonly scoringService: LeadScoringService,
    private readonly intentSignalsService: LeadIntentSignalsService,
    private readonly enrichmentService: LeadEnrichmentService,
    private readonly config: OrchestratorConfig = DEFAULT_CONFIG,
  ) {}

  async processBatch(rawLeads: RawLead[]): Promise<PrioritizedLead[]> {
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return [];
    }

    const results: PrioritizedLead[] = [];

    for (const rawLead of rawLeads) {
      try {
        const prioritized = await this.processOne(rawLead);
        results.push(prioritized);
      } catch (error) {
        results.push(this.buildFallback(rawLead, error));
      }
    }

    return results.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  async processOne(rawLead: RawLead): Promise<PrioritizedLead> {
    const reasoning: string[] = [];
    const now = new Date();

    const enrichment = await this.enrichmentService.enrich({
      email: rawLead.email,
      fullName: rawLead.fullName,
      companyName: rawLead.companyName,
    });

    reasoning.push(
      enrichment.confidence > 0.7
        ? `Enrichment confidence high (${(enrichment.confidence * 100).toFixed(0)}%)`
        : `Enrichment confidence low (${(enrichment.confidence * 100).toFixed(0)}%)`,
    );

    const intentSignals = await this.intentSignalsService.detect(rawLead, enrichment);
    reasoning.push(`Detected ${intentSignals.length} intent signals`);

    const baseScore = this.scoringService.computeScore({
      rawLead,
      enrichment,
      intentSignals,
    });

    const sourceMultiplier = this.config.sourceWeights[rawLead.source] ?? 1.0;
    const weightedScore = Math.min(
      100,
      Math.round(baseScore.total * sourceMultiplier),
    );

    reasoning.push(`Base score ${baseScore.total} adjusted by source multiplier ${sourceMultiplier}`);

    const tier = this.resolveTier(weightedScore);
    const stage = this.resolveStage(weightedScore);
    const slaHours = SLA_BY_TIER[tier];
    const dueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    reasoning.push(`Tier ${tier} with SLA ${slaHours}h`);

    return {
      leadId: rawLead.id,
      email: rawLead.email,
      fullName: rawLead.fullName,
      companyName: rawLead.companyName,
      jobTitle: rawLead.jobTitle,
      source: rawLead.source,
      pipelineStage: stage,
      priorityScore: weightedScore,
      priorityTier: tier,
      scoreBreakdown: baseScore,
      intentSignals,
      enrichment,
      reasoning,
      nextAction: NEXT_ACTION_BY_STAGE[stage],
      nextActionDueAt: dueAt.toISOString(),
      slaHours,
      processedAt: now.toISOString(),
    };
  }

  private resolveTier(score: number): PrioritizedLead['priorityTier'] {
    for (const range of this.config.tierRanges) {
      if (score >= range.min) return range.tier;
    }
    return 'D';
  }

  private resolveStage(score: number): PipelineStage {
    if (score >= this.config.hotThreshold) return 'hot';
    if (score >= this.config.qualifyThreshold) return 'qualified';
    if (score >= this.config.nurtureThreshold) return 'nurture';
    if (score <= this.config.discardThreshold) return 'discarded';
    return 'enriched';
  }

  private buildFallback(rawLead: RawLead, error: unknown): PrioritizedLead {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const now = new Date();
    return {
      leadId: rawLead.id,
      email: rawLead.email,
      fullName: rawLead.fullName,
      companyName: rawLead.companyName,
      jobTitle: rawLead.jobTitle,
      source: rawLead.source,
      pipelineStage: 'new',
      priorityScore: 0,
      priorityTier: 'D',
      scoreBreakdown: {
        total: 0,
        factors: [],
      },
      intentSignals: [],
      reasoning: [`Processing failed: ${message}`],
      nextAction: 'Manual triage required',
      nextActionDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      slaHours: 24,
      processedAt: now.toISOString(),
    };
  }

  getMetrics(leads: PrioritizedLead[]): {
    total: number;
    byTier: Record<PrioritizedLead['priorityTier'], number>;
    byStage: Record<PipelineStage, number>;
    averageScore: number;
    hotLeads: number;
  } {
    const byTier: Record<PrioritizedLead['priorityTier'], number> = {
      S: 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };
    const byStage: Record<PipelineStage, number> = {
      new: 0,
      enriched: 0,
      qualified: 0,
      hot: 0,
      nurture: 0,
      discarded: 0,
    };

    let scoreSum = 0;
    let hotLeads = 0;

    for (const lead of leads) {
      byTier[lead.priorityTier]++;
      byStage[lead.pipelineStage]++;
      scoreSum += lead.priorityScore;
      if (lead.pipelineStage === 'hot') hotLeads++;
    }

    return {
      total: leads.length,
      byTier,
      byStage,
      averageScore: leads.length === 0 ? 0 : Number((scoreSum / leads.length).toFixed(2)),
      hotLeads,
    };
  }
}

export const leadPrioritizationOrchestrator = new LeadPrioritizationOrchestrator(
  new LeadScoringService(),
  new LeadIntentSignalsService(),
  new LeadEnrichmentService(),
);
