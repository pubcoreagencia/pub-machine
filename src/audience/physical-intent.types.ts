/**
 * Taxonomia e Contratos de Sinais de Intenção Físicos
 * Módulo: Physical → Lead Intent Integration V0
 * Produto: PUB Machine (pubcoreagencia/pub-machine)
 *
 * Taxonomia Hierárquica:
 * 1. EVENT: transições de telemetria bruta (ENTER, EXIT, INSIDE)
 * 2. FEATURE: características de audiência derivadas (high_dwell, recurring_visit, zone_affinity)
 * 3. INTENT: sinais qualificados de propensão comercial (physical.commercial_hub_high_dwell, etc.)
 */

export const PHYSICAL_INTENT_TAXONOMY = {
  ZONE_PRESENCE: 'physical.zone_presence',
  HIGH_DWELL: 'physical.high_dwell',
  RECURRING_VISIT: 'physical.recurring_visit',
  ZONE_AFFINITY: 'physical.zone_affinity',
  RECENT_VISIT: 'physical.recent_visit',
  COMMERCIAL_HUB_HIGH_DWELL: 'physical.commercial_hub_high_dwell',
  FREQUENT_ENGAGEMENT: 'physical.frequent_engagement',
} as const;

export type PhysicalIntentSignalType =
  | typeof PHYSICAL_INTENT_TAXONOMY[keyof typeof PHYSICAL_INTENT_TAXONOMY]
  | string;

export interface PhysicalIntentAuditDetails {
  originatingSignalId?: string;
  sourceZoneId?: string;
  evidenceRule: string;
  detectedDwellSeconds?: number;
  detectedVisits?: number;
  affinityScore?: number;
  confidence: number;
  provenanceSource: string;
  decayHalfLifeHours: number;
  transformationApplied: string;
}

export interface AdaptedLeadIntentSignal {
  leadId: string;
  channel: 'physical';
  signalType: PhysicalIntentSignalType;
  weight: number;                // 0..1 (calculado a partir de strength * confidence)
  occurredAt: Date;
  decayHalfLifeHours: number;    // Half-life compatível com o decay do LeadIntentSignalsService
  metadata: {
    source: string;
    subjectId: string;
    rawStrength: number;
    rawConfidence: number;
    audit: PhysicalIntentAuditDetails;
    [key: string]: unknown;
  };
}
