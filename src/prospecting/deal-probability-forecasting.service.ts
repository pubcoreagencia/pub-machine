/**
 * Deal Probability Forecasting Service
 * -----------------------------------
 * Motor preditivo de probabilidade de fechamento (win-probability) para oportunidades
 * geradas pela plataforma Pub Machine.
 *
 * Combinacao de sinais:
 *   - Lead score (0-100)
 *   - Velocidade de conversao (days-in-stage)
 *   - Engagement / intent signals
 *   - Estagio atual do pipeline
 *   - Historico de fechamento por segmento (industry baseline)
 *
 * Nao depende de libs externas: implementacao pura TypeScript para garantir
 * execucao deterministica em ambientes serverless / edge / agent swarms.
 */

export type DealStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSING';

export interface ForecastingInput {
  dealId: string;
  leadScore: number;            // 0..100
  intentSignals: number;        // 0..100
  engagementScore: number;      // 0..100
  daysInStage: number;
  totalCycleDays: number;
  stage: DealStage;
  dealValue: number;            // BRL
  industryBaselineWinRate: number; // 0..1  (ex: 0.27)
  competitorPresent: boolean;
  decisionMakersEngaged: number;   // 1..5
}

export interface ForecastingOutput {
  dealId: string;
  winProbability: number;          // 0..1
  expectedValue: number;           // BRL
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  topDrivers: string[];
  recommendedActions: string[];
  forecastedCloseDate: string;     // ISO
  confidence: number;              // 0..1
}

// ----------------------------
// Pesos do modelo (soma = 1.0)
// ----------------------------
const WEIGHTS = {
  leadScore: 0.25,
  intentSignals: 0.15,
  engagement: 0.15,
  stageProgression: 0.15,
  decisionMakers: 0.10,
  cycleVelocity: 0.10,
  competitor: 0.05,
  industryBaseline: 0.05,
} as const;

const STAGE_BASE_SCORE: Record<DealStage, number> = {
  NEW: 0.10,
  CONTACTED: 0.20,
  QUALIFIED: 0.40,
  PROPOSAL: 0.60,
  NEGOTIATION: 0.80,
  CLOSING: 0.92,
};

const IDEAL_CYCLE_DAYS = 30;

export class DealProbabilityForecastingService {
  /**
   * Calcula a probabilidade de fechamento de um deal.
   */
  forecast(input: ForecastingInput): ForecastingOutput {
    const stageScore = STAGE_BASE_SCORE[input.stage];

    // Velocidade: bonus quando abaixo do ciclo ideal, penalidade quando acima.
    const velocityRatio = input.totalCycleDays / Math.max(IDEAL_CYCLE_DAYS, 1);
    const velocityScore = velocityRatio <= 1
      ? 1 - 0.2 * (velocityRatio - 1) * -1   // ate 20% bonus
      : Math.max(0, 1 - (velocityRatio - 1) * 0.4); // penaliza 40% por unidade acima

    // Estagnacao no estagio atual
    const stagnationPenalty = Math.min(0.15, Math.max(0, (input.daysInStage - 14) * 0.02));

    // Score ponderado final
    const weighted =
      WEIGHTS.leadScore * (input.leadScore / 100) +
      WEIGHTS.intentSignals * (input.intentSignals / 100) +
      WEIGHTS.engagement * (input.engagementScore / 100) +
      WEIGHTS.stageProgression * stageScore +
      WEIGHTS.decisionMakers * Math.min(1, input.decisionMakersEngaged / 3) +
      WEIGHTS.cycleVelocity * velocityScore +
      WEIGHTS.competitor * (input.competitorPresent ? 0.4 : 1.0) +
      WEIGHTS.industryBaseline * input.industryBaselineWinRate;

    const rawProbability = Math.max(0, Math.min(1, weighted - stagnationPenalty));

    // Confianca do modelo: mais estagios avancados + mais dados = mais confianca
    const dataCompleteness =
      (Number(input.leadScore > 0) +
        Number(input.intentSignals > 0) +
        Number(input.engagementScore > 0) +
        Number(input.daysInStage > 0) +
        Number(input.totalCycleDays > 0) +
        Number(input.dealValue > 0) +
        Number(input.industryBaselineWinRate > 0)) / 7;
    const confidence = Math.min(1, dataCompleteness * (0.7 + stageScore * 0.3));

    const expectedValue = input.dealValue * rawProbability;

    const { riskLevel, drivers, actions } = this.deriveInsights(input, rawProbability);
    const forecastedCloseDate = this.predictCloseDate(input);

    return {
      dealId: input.dealId,
      winProbability: Number(rawProbability.toFixed(4)),
      expectedValue: Number(expectedValue.toFixed(2)),
      riskLevel,
      topDrivers: drivers,
      recommendedActions: actions,
      forecastedCloseDate,
      confidence: Number(confidence.toFixed(4)),
    };
  }

  /**
   * Processa em lote - util para o pipeline diario do Pub Machine.
   */
  forecastBatch(inputs: ForecastingInput[]): ForecastingOutput[] {
    return inputs.map((i) => this.forecast(i));
  }

  // ---------------------------
  // Helpers internos
  // ---------------------------
  private deriveInsights(
    input: ForecastingInput,
    probability: number,
  ): { riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; drivers: string[]; actions: string[] } {
    const drivers: string[] = [];
    const actions: string[] = [];

    if (input.intentSignals >= 70) drivers.push('Sinais de intent fortes (pesquisa ativa, page-views chave)');
    else if (input.intentSignals < 30) drivers.push('Sinais de intent fracos');

    if (input.decisionMakersEngaged >= 3) drivers.push('Multiplos decisores engajados');
    else actions.push('Engajar mais decisores C-level / economic buyer');

    if (input.daysInStage > 14) actions.push('Reabrir conversa: oportunidade estagnada no estagio atual');

    if (input.competitorPresent) actions.push('Construir battle-card e reforcar diferenciais vs. concorrente');

    if (input.leadScore >= 80) drivers.push('Lead score elite');
    if (input.engagementScore < 40) actions.push('Aumentar cadencia: e-mails, social-touch e conteudo personalizado');

    if (drivers.length === 0) drivers.push('Probabilidade ainda incerta - coletar mais dados');

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (probability >= 0.7) riskLevel = 'LOW';
    else if (probability < 0.35) riskLevel = 'HIGH';

    return { riskLevel, drivers, actions };
  }

  private predictCloseDate(input: ForecastingInput): string {
    const remainingDays =
      (IDEAL_CYCLE_DAYS - input.totalCycleDays) +
      Math.max(0, input.daysInStage - 7);
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + Math.max(1, Math.round(remainingDays)));
    return closeDate.toISOString();
  }
}

// ----------------------------------------
// Funcao utilitaria exportada para uso direto
// em endpoints / jobs serverless do Pub Machine.
// ----------------------------------------
export function buildDealForecast(input: ForecastingInput): ForecastingOutput {
  return new DealProbabilityForecastingService().forecast(input);
}
