/**
 * Segmentation Engine Determinística & Configurável
 * Módulo: Audience Intelligence V0
 *
 * Avalia regras declarativas de segmentação sobre o AudienceProfile
 * sem hardcodar valores comerciais estáticos.
 */

import {
  AudienceProfile,
  AudienceSegmentAssignment,
  BehavioralFeatures,
  SegmentationRule,
} from './audience.types';

export class SegmentationEngine {
  private readonly rules: Map<string, SegmentationRule> = new Map();

  constructor(initialRules: SegmentationRule[] = []) {
    for (const r of initialRules) {
      this.registerRule(r);
    }
  }

  registerRule(rule: SegmentationRule): void {
    this.rules.set(rule.ruleId, { ...rule });
  }

  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getActiveRules(): SegmentationRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.active)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Avalia um conjunto de features comportamentais contra todas as regras ativas.
   * Retorna os segmentos qualificados ordenados por prioridade.
   */
  evaluate(
    features: BehavioralFeatures,
    now: number = Date.now(),
  ): AudienceSegmentAssignment[] {
    const activeRules = this.getActiveRules();
    const assignments: AudienceSegmentAssignment[] = [];

    for (const rule of activeRules) {
      const { matches, reasoning, confidence } = this.checkConditions(features, rule);
      if (matches) {
        assignments.push({
          segmentId: rule.targetSegmentId,
          segmentName: rule.targetSegmentName,
          assignedAt: now,
          ruleId: rule.ruleId,
          confidence,
          reasoning,
        });
      }
    }

    return assignments;
  }

  private checkConditions(
    features: BehavioralFeatures,
    rule: SegmentationRule,
  ): { matches: boolean; reasoning: string[]; confidence: number } {
    const c = rule.conditions;
    const reasoning: string[] = [];

    // 1. Min Visits
    if (c.minVisits !== undefined) {
      if (features.totalObservations < c.minVisits) {
        return { matches: false, reasoning: [], confidence: 0 };
      }
      reasoning.push(`Observadas ${features.totalObservations} visitas (mínimo exigido: ${c.minVisits})`);
    }

    // 2. Min Total Dwell Seconds
    if (c.minTotalDwellSeconds !== undefined) {
      if (features.totalDwellSeconds < c.minTotalDwellSeconds) {
        return { matches: false, reasoning: [], confidence: 0 };
      }
      reasoning.push(
        `Permanência acumulada de ${features.totalDwellSeconds}s (mínimo exigido: ${c.minTotalDwellSeconds}s)`,
      );
    }

    // 3. Max Recency Hours
    if (c.maxRecencyHours !== undefined) {
      if (features.recencyHours > c.maxRecencyHours) {
        return { matches: false, reasoning: [], confidence: 0 };
      }
      reasoning.push(`Recência de ${features.recencyHours}h (máximo tolerado: ${c.maxRecencyHours}h)`);
    }

    // 4. Requires Recurring Presence
    if (c.requiresRecurringPresence !== undefined) {
      if (features.recurringPresence !== c.requiresRecurringPresence) {
        return { matches: false, reasoning: [], confidence: 0 };
      }
      reasoning.push(`Presença recorrente confirmada: ${features.recurringPresence}`);
    }

    // 5. Min Distinct Zones
    if (c.minDistinctZones !== undefined) {
      if (features.distinctZonesCount < c.minDistinctZones) {
        return { matches: false, reasoning: [], confidence: 0 };
      }
      reasoning.push(`Presença em ${features.distinctZonesCount} zonas distintas (mínimo: ${c.minDistinctZones})`);
    }

    // 6. Required Zones
    if (c.requiredZones && c.requiredZones.length > 0) {
      const observedZoneIds = new Set(features.zoneAffinities.map(z => z.zoneId));
      for (const reqZone of c.requiredZones) {
        if (!observedZoneIds.has(reqZone)) {
          return { matches: false, reasoning: [], confidence: 0 };
        }
      }
      reasoning.push(`Zonas obrigatórias confirmadas: [${c.requiredZones.join(', ')}]`);
    }

    // 7. Min Affinity Score
    if (c.minAffinityScore) {
      const targetAffinity = features.zoneAffinities.find(
        z => z.zoneId === c.minAffinityScore!.zoneId,
      );
      if (!targetAffinity || targetAffinity.affinityScore < c.minAffinityScore.minScore) {
        return { matches: false, reasoning: [], confidence: 0 };
      }
      reasoning.push(
        `Afinidade com zona ${c.minAffinityScore.zoneId} atingiu ${targetAffinity.affinityScore} (mínimo: ${c.minAffinityScore.minScore})`,
      );
    }

    // Confiança é calculada com base na robustez das evidências
    const baseConfidence = 0.8;
    const confidenceBoost = Math.min(0.2, (features.totalObservations * 0.02));
    const finalConfidence = Math.min(1.0, Math.round((baseConfidence + confidenceBoost) * 100) / 100);

    return { matches: true, reasoning, confidence: finalConfidence };
  }
}
