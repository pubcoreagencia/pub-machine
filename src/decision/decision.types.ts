/**
 * Contratos Canônicos para Decisão Operacional e Despacho
 * Módulo: Decision & Dispatch V0
 * Produto: PUB Machine (pubcoreagencia/pub-machine)
 *
 * REGRA VINCULANTE:
 * O PUB Machine não é um disparador de mensagens.
 * Ele é primeiro um MOTOR DE INTELIGÊNCIA E DECISÃO.
 * INTELLIGENCE → DECISION → DISPATCH CONTRACT → EXECUTION ADAPTER.
 */

export type ActionPriority =
  | 'P0_CRITICAL'
  | 'P1_HIGH'
  | 'P2_MEDIUM'
  | 'P3_LOW'
  | 'P4_COLD';

export type ActionUrgency =
  | 'IMMEDIATE'  // Agir em minutos (< 1h)
  | 'SAME_DAY'   // Agir no mesmo dia (< 4h)
  | 'NEXT_DAY'   // Agir nas próximas 24h
  | 'SCHEDULED'  // Cadência programada (3-7 dias)
  | 'PASSIVE';   // Monitoramento passivo

export type RecommendedChannel =
  | 'whatsapp'
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'sdr_queue'
  | 'human';

export type ExecutionMode =
  | 'AUTONOMOUS'     // Automação direta pelo sistema
  | 'HUMAN_APPROVAL' // Requer validação humana explícita antes do envio
  | 'HUMAN_ONLY';    // Tarefa 100% manual (ex: ligação consultiva)

export interface ActionEvidence {
  source: 'physical' | 'digital' | 'crm' | 'enrichment' | 'model';
  signalType: string;
  strength: number;      // 0.0 .. 1.0
  confidence: number;    // 0.0 .. 1.0
  decay: number;         // Fator de recência (0.0 .. 1.0)
  timestamp: number;
  provenance: {
    zoneId?: string;
    evidenceRule?: string;
    url?: string;
    details?: Record<string, unknown>;
  };
}

export interface LeadActionDecision {
  decisionId: string;
  leadId: string;
  subjectId: string;               // Identificador pseudonimizado de audiência
  deduplicationKey: string;        // Chave idempotente (ex: `${leadId}:${recommendedAction}:${day}`)
  priority: ActionPriority;
  urgency: ActionUrgency;
  slaHours: number;
  recommendedAction: string;
  recommendedChannel: RecommendedChannel;
  executionMode: ExecutionMode;
  score: number;                   // 0..100
  intentStrength: number;          // 0..100
  confidence: number;              // 0.0 .. 1.0
  conversionVelocityHours?: number;
  evidence: ActionEvidence[];
  reasons: string[];
  generatedAt: number;             // Timestamp ms
  expiresAt: number;               // Expiração com base no decay do sinal
  cooldownUntil: number;           // Cooldown para evitar re-despacho indevido
  provenance: {
    engineVersion: string;
    ruleSetVersion: string;
  };
}

export interface ChannelRecommendation {
  channel: RecommendedChannel;
  reason: string;
  confidence: number;
  constraints: {
    businessHoursOnly: boolean;
    requiresHumanReview: boolean;
    optInVerified: boolean;
  };
}

export interface IChannelRecommendationEngine {
  recommendChannel(context: {
    leadId: string;
    priority: ActionPriority;
    evidence: ActionEvidence[];
    intentProfileChannels?: string[];
  }): ChannelRecommendation;
}

export interface DispatchResult {
  dispatched: boolean;
  decisionId: string;
  deduplicationKey: string;
  timestamp: number;
  handler: string;
  status: 'QUEUED' | 'PENDING_APPROVAL' | 'IGNORED_DUPLICATE' | 'EXPIRED' | 'REJECTED_CONSENT';
  details?: Record<string, unknown>;
}

export interface IActionDispatcher {
  dispatch(decision: LeadActionDecision): Promise<DispatchResult>;
}
