import { LeadScoringService } from './lead-scoring.service';
import { LeadIntentSignalsService } from './lead-intent-signals.service';
import { LeadEnrichmentService } from './lead-enrichment.service';

/**
 * DealVelocityPrediction
 * Resultado consolidado da previsão de velocidade de fechamento.
 */
export interface DealVelocityPrediction {
  leadId: string;
  velocityScore: number;            // 0-100
  expectedCloseDays: number;        // dias estimados para fechamento
  probabilityOfClose: number;       // 0-1
  confidence: 'low' | 'medium' | 'high';
  recommendedAction: string;
  signals: {
    intentWeight: number;
    enrichmentWeight: number;
    scoringWeight: number;
    recencyBoost: number;
  };
  computedAt: string;
}

interface PredictInput {
  leadId: string;
  tenantId: string;
  lastTouchpointAt?: Date;
}

const VELOCITY_BANDS = {
  HOT: 75,
  WARM: 45,
  COLD: 0,
} as const;

/**
 * PredictiveDealVelocityService
 * Combina sinais de intenção, enriquecimento e scoring para prever
 * em quantos dias um lead deve fechar e com qual probabilidade.
 */
export class PredictiveDealVelocityService {
  constructor(
    private readonly scoring: LeadScoringService,
    private readonly intent: LeadIntentSignalsService,
    private readonly enrichment: LeadEnrichmentService,
  ) {}

  async predict(input: PredictInput): Promise<DealVelocityPrediction> {
    const [score, intentSignals, enriched] = await Promise.all([
      this.scoring.scoreLead(input.leadId),
      this.intent.detect(input.leadId),
      this.enrichment.enrich(input.leadId, input.tenantId),
    ]);

    const intentWeight = Math.min(intentSignals.strength * 100, 100);
    const enrichmentWeight = enriched.completeness;
    const scoringWeight = score.score;

    const recencyBoost = this.computeRecencyBoost(input.lastTouchpointAt);

    const velocityScore = this.computeVelocityScore({
      intentWeight,
      enrichmentWeight,
      scoringWeight,
      recencyBoost,
    });

    const expectedCloseDays = this.projectCloseDays(velocityScore, intentSignals.urgencyDays);
    const probabilityOfClose = this.deriveProbability(velocityScore, enriched.firmographicFit);

    return {
      leadId: input.leadId,
      velocityScore,
      expectedCloseDays,
      probabilityOfClose,
      confidence: this.deriveConfidence(intentWeight, enrichmentWeight),
      recommendedAction: this.recommend(velocityScore, expectedCloseDays),
      signals: { intentWeight, enrichmentWeight, scoringWeight, recencyBoost },
      computedAt: new Date().toISOString(),
    };
  }

  async predictBatch(inputs: PredictInput[]): Promise<DealVelocityPrediction[]> {
    return Promise.all(inputs.map((i) => this.predict(i)));
  }

  private computeRecencyBoost(lastTouchpointAt?: Date): number {
    if (!lastTouchpointAt) return 0;
    const ageHours = (Date.now() - lastTouchpointAt.getTime()) / 3_600_000;
    if (ageHours <= 24) return 15;
    if (ageHours <= 72) return 8;
    if (ageHours <= 168) return 3;
    return 0;
  }

  private computeVelocityScore(parts: {
    intentWeight: number;
    enrichmentWeight: number;
    scoringWeight: number;
    recencyBoost: number;
  }): number {
    const weighted =
      parts.intentWeight * 0.35 +
      parts.enrichmentWeight * 0.2 +
      parts.scoringWeight * 0.4 +
      parts.recencyBoost * 0.05;
    return Math.min(Math.max(Math.round(weighted * 10) / 10, 0), 100);
  }

  private projectCloseDays(velocityScore: number, urgencyHint?: number): number {
    if (typeof urgencyHint === 'number' && urgencyHint > 0) {
      return Math.max(1, Math.round(urgencyHint));
    }
    if (velocityScore >= VELOCITY_BANDS.HOT) return 7;
    if (velocityScore >= VELOCITY_BANDS.WARM) return 21;
    if (velocityScore >= 25) return 45;
    return 90;
  }

  private deriveProbability(velocityScore: number, firmographicFit: number): number {
    const base = velocityScore / 100;
    const adjusted = base * (0.6 + 0.4 * firmographicFit);
    return Math.min(Math.max(Number(adjusted.toFixed(3)), 0), 1);
  }

  private deriveConfidence(intent: number, enrichment: number): 'low' | 'medium' | 'high' {
    const coverage = (intent + enrichment) / 2;
    if (coverage >= 70) return 'high';
    if (coverage >= 40) return 'medium';
    return 'low';
  }

  private recommend(velocityScore: number, expectedCloseDays: number): string {
    if (velocityScore >= VELOCITY_BANDS.HOT) {
      return `Acelerar fechamento em ate ${expectedCloseDays} dias: agendar demo executiva e enviar proposta.`;
    }
    if (velocityScore >= VELOCITY_BANDS.WARM) {
      return `Nutrir com case study setorial e follow-up em ${Math.min(expectedCloseDays, 14)} dias.`;
    }
    return 'Manter em nurturing automatizado e reavaliar em 30 dias.';
  }
}

export const predictiveDealVelocityService = new PredictiveDealVelocityService(
  new LeadScoringService(),
  new LeadIntentSignalsService(),
  new LeadEnrichmentService(),
);
