/**
 * Intent Bridge
 * Módulo: Audience Intelligence V0
 *
 * Ponte explícita entre Audience Intelligence e Lead Intent:
 * Recebe o AudienceProfile e gera BridgeIntentSignals SOMENTE quando houver
 * evidência empírica suficiente (ex: limiar de dwell, alta afinidade ou segmento qualificado).
 *
 * REGRA CANÔNICA:
 * Nem toda presença vira lead. Sinais de intenção só emergem com evidência consistente.
 */

import {
  AudienceProfile,
  BridgeIntentSignal,
} from './audience.types';
import { IIntentSignalStore } from './intent-signal.store';

export interface IntentBridgeRule {
  ruleId: string;
  signalType: string;
  triggerSegmentIds?: string[];
  minTotalDwellSeconds?: number;
  minVisits?: number;
  minAffinityScore?: { zoneId: string; minScore: number };
  baseStrength: number;       // 0.0 .. 1.0
  baseConfidence: number;     // 0.0 .. 1.0
  decayHalfLifeHours: number; // Half-life específico da intenção física/comportamental
}

export class IntentBridge {
  private readonly rules: Map<string, IntentBridgeRule> = new Map();

  constructor(
    private readonly intentStore: IIntentSignalStore,
    initialRules: IntentBridgeRule[] = [],
  ) {
    for (const r of initialRules) {
      this.registerRule(r);
    }
  }

  registerRule(rule: IntentBridgeRule): void {
    this.rules.set(rule.ruleId, { ...rule });
  }

  /**
   * Avalia um AudienceProfile contra as regras de ponte de intenção.
   * Emite e persiste BridgeIntentSignal apenas se as evidências forem satisfeitas.
   */
  async evaluateAndBridge(
    profile: AudienceProfile,
    leadCorrelationKey?: string,
    now: number = Date.now(),
  ): Promise<BridgeIntentSignal[]> {
    const generatedSignals: BridgeIntentSignal[] = [];
    const activeSegments = new Set(profile.segments.map(s => s.segmentId));

    for (const rule of this.rules.values()) {
      let triggered = false;
      const evidenceDetails: Record<string, unknown> = {};

      // 1. Checar por Segmento Gatilho
      if (rule.triggerSegmentIds && rule.triggerSegmentIds.length > 0) {
        const matching = rule.triggerSegmentIds.filter(id => activeSegments.has(id));
        if (matching.length > 0) {
          triggered = true;
          evidenceDetails.matchedSegments = matching;
        }
      }

      // 2. Checar por Limiar de Permanência (Dwell)
      if (
        rule.minTotalDwellSeconds !== undefined &&
        profile.features.totalDwellSeconds >= rule.minTotalDwellSeconds
      ) {
        triggered = true;
        evidenceDetails.totalDwellSeconds = profile.features.totalDwellSeconds;
      }

      // 3. Checar por Mínimo de Visitas
      if (
        rule.minVisits !== undefined &&
        profile.features.totalObservations >= rule.minVisits
      ) {
        triggered = true;
        evidenceDetails.totalVisits = profile.features.totalObservations;
      }

      // 4. Checar por Afinidade Específica
      if (rule.minAffinityScore) {
        const aff = profile.features.zoneAffinities.find(
          z => z.zoneId === rule.minAffinityScore!.zoneId,
        );
        if (aff && aff.affinityScore >= rule.minAffinityScore.minScore) {
          triggered = true;
          evidenceDetails.matchedAffinity = aff;
        }
      }

      if (triggered) {
        const signal: BridgeIntentSignal = {
          intentId: `int_${now}_${Math.random().toString(36).substring(2, 9)}`,
          subjectId: profile.subjectId,
          leadCorrelationKey,
          signalType: rule.signalType,
          strength: rule.baseStrength,
          confidence: rule.baseConfidence,
          source: 'audience_intelligence_bridge',
          timestamp: now,
          decayHalfLifeHours: rule.decayHalfLifeHours,
          provenance: {
            evidenceRule: rule.ruleId,
            evidenceDetails,
          },
        };

        await this.intentStore.saveIntentSignal(signal);
        generatedSignals.push(signal);
      }
    }

    return generatedSignals;
  }
}
