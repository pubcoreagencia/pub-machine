/**
 * Channel Recommendation Engine Determinístico
 * Módulo: Decision & Dispatch V0
 *
 * Separação conceitual estrita:
 * A Prioridade responde: "QUANDO devemos agir?"
 * O Canal responde: "COMO devemos agir?"
 */

import {
  ActionEvidence,
  ActionPriority,
  ChannelRecommendation,
  IChannelRecommendationEngine,
  RecommendedChannel,
} from './decision.types';

export class ChannelRecommendationEngine implements IChannelRecommendationEngine {
  recommendChannel(context: {
    leadId: string;
    priority: ActionPriority;
    evidence: ActionEvidence[];
    intentProfileChannels?: string[];
  }): ChannelRecommendation {
    const { priority, evidence, intentProfileChannels = [] } = context;

    const hasPhysicalPresence = evidence.some(e => e.source === 'physical');
    const hasDemoRequest = evidence.some(e => e.signalType.includes('demo'));
    const hasPricingVisit = evidence.some(e => e.signalType.includes('pricing'));
    const hasLinkedin = intentProfileChannels.includes('linkedin');

    // Regra P0 (Crítica): Atendimento consultivo de alta urgência
    if (priority === 'P0_CRITICAL') {
      if (hasDemoRequest || hasPhysicalPresence) {
        return {
          channel: 'whatsapp',
          reason: 'Lead P0 com sinal direto de alta intensidade; contato imediato via WhatsApp recomendado',
          confidence: 0.95,
          constraints: {
            businessHoursOnly: true,
            requiresHumanReview: true, // Governança V0: validação humana recomendada
            optInVerified: true,
          },
        };
      }
      return {
        channel: 'phone',
        reason: 'Oportunidade P0 corporativa exigindo alinhamento consultivo por telefone',
        confidence: 0.90,
        constraints: {
          businessHoursOnly: true,
          requiresHumanReview: true,
          optInVerified: true,
        },
      };
    }

    // Regra P1 (Alta):
    if (priority === 'P1_HIGH') {
      if (hasPhysicalPresence && hasPricingVisit) {
        return {
          channel: 'sdr_queue',
          reason: 'Convergência física + digital qualificada; rotear para fila prioritária do SDR',
          confidence: 0.88,
          constraints: {
            businessHoursOnly: true,
            requiresHumanReview: true,
            optInVerified: true,
          },
        };
      }
      if (hasLinkedin) {
        return {
          channel: 'linkedin',
          reason: 'Canal de engajamento B2B detectado no perfil',
          confidence: 0.82,
          constraints: {
            businessHoursOnly: false,
            requiresHumanReview: false,
            optInVerified: true,
          },
        };
      }
      return {
        channel: 'sdr_queue',
        reason: 'Oportunidade de alto valor alocada na esteira de qualificação ativa',
        confidence: 0.85,
        constraints: {
          businessHoursOnly: true,
          requiresHumanReview: true,
          optInVerified: true,
        },
      };
    }

    // Regra P2 / P3 (Média / Baixa):
    if (priority === 'P2_MEDIUM' || priority === 'P3_LOW') {
      return {
        channel: 'email',
        reason: 'Cadência educativa e nutrição automatizada recomendada',
        confidence: 0.80,
        constraints: {
          businessHoursOnly: false,
          requiresHumanReview: false,
          optInVerified: true,
        },
      };
    }

    // P4 (Fria):
    return {
      channel: 'email',
      reason: 'Base passiva; manter nutrição leve por e-mail com reavaliação periódica',
      confidence: 0.70,
      constraints: {
        businessHoursOnly: false,
        requiresHumanReview: false,
        optInVerified: true,
      },
    };
  }
}
