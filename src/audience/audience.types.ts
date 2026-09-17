/**
 * Contratos Canônicos para Audience Intelligence V0
 * Módulo: Audience Intelligence V0
 * Produto: PUB Machine (pubcoreagencia/pub-machine)
 *
 * REGRA VINCULANTE:
 * RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD.
 * Não coletar nem inferir PII ou dados sensíveis a partir de geolocalização.
 */

import { Coordinates, PresenceMetrics } from '../signal/geo-signal.types';

export type InferenceConfidence = 'LOW' | 'MEDIUM' | 'HIGH' | 'CERTAIN';

export interface InferenceMetadata {
  source: string;              // Ex: 'geofence_engine' | 'audience_aggregator'
  confidence: number;          // 0.0 .. 1.0
  confidenceBand: InferenceConfidence;
  timestamp: number;           // Unix timestamp ms
  provenance: string;          // Ex: 'pub-machine:audience:v0.1.0'
  methodologyVersion: string;  // Ex: 'rules_engine_v1'
}

export interface ZoneAffinityMetric {
  zoneId: string;
  category?: string;
  visitCount: number;
  totalDwellSeconds: number;
  affinityScore: number;       // 0.0 .. 1.0 (ponderado por frequência e permanência)
  firstObservedAt: number;
  lastObservedAt: number;
  recencyHours: number;
}

export interface BehavioralFeatures {
  totalObservations: number;
  distinctZonesCount: number;
  totalDwellSeconds: number;
  averageDwellSecondsPerSession: number;
  maxDwellSecondsSingleSession: number;
  visitFrequencyPerDay: number;
  recencyHours: number;
  recurringPresence: boolean;     // Ex: mais de 1 visita em dias distintos
  zoneAffinities: ZoneAffinityMetric[];
  temporalPatterns: {
    peakHours?: number[];         // Horários do dia com maior observação (0-23)
    weekdayRatio?: number;        // Proporção dias de semana vs final de semana
  };
  inferences: Record<string, InferenceMetadata>;
}

export interface AudienceSegmentAssignment {
  segmentId: string;
  segmentName: string;
  assignedAt: number;
  expiresAt?: number;
  ruleId: string;
  confidence: number;
  reasoning: string[];
}

export interface AudienceProfile {
  subjectId: string;             // Identificador pseudonimizado (Zero PII)
  firstObservedAt: number;
  lastObservedAt: number;
  features: BehavioralFeatures;
  segments: AudienceSegmentAssignment[];
  provenance: {
    createdAt: number;
    updatedAt: number;
    version: string;
  };
  consentMetadata: {
    status: 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED';
    purpose: string;
    verifiedAt: number;
  };
}

export interface SegmentationRule {
  ruleId: string;
  targetSegmentId: string;
  targetSegmentName: string;
  description: string;
  active: boolean;
  priority: number;
  conditions: {
    minVisits?: number;
    minTotalDwellSeconds?: number;
    maxRecencyHours?: number;
    requiredZones?: string[];
    requiredCategories?: string[];
    minDistinctZones?: number;
    requiresRecurringPresence?: boolean;
    minAffinityScore?: { zoneId: string; minScore: number };
  };
}

export interface BridgeIntentSignal {
  intentId: string;
  subjectId: string;             // Identificador pseudonimizado
  leadCorrelationKey?: string;   // Chave opcional caso haja vínculo autorizado com lead
  signalType: string;            // Ex: 'commercial_high_intent_visit', 'brand_hub_affinity'
  strength: number;              // 0.0 .. 1.0
  confidence: number;            // 0.0 .. 1.0
  source: string;                // 'audience_intelligence_bridge'
  timestamp: number;
  decayHalfLifeHours: number;    // Half-life para decaimento temporal
  provenance: {
    segmentId?: string;
    evidenceRule: string;
    evidenceDetails: Record<string, unknown>;
  };
}
