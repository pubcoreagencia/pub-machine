import { LeadScoringService, LeadScore } from './lead-scoring.service';
import { LeadIntentSignalsService, IntentSignal } from './lead-intent-signals.service';
import { LeadEnrichmentService, EnrichedLeadProfile } from './lead-enrichment.service';
import { LeadConversionVelocityService, VelocityPrediction } from './lead-conversion-velocity.service';
import { LeadPrioritizationOrchestratorService } from './lead-prioritization-orchestrator.service';

export interface PrioritizedLead {
  leadId: string;
  finalScore: number;
  confidence: number;
  priority: 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW' | 'P4_COLD';
  recommendedAction: string;
  nextBestStep: string;
  slaHours: number;
  assignedChannel: 'whatsapp' | 'phone' | 'email' | 'linkedin' | 'sdr_queue';
  reasoning: string[];
  scoreBreakdown: {
    fitScore: number;
    intentScore: number;
    velocityScore: number;
    enrichmentBoost: number;
    decayPenalty: number;
  };
  metadata: {
    processedAt: string;
    modelVersion: string;
    orchestratorVersion: string;
  };
}

export interface PrioritizationBatch {
  batchId: string;
  totalProcessed: number;
  distribution: Record<string, number>;
  topLeads: PrioritizedLead[];
  generatedAt: string;
}

export class LeadPrioritizationOrchestrator {
  private readonly MODEL_VERSION = 'ensemble-v3.2.1';
  private readonly ORCHESTRATOR_VERSION = '1.0.0';
  private readonly WEIGHTS = {
    fit: 0.30,
    intent: 0.35,
    velocity: 0.25,
    enrichment: 0.10,
  };

  constructor(
    private readonly scoringService: LeadScoringService,
    private readonly intentService: LeadIntentSignalsService,
    private readonly enrichmentService: LeadEnrichmentService,
    private readonly velocityService: LeadConversionVelocityService,
  ) {}

  async prioritizeLead(leadId: string): Promise<PrioritizedLead> {
    const [score, intent, enriched, velocity] = await Promise.all([
      this.scoringService.scoreLead(leadId),
      this.intentService.detectSignals(leadId),
      this.enrichmentService.enrichLead(leadId),
      this.velocityService.predictVelocity(leadId),
    ]);

    const breakdown = this.computeBreakdown(score, enriched, intent, velocity);
    const finalScore = this.computeFinalScore(breakdown);
    const confidence = this.computeConfidence(score, intent, enriched, velocity);
    const priority = this.classifyPriority(finalScore, confidence);
    const reasoning = this.buildReasoning(score, intent, enriched, velocity, breakdown);
    const decayPenalty = this.computeDecay(enriched.lastActivityAt);

    return {
      leadId,
      finalScore: Math.max(0, Math.min(100, finalScore - decayPenalty)),
      confidence,
      priority,
      recommendedAction: this.recommendAction(priority, intent),
      nextBestStep: this.computeNextBestStep(priority, velocity),
      slaHours: this.computeSLA(priority),
      assignedChannel: this.assignChannel(priority, intent),
      reasoning,
      scoreBreakdown: { ...breakdown, decayPenalty },
      metadata: {
        processedAt: new Date().toISOString(),
        modelVersion: this.MODEL_VERSION,
        orchestratorVersion: this.ORCHESTRATOR_VERSION,
      },
    };
  }

  async prioritizeBatch(leadIds: string[]): Promise<PrioritizationBatch> {
    const prioritized = await Promise.all(leadIds.map((id) => this.prioritizeLead(id).catch(() => null)));
    const valid = prioritized.filter((l): l is PrioritizedLead => l !== null);
    valid.sort((a, b) => b.finalScore - a.finalScore);

    const distribution: Record<string, number> = {};
    for (const lead of valid) {
      distribution[lead.priority] = (distribution[lead.priority] || 0) + 1;
    }

    return {
      batchId: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      totalProcessed: valid.length,
      distribution,
      topLeads: valid.slice(0, 50),
      generatedAt: new Date().toISOString(),
    };
  }

  private computeBreakdown(
    score: LeadScore,
    enriched: EnrichedLeadProfile,
    intent: IntentSignal,
    velocity: VelocityPrediction,
  ) {
    const fitScore = score.fitScore ?? 0;
    const intentScore = intent.intensity ?? 0;
    const velocityScore = velocity.probability ?? 0;
    const enrichmentBoost = enriched.completeness * 100;
    return { fitScore, intentScore, velocityScore, enrichmentBoost, decayPenalty: 0 };
  }

