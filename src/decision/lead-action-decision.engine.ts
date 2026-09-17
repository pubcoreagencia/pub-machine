/**
 * Lead Action Decision Engine
 * Módulo: Decision & Dispatch V0
 *
 * Avalia o perfil de intenção, score e evidências gerando uma
 * LeadActionDecision totalmente auditável e estruturada com:
 * WHY, WHAT, WHEN, CHANNEL, EVIDENCE, CONFIDENCE, EXPIRATION, PROVENANCE.
 */

import {
  ActionEvidence,
  ActionPriority,
  ActionUrgency,
  ExecutionMode,
  IChannelRecommendationEngine,
  LeadActionDecision,
} from './decision.types';
import { ChannelRecommendationEngine } from './channel-recommendation.engine';

export interface DecisionEngineContext {
  leadId: string;
  subjectId: string;
  intentScore: number;             // 0..100
  leadScore: number;               // 0..100
  evidence: ActionEvidence[];
  conversionVelocityHours?: number;
  lastTouchpointAt?: Date;
  intentTopChannels?: string[];
  now?: number;
}

export class LeadActionDecisionEngine {
  private readonly ENGINE_VERSION = 'decision_engine_v0.1.0';
  private readonly channelEngine: IChannelRecommendationEngine;

  constructor(channelEngine?: IChannelRecommendationEngine) {
    this.channelEngine = channelEngine ?? new ChannelRecommendationEngine();
  }

  /**
   * Gera uma decisão de ação operacional determinística.
   */
  evaluate(context: DecisionEngineContext): LeadActionDecision | null {
    const {
      leadId,
      subjectId,
      intentScore,
      leadScore,
      evidence,
      conversionVelocityHours,
      intentTopChannels = [],
      now = Date.now(),
    } = context;

    // 1. Rejeitar se não houver evidências rastreáveis
    if (!evidence || evidence.length === 0) {
      return null;
    }

    // 2. Compor Score Final e Nível de Confiança
    const compositeScore = Math.round((leadScore * 0.4 + intentScore * 0.6) * 100) / 100;
    const avgConfidence =
      evidence.reduce((acc, e) => acc + e.confidence, 0) / evidence.length;
    const confidence = Math.round(avgConfidence * 100) / 100;

    // 3. Classificar Prioridade e Urgência
    const { priority, urgency, slaHours } = this.classifyPriorityAndUrgency(
      compositeScore,
      confidence,
      conversionVelocityHours,
    );

    // 4. Recomendar Canal
    const recommendation = this.channelEngine.recommendChannel({
      leadId,
      priority,
      evidence,
      intentProfileChannels: intentTopChannels,
    });

    // 5. Determinar Modo de Execução (Human Handoff)
    const executionMode: ExecutionMode = this.determineExecutionMode(priority, recommendation);

    // 6. Construir Justificativa Rastreável (Reasons)
    const reasons = this.buildReasons(compositeScore, priority, evidence, recommendation);

    // 7. Ação Recomendada
    const recommendedAction = this.formulateAction(priority, recommendation.channel);

    // 8. Expiração e Cooldown
    // Expiração é vinculada à validade dos sinais mais recentes (default: 3 dias)
    const minDecay = Math.min(...evidence.map(e => e.decay));
    const validityHours = Math.max(24, Math.round(minDecay * 72));
    const expiresAt = now + validityHours * 3600 * 1000;

    // Cooldown proporcional à prioridade para evitar duplicidade
    const cooldownHours = priority === 'P0_CRITICAL' ? 12 : 48;
    const cooldownUntil = now + cooldownHours * 3600 * 1000;

    // Chave de idempotência (lead + ação + dia)
    const dayTag = new Date(now).toISOString().split('T')[0];
    const deduplicationKey = `${leadId}:${recommendedAction}:${dayTag}`;

    return {
      decisionId: `dec_${now}_${Math.random().toString(36).slice(2, 8)}`,
      leadId,
      subjectId,
      deduplicationKey,
      priority,
      urgency,
      slaHours,
      recommendedAction,
      recommendedChannel: recommendation.channel,
      executionMode,
      score: compositeScore,
      intentStrength: intentScore,
      confidence,
      conversionVelocityHours,
      evidence: [...evidence],
      reasons,
      generatedAt: now,
      expiresAt,
      cooldownUntil,
      provenance: {
        engineVersion: this.ENGINE_VERSION,
        ruleSetVersion: 'canonical_rules_v0',
      },
    };
  }

  private classifyPriorityAndUrgency(
    score: number,
    confidence: number,
    velocityHours?: number,
  ): { priority: ActionPriority; urgency: ActionUrgency; slaHours: number } {
    const adjustedScore = score * (0.7 + 0.3 * confidence);

    if (adjustedScore >= 80 || (velocityHours !== undefined && velocityHours <= 24 && adjustedScore >= 60)) {
      return { priority: 'P0_CRITICAL', urgency: 'IMMEDIATE', slaHours: 1 };
    }
    if (adjustedScore >= 65) {
      return { priority: 'P1_HIGH', urgency: 'SAME_DAY', slaHours: 4 };
    }
    if (adjustedScore >= 45) {
      return { priority: 'P2_MEDIUM', urgency: 'NEXT_DAY', slaHours: 24 };
    }
    if (adjustedScore >= 25) {
      return { priority: 'P3_LOW', urgency: 'SCHEDULED', slaHours: 72 };
    }
    return { priority: 'P4_COLD', urgency: 'PASSIVE', slaHours: 168 };
  }

  private determineExecutionMode(
    priority: ActionPriority,
    recommendation: { constraints: { requiresHumanReview: boolean } },
  ): ExecutionMode {
    if (priority === 'P0_CRITICAL') {
      return 'HUMAN_APPROVAL'; // Governança rigorosa: P0 exige crivo humano nesta fase V0
    }
    if (recommendation.constraints.requiresHumanReview) {
      return 'HUMAN_APPROVAL';
    }
    return 'AUTONOMOUS';
  }

  private formulateAction(priority: ActionPriority, channel: string): string {
    switch (priority) {
      case 'P0_CRITICAL':
        return `Abordagem prioritária consultiva imediata via ${channel}`;
      case 'P1_HIGH':
        return `Agendamento de discovery call via ${channel}`;
      case 'P2_MEDIUM':
        return `Cadência de nutrição multicanal personalizada via ${channel}`;
      case 'P3_LOW':
        return `Inclusão em campanha de conteúdo educativo via ${channel}`;
      default:
        return `Manutenção passiva em base de monitoramento`;
    }
  }

  private buildReasons(
    score: number,
    priority: ActionPriority,
    evidence: ActionEvidence[],
    rec: { reason: string },
  ): string[] {
    const reasons: string[] = [];
    reasons.push(`Score consolidado: ${score} (Classificação: ${priority})`);
    reasons.push(rec.reason);

    const physicalEv = evidence.filter(e => e.source === 'physical');
    if (physicalEv.length > 0) {
      reasons.push(`${physicalEv.length} evidência(s) de presença física qualificada confirmada(s)`);
    }

    const digitalEv = evidence.filter(e => e.source === 'digital');
    if (digitalEv.length > 0) {
      reasons.push(`${digitalEv.length} sinal(is) de intenção digital capturados`);
    }

    return reasons;
  }
}
