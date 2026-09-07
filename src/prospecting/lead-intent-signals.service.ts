import { Injectable, Logger } from '@nestjs/common';
import { LeadScoringService } from './lead-scoring.service';
import { LeadEnrichmentService } from './lead-enrichment.service';

export interface IntentSignal {
  id: string;
  leadId: string;
  type: 'pricing_visit' | 'demo_request' | 'docs_read' | 'competitor_switch' | 'funding_event' | 'hiring_spike' | 'webinar_attend' | 'github_star' | 'review_site_mention' | 'linkedin_engagement';
  source: string;
  weight: number;
  rawPayload: Record<string, unknown>;
  detectedAt: Date;
}

export interface IntentSignalInput {
  leadId: string;
  type: IntentSignal['type'];
  source: string;
  rawPayload?: Record<string, unknown>;
}

export interface LeadIntentProfile {
  leadId: string;
  totalScore: number;
  signals: IntentSignal[];
  topSignalType: IntentSignal['type'] | null;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  decayAdjustedScore: number;
  lastSignalAt: Date | null;
}

const SIGNAL_WEIGHTS: Record<IntentSignal['type'], number> = {
  pricing_visit: 25,
  demo_request: 35,
  docs_read: 10,
  competitor_switch: 40,
  funding_event: 30,
  hiring_spike: 15,
  webinar_attend: 20,
  github_star: 8,
  review_site_mention: 12,
  linkedin_engagement: 5,
};

const SIGNAL_DECAY_HOURS: Record<IntentSignal['type'], number> = {
  pricing_visit: 72,
  demo_request: 48,
  docs_read: 168,
  competitor_switch: 336,
  funding_event: 720,
  hiring_spike: 504,
  webinar_attend: 240,
  github_star: 720,
  review_site_mention: 336,
  linkedin_engagement: 168,
};

@Injectable()
export class LeadIntentSignalsService {
  private readonly logger = new Logger(LeadIntentSignalsService.name);
  private readonly signals = new Map<string, IntentSignal[]>();
  private readonly MAX_SIGNALS_PER_LEAD = 200;

  constructor(
    private readonly leadScoringService: LeadScoringService,
    private readonly leadEnrichmentService: LeadEnrichmentService,
  ) {}

  async captureSignal(input: IntentSignalInput): Promise<IntentSignal> {
    if (!input.leadId || !input.type || !input.source) {
      throw new Error('leadId, type and source are required to capture an intent signal');
    }

    const weight = SIGNAL_WEIGHTS[input.type];
    if (weight === undefined) {
      throw new Error(`Unknown intent signal type: ${input.type}`);
    }

    const signal: IntentSignal = {
      id: this.generateId(),
      leadId: input.leadId,
      type: input.type,
      source: input.source,
      weight,
      rawPayload: input.rawPayload ?? {},
      detectedAt: new Date(),
    };

    const list = this.signals.get(input.leadId) ?? [];
    list.push(signal);

    if (list.length > this.MAX_SIGNALS_PER_LEAD) {
      list.splice(0, list.length - this.MAX_SIGNALS_PER_LEAD);
    }

    this.signals.set(input.leadId, list);
    this.logger.log(`Captured intent signal ${signal.type} (weight=${weight}) for lead ${signal.leadId}`);

    await this.leadScoringService.recalculateFromSignals?.(input.leadId, this.buildProfile(input.leadId));
    await this.leadEnrichmentService.touchLead?.(input.leadId, `intent:${signal.type}`);

    return signal;
  }

  async captureBatch(inputs: IntentSignalInput[]): Promise<IntentSignal[]> {
    const captured: IntentSignal[] = [];
    for (const input of inputs) {
      try {
        captured.push(await this.captureSignal(input));
      } catch (err) {
        this.logger.warn(`Failed to capture signal for lead ${input.leadId}: ${(err as Error).message}`);
      }
    }
    return captured;
  }

  buildProfile(leadId: string): LeadIntentProfile {
    const list = this.signals.get(leadId) ?? [];
    const now = new Date();

    let totalScore = 0;
    let decayAdjustedScore = 0;
    const typeCounts = new Map<IntentSignal['type'], number>();
    let topSignalType: IntentSignal['type'] | null = null;
    let topWeight = -Infinity;
    let lastSignalAt: Date | null = null;

    for (const signal of list) {
      totalScore += signal.weight;
      const decayHours = SIGNAL_DECAY_HOURS[signal.type];
      const ageHours = (now.getTime() - signal.detectedAt.getTime()) / 36e5;
      const decayFactor = Math.max(0, 1 - ageHours / decayHours);
      decayAdjustedScore += signal.weight * decayFactor;

      typeCounts.set(signal.type, (typeCounts.get(signal.type) ?? 0) + 1);

      if (signal.weight > topWeight) {
        topWeight = signal.weight;
        topSignalType = signal.type;
      }

      if (!lastSignalAt || signal.detectedAt > lastSignalAt) {
        lastSignalAt = signal.detectedAt;
      }
    }

    const urgencyLevel = this.resolveUrgency(decayAdjustedScore);
    const recommendedAction = this.resolveAction(urgencyLevel, topSignalType);

    return {
      leadId,
      totalScore,
      signals: list,
      topSignalType,
      urgencyLevel,
      recommendedAction,
      decayAdjustedScore: Math.round(decayAdjustedScore * 100) / 100,
      lastSignalAt,
    };
  }

  async getTopLeadsByIntent(limit = 20): Promise<LeadIntentProfile[]> {
    const profiles: LeadIntentProfile[] = [];
    for (const leadId of this.signals.keys()) {
      profiles.push(this.buildProfile(leadId));
    }
    profiles.sort((a, b) => b.decayAdjustedScore - a.decayAdjustedScore);
    return profiles.slice(0, limit);
  }

  async getCriticalLeads(): Promise<LeadIntentProfile[]> {
    const all = await this.getTopLeadsByIntent(1000);
    return all.filter((p) => p.urgencyLevel === 'critical');
  }

  purgeStaleSignals(olderThanDays = 90): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let removed = 0;
    for (const [leadId, list] of this.signals.entries()) {
      const filtered = list.filter((s) => s.detectedAt >= cutoff);
      removed += list.length - filtered.length;
      if (filtered.length === 0) {
        this.signals.delete(leadId);
      } else {
        this.signals.set(leadId, filtered);
      }
    }
    this.logger.log(`Purged ${removed} stale intent signals older than ${olderThanDays} days`);
    return removed;
  }

  exportSignals(leadId: string): IntentSignal[] {
    return [...(this.signals.get(leadId) ?? [])];
  }

  private resolveUrgency(score: number): LeadIntentProfile['urgencyLevel'] {
    if (score >= 80) return 'critical';
    if (score >= 45) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }

  private resolveAction(urgency: LeadIntentProfile['urgencyLevel'], top: IntentSignal['type'] | null): string {
    if (urgency === 'low') return 'nurture:weekly_drip';
    if (urgency === 'medium') return 'nurture:targeted_sequence';
    if (urgency === 'critical') {
      if (top === 'demo_request' || top === 'pricing_visit') return 'sales:call_within_1h';
      if (top === 'competitor_switch') return 'sales:competitive_playbook';
      if (top === 'funding_event') return 'sales:timing_pitch_within_24h';
      return 'sales:priority_outreach';
    }
    return 'sales:standard_followup';
  }

  private generateId(): string {
    return `sig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
