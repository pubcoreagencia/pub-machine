import { Injectable, Logger } from '@nestjs/common';
import { LeadScoringService } from './lead-scoring.service';
import { LeadIntentSignalsService } from './lead-intent-signals.service';
import { LeadEnrichmentService } from './lead-enrichment.service';

export interface LeadTouchEvent {
  leadId: string;
  channel: 'email' | 'whatsapp' | 'phone' | 'web' | 'social';
  direction: 'inbound' | 'outbound';
  timestamp: number;
  responseMs?: number;
  sentiment?: number; // -1..1
}

export interface VelocityReport {
  leadId: string;
  velocityScore: number; // 0..100
  stage: 'cold' | 'warm' | 'hot' | 'blazing';
  predictedConversionHours: number;
  recommendedNextAction: string;
  signals: {
    touchpoints: number;
    avgResponseTimeMs: number;
    inboundRatio: number;
    sentimentAvg: number;
    intentScore: number;
    enrichmentScore: number;
  };
  computedAt: number;
}

@Injectable()
export class LeadConversionVelocityService {
  private readonly logger = new Logger(LeadConversionVelocityService.name);
  private readonly events: Map<string, LeadTouchEvent[]> = new Map();

  // weights (sum = 1.0)
  private readonly W = {
    responseTime: 0.2,
    inbound: 0.2,
    sentiment: 0.15,
    frequency: 0.15,
    intent: 0.2,
    enrichment: 0.1,
  };

  constructor(
    private readonly scoring: LeadScoringService,
    private readonly intent: LeadIntentSignalsService,
    private readonly enrichment: LeadEnrichmentService,
  ) {}

  track(event: LeadTouchEvent): void {
    const arr = this.events.get(event.leadId) ?? [];
    arr.push(event);
    this.events.set(event.leadId, arr);
    this.logger.debug(`touch tracked lead=${event.leadId} channel=${event.channel} dir=${event.direction}`);
  }

  trackBatch(events: LeadTouchEvent[]): number {
    let n = 0;
    for (const e of events) { this.track(e); n++; }
    return n;
  }

  async computeVelocity(leadId: string): Promise<VelocityReport> {
    const evs = this.events.get(leadId) ?? [];
    const touchpoints = evs.length;

    const responseTimes = evs.filter(e => typeof e.responseMs === 'number').map(e => e.responseMs!);
    const avgResponseTimeMs = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : Number.POSITIVE_INFINITY;

    const inboundCount = evs.filter(e => e.direction === 'inbound').length;
    const inboundRatio = touchpoints ? inboundCount / touchpoints : 0;

    const sentiments = evs.filter(e => typeof e.sentiment === 'number').map(e => e.sentiment!);
    const sentimentAvg = sentiments.length
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

    // sub-scores 0..100
    const responseScore = this.scoreResponseTime(avgResponseTimeMs);
    const inboundScore = clamp(inboundRatio * 100, 0, 100);
    const sentimentScore = clamp((sentimentAvg + 1) * 50, 0, 100);
    const frequencyScore = this.scoreFrequency(touchpoints);

    const intentScore = await this.intent.getIntentScore(leadId).catch(() => 0);
    const enrichmentScore = await this.enrichment.getEnrichmentScore(leadId).catch(() => 0);

    const velocityScore = clamp(
      responseScore * this.W.responseTime +
      inboundScore * this.W.inbound +
      sentimentScore * this.W.sentiment +
      frequencyScore * this.W.frequency +
      intentScore * this.W.intent +
      enrichmentScore * this.W.enrichment,
      0, 100,
    );

    const stage = this.classifyStage(velocityScore, avgResponseTimeMs, inboundRatio);
    const predictedConversionHours = this.predictHours(velocityScore, touchpoints, avgResponseTimeMs);
    const recommendedNextAction = this.recommend(stage, inboundRatio, sentimentAvg);

    return {
      leadId,
      velocityScore: round(velocityScore, 2),
      stage,
      predictedConversionHours: round(predictedConversionHours, 1),
      recommendedNextAction,
      signals: {
        touchpoints,
        avgResponseTimeMs: Number.isFinite(avgResponseTimeMs) ? Math.round(avgResponseTimeMs) : -1,
        inboundRatio: round(inboundRatio, 3),
        sentimentAvg: round(sentimentAvg, 3),
        intentScore: round(intentScore, 2),
        enrichmentScore: round(enrichmentScore, 2),
      },
      computedAt: Date.now(),
    };
  }

  async computeBatch(leadIds: string[]): Promise<VelocityReport[]> {
    return Promise.all(leadIds.map(id => this.computeVelocity(id)));
  }

  async rankHotLeads(leadIds: string[], limit = 20): Promise<VelocityReport[]> {
    const reports = await this.computeBatch(leadIds);
    return reports.sort((a, b) => b.velocityScore - a.velocityScore).slice(0, limit);
  }

  async syncWithScoring(leadId: string): Promise<{ velocity: VelocityReport; score: number }> {
    const velocity = await this.computeVelocity(leadId);
    const base = await this.scoring.computeScore(leadId).catch(() => 0);
    const blended = clamp(base * 0.6 + velocity.velocityScore * 0.4, 0, 100);
    await this.scoring.upsertScore(leadId, blended).catch(() => undefined);
    return { velocity, score: blended };
  }

  private scoreResponseTime(ms: number): number {
    if (!Number.isFinite(ms)) return 20;
    if (ms <= 5 * 60_000) return 100;          // <= 5min
    if (ms <= 30 * 60_000) return 85;         // <= 30min
    if (ms <= 2 * 3600_000) return 70;        // <= 2h
    if (ms <= 24 * 3600_000) return 50;       // <= 1d
    if (ms <= 3 * 86400_000) return 30;       // <= 3d
    return 10;
  }

  private scoreFrequency(touchpoints: number): number {
    if (touchpoints <= 0) return 0;
    if (touchpoints >= 15) return 100;
    if (touchpoints >= 8) return 80;
    if (touchpoints >= 4) return 60;
    if (touchpoints >= 2) return 40;
    return 20;
  }

  private classifyStage(score: number, avgMs: number, inboundRatio: number): VelocityReport['stage'] {
    if (score >= 80 && inboundRatio >= 0.5) return 'blazing';
    if (score >= 65) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
  }

  private predictHours(score: number, touchpoints: number, avgMs: number): number {
    const base = Math.max(1, 168 * Math.pow(1 - score / 100, 1.6)); // up to 7 days
    const touchBoost = touchpoints > 5 ? 0.75 : touchpoints > 2 ? 0.9 : 1;
    const respBoost = Number.isFinite(avgMs) && avgMs < 30 * 60_000 ? 0.8 : 1;
    return base * touchBoost * respBoost;
  }

  private recommend(stage: VelocityReport['stage'], inboundRatio: number, sentimentAvg: number): string {
    if (stage === 'blazing') return 'Enviar proposta comercial personalizada em < 1h e abrir WhatsApp direto.';
    if (stage === 'hot') return inboundRatio > 0.4
      ? 'Agendar call de descoberta ainda hoje; preparar caso de uso similar.'
      : 'Disparar sequência multicanal (email + whatsapp) com oferta tempo-limitada.';
    if (stage === 'warm') return sentimentAvg < -0.1
      ? 'Reabrir conversa com abordagem consultiva e prova social.'
      : 'Nutrir com conteúdo de autoridade e remarketing por 7 dias.';
    return 'Manter em fluxo de nutrição automático; reavaliar em 14 dias.';
  }
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

function round(n: number, decimals: number): number {
    const f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
}
