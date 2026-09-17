/**
 * Physical Intent Adapter
 * Módulo: Physical → Lead Intent Integration V0
 *
 * Converte deterministicamente BridgeIntentSignal em AdaptedLeadIntentSignal
 * compatível com o LeadIntentSignalsService.
 *
 * REGRAS CANÔNICAS:
 * 1. Não duplicar scoring nem decay.
 * 2. Preservar estritamente subjectId, confiança, proveniência e trilha de auditoria.
 * 3. Normalizar peso (weight) como produto calibrado de força x confiança.
 */

import { BridgeIntentSignal } from './audience.types';
import {
  AdaptedLeadIntentSignal,
  PhysicalIntentAuditDetails,
  PHYSICAL_INTENT_TAXONOMY,
} from './physical-intent.types';

export class PhysicalIntentAdapter {
  private readonly ADAPTER_VERSION = 'physical_adapter_v0.1.0';

  /**
   * Adapta um BridgeIntentSignal em um sinal compatível com a camada de Lead Intent.
   * Exige que haja leadCorrelationKey ou que o subjectId seja utilizado como identificador do lead.
   */
  adapt(bridgeSignal: BridgeIntentSignal, fallbackLeadId?: string): AdaptedLeadIntentSignal | null {
    if (!bridgeSignal) {
      return null;
    }

    const leadId = bridgeSignal.leadCorrelationKey || fallbackLeadId || bridgeSignal.subjectId;
    if (!leadId) {
      return null;
    }

    // Normalização taxonômica do signalType
    const normalizedType = this.normalizeTaxonomy(bridgeSignal.signalType);

    // Ponderação calibrada: peso efetivo do sinal no pipeline = strength * confidence
    const effectiveWeight = Math.min(
      1.0,
      Math.max(0.0, Math.round(bridgeSignal.strength * bridgeSignal.confidence * 100) / 100),
    );

    const audit: PhysicalIntentAuditDetails = {
      evidenceRule: bridgeSignal.provenance.evidenceRule,
      detectedDwellSeconds: Number(bridgeSignal.provenance.evidenceDetails?.totalDwellSeconds) || undefined,
      detectedVisits: Number(bridgeSignal.provenance.evidenceDetails?.totalVisits) || undefined,
      confidence: bridgeSignal.confidence,
      provenanceSource: bridgeSignal.source,
      decayHalfLifeHours: bridgeSignal.decayHalfLifeHours,
      transformationApplied: `BridgeIntentSignal -> AdaptedLeadIntentSignal via ${this.ADAPTER_VERSION}`,
    };

    return {
      leadId,
      channel: 'physical',
      signalType: normalizedType,
      weight: effectiveWeight,
      occurredAt: new Date(bridgeSignal.timestamp),
      decayHalfLifeHours: bridgeSignal.decayHalfLifeHours || 72,
      metadata: {
        source: bridgeSignal.source,
        subjectId: bridgeSignal.subjectId,
        rawStrength: bridgeSignal.strength,
        rawConfidence: bridgeSignal.confidence,
        decayHalfLifeHours: bridgeSignal.decayHalfLifeHours,
        audit,
      },
    };
  }

  /**
   * Adapta múltiplos sinais em lote.
   */
  adaptBatch(signals: BridgeIntentSignal[], fallbackLeadId?: string): AdaptedLeadIntentSignal[] {
    const results: AdaptedLeadIntentSignal[] = [];
    for (const s of signals) {
      const adapted = this.adapt(s, fallbackLeadId);
      if (adapted) {
        results.push(adapted);
      }
    }
    return results;
  }

  private normalizeTaxonomy(rawType: string): string {
    if (rawType.startsWith('physical.')) {
      return rawType;
    }
    // Mapeamentos comuns vindos da IntentBridge
    switch (rawType) {
      case 'physical_commercial_hub_high_dwell':
        return PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL;
      case 'high_frequency_physical_engagement':
        return PHYSICAL_INTENT_TAXONOMY.FREQUENT_ENGAGEMENT;
      case 'zone_presence':
        return PHYSICAL_INTENT_TAXONOMY.ZONE_PRESENCE;
      case 'high_dwell':
        return PHYSICAL_INTENT_TAXONOMY.HIGH_DWELL;
      default:
        return `physical.${rawType}`;
    }
  }
}