  private computeFinalScore(b: { fitScore: number; intentScore: number; velocityScore: number; enrichmentBoost: number }): number {
    return (
      b.fitScore * this.WEIGHTS.fit +
      b.intentScore * this.WEIGHTS.intent +
      b.velocityScore * this.WEIGHTS.velocity +
      b.enrichmentBoost * this.WEIGHTS.enrichment
    );
  }

  private computeConfidence(score: LeadScore, intent: IntentSignal, enriched: EnrichedLeadProfile, velocity: VelocityPrediction): number {
    const signals = [score.confidence ?? 0, intent.confidence ?? 0, enriched.confidence ?? 0, velocity.confidence ?? 0];
    const avg = signals.reduce((a, c) => a + c, 0) / signals.length;
    return Math.round(avg * 100) / 100;
  }

  private classifyPriority(finalScore: number, confidence: number): PrioritizedLead['priority'] {
    const adjusted = finalScore * (0.7 + 0.3 * confidence);
    if (adjusted >= 85) return 'P0_CRITICAL';
    if (adjusted >= 70) return 'P1_HIGH';
    if (adjusted >= 50) return 'P2_MEDIUM';
    if (adjusted >= 30) return 'P3_LOW';
    return 'P4_COLD';
  }

  private recommendAction(priority: PrioritizedLead['priority'], intent: IntentSignal): string {
    if (priority === 'P0_CRITICAL') return 'Acionar SDR sênior imediatamente via WhatsApp';
    if (priority === 'P1_HIGH') return 'Agendar call de discovery em até 2h';
    if (priority === 'P2_MEDIUM') return 'Nutrir com sequência multicanal personalizada';
    if (priority === 'P3_LOW') return 'Incluir em campanha de nurturing automatizado';
    return 'Manter em base fria com reavaliação em 30 dias';
  }

  private computeNextBestStep(priority: PrioritizedLead['priority'], velocity: VelocityPrediction): string {
    if (velocity.expectedDaysToConvert <= 7) return 'Fechamento rápido: proposta comercial em 24h';
    if (priority === 'P0_CRITICAL') return 'Discovery call + diagnóstico gratuito';
    if (priority === 'P1_HIGH') return 'Enviar case study personalizado do segmento';
    return 'Continuar nutrição com conteúdo educativo';
  }

  private computeSLA(priority: PrioritizedLead['priority']): number {
    const map: Record<PrioritizedLead['priority'], number> = {
      P0_CRITICAL: 1,
      P1_HIGH: 4,
      P2_MEDIUM: 24,
      P3_LOW: 72,
      P4_COLD: 168,
    };
    return map[priority];
  }

  private assignChannel(priority: PrioritizedLead['priority'], intent: IntentSignal): PrioritizedLead['assignedChannel'] {
    if (intent.channel === 'whatsapp' && (priority === 'P0_CRITICAL' || priority === 'P1_HIGH')) return 'whatsapp';
    if (priority === 'P0_CRITICAL') return 'phone';
    if (intent.channel === 'linkedin') return 'linkedin';
    if (priority === 'P1_HIGH') return 'sdr_queue';
    return 'email';
  }

  private buildReasoning(
    score: LeadScore,
    intent: IntentSignal,
    enriched: EnrichedLeadProfile,
    velocity: VelocityPrediction,
    breakdown: { fitScore: number; intentScore: number; velocityScore: number },
  ): string[] {
    const r: string[] = [];
    if (breakdown.fitScore >= 70) r.push(`ICP fit elevado (${breakdown.fitScore})`);
    if (breakdown.intentScore >= 60) r.push(`Sinais de intenção fortes detectados`);
    if (breakdown.velocityScore >= 50) r.push(`Alta probabilidade de conversão em ${velocity.expectedDaysToConvert} dias`);
    if (enriched.completeness < 0.5) r.push(`Enriquecimento parcial — considerar pesquisa adicional`);
    if (intent.negativeSignals > 0) r.push(`Atenção: ${intent.negativeSignals} sinais negativos identificados`);
    return r;
  }

  private computeDecay(lastActivityAt: string): number {
    const hours = (Date.now() - new Date(lastActivityAt).getTime()) / 36e5;
    if (hours <= 24) return 0;
    if (hours <= 72) return 3;
    if (hours <= 168) return 8;
    return 15;
  }
}
