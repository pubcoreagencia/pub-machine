import { leadScoringService } from './lead-scoring.service';
import { leadPrioritizationOrchestrator } from './lead-prioritization-orchestrator.service';

export type PipelineStage = 'cold' | 'engaged' | 'qualified' | 'opportunity' | 'closed_won';

export interface VelocitySignal {
  leadId: string;
  currentStage: PipelineStage;
  stageEnteredAt: Date;
  previousStageDurationMs?: number;
  intentScore: number;
  fitScore: number;
  engagementFrequency: number;
  budgetSignal: number;
}

export interface VelocityPrediction {
  leadId: string;
  estimatedHoursToOpportunity: number;
  probabilityNext72h: number;
  velocityIndex: number;
  recommendedAction: 'nurture' | 'accelerate' | 'assign_sdr' | 'close_loop';
  reasoning: string;
}

const STAGE_BENCHMARKS: Record<PipelineStage, number> = {
  cold: 168,
  engaged: 72,
  qualified: 48,
  opportunity: 24,
  closed_won: 0,
};

class LeadConversionVelocityService {
  predict(signal: VelocitySignal): VelocityPrediction {
    const compositeScore = this.computeComposite(signal);
    const stageBenchmark = STAGE_BENCHMARKS[signal.currentStage] ?? 72;
    const adjustedHours = Math.max(
      1,
      Math.round(stageBenchmark * (1 - compositeScore * 0.6)),
    );
    const probability72h = Math.min(
      1,
      compositeScore * 0.85 + (signal.engagementFrequency / 20) * 0.15,
    );
    const velocityIndex = this.computeVelocityIndex(signal, adjustedHours);
    const action = this.recommendAction(signal, probability72h, velocityIndex);

    return {
      leadId: signal.leadId,
      estimatedHoursToOpportunity: adjustedHours,
      probabilityNext72h: Number(probability72h.toFixed(3)),
      velocityIndex: Number(velocityIndex.toFixed(3)),
      recommendedAction: action,
      reasoning: this.buildReasoning(signal, compositeScore, adjustedHours),
    };
  }

  rank(predictions: VelocityPrediction[]): VelocityPrediction[] {
    return [...predictions].sort((a, b) => {
      if (b.probabilityNext72h !== a.probabilityNext72h) {
        return b.probabilityNext72h - a.probabilityNext72h;
      }
      return a.estimatedHoursToOpportunity - b.estimatedHoursToOpportunity;
    });
  }

  async predictBatch(signals: VelocitySignal[]): Promise<VelocityPrediction[]> {
    const results = signals.map((s) => this.predict(s));
    return this.rank(results);
  }

  async hydrateFromOrchestrator(
    leadId: string,
    intentScore: number,
    engagementFrequency: number,
  ): Promise<VelocityPrediction | null> {
    const scoring = await leadScoringService.scoreLead({
      leadId,
      intentScore,
      engagementFrequency,
      budgetSignal: 0.5,
    });
    const prioritized = await leadPrioritizationOrchestrator.prioritize([
      { leadId, score: scoring.composite },
    ]);
    if (!prioritized[0]) return null;

    return this.predict({
      leadId,
      currentStage: 'engaged',
      stageEnteredAt: new Date(),
      intentScore,
      fitScore: scoring.composite,
      engagementFrequency,
      budgetSignal: 0.5,
    });
  }

  private computeComposite(signal: VelocitySignal): number {
    const intentWeight = 0.35;
    const fitWeight = 0.3;
    const engagementWeight = 0.2;
    const budgetWeight = 0.15;
    const normalizedEngagement = Math.min(1, signal.engagementFrequency / 10);
    return (
      signal.intentScore * intentWeight +
      signal.fitScore * fitWeight +
      normalizedEngagement * engagementWeight +
      signal.budgetSignal * budgetWeight
    );
  }

  private computeVelocityIndex(
    signal: VelocitySignal,
    estimatedHours: number,
  ): number {
    const stageBenchmark = STAGE_BENCHMARKS[signal.currentStage] ?? 72;
    const speedRatio = stageBenchmark / Math.max(1, estimatedHours);
    const stageMultiplier =
      signal.currentStage === 'qualified' || signal.currentStage === 'engaged'
        ? 1.15
        : 1;
    return Math.min(1.5, speedRatio * stageMultiplier);
  }

  private recommendAction(
    signal: VelocitySignal,
    probability: number,
    velocityIndex: number,
  ): VelocityPrediction['recommendedAction'] {
    if (probability >= 0.75 && velocityIndex >= 1) return 'assign_sdr';
    if (probability >= 0.55) return 'accelerate';
    if (signal.intentScore >= 0.6) return 'nurture';
    return 'close_loop';
  }

  private buildReasoning(
    signal: VelocitySignal,
    composite: number,
    hours: number,
  ): string {
    return `Composite=${composite.toFixed(2)} intent=${signal.intentScore.toFixed(2)} fit=${signal.fitScore.toFixed(2)} stage=${signal.currentStage} ETA=${hours}h`;
  }
}

export const leadConversionVelocityService = new LeadConversionVelocityService();
