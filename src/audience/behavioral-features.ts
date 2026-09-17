/**
 * Extrator e Agregador Determinístico de Features Comportamentais
 * Módulo: Audience Intelligence V0
 *
 * Transforma métricas brutas de presença em atributos comportamentais de audiência.
 */

import { PresenceMetrics } from '../signal/geo-signal.types';
import {
  BehavioralFeatures,
  InferenceConfidence,
  InferenceMetadata,
  ZoneAffinityMetric,
} from './audience.types';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export class BehavioralFeatureExtractor {
  private readonly VERSION = 'features_v0.1.0';

  /**
   * Constrói BehavioralFeatures puras a partir de uma coleção de PresenceMetrics por zona.
   */
  extract(
    subjectId: string,
    metricsList: PresenceMetrics[],
    now: number = Date.now(),
  ): BehavioralFeatures {
    if (!metricsList || metricsList.length === 0) {
      return this.emptyFeatures(now);
    }

    let totalVisits = 0;
    let totalDwell = 0;
    let maxSingleDwell = 0;
    let minFirstSeen = Infinity;
    let maxLastSeen = -Infinity;

    const zoneAffinities: ZoneAffinityMetric[] = [];

    for (const m of metricsList) {
      totalVisits += m.totalVisits;
      totalDwell += m.totalDwellSeconds;
      maxSingleDwell = Math.max(maxSingleDwell, m.maxDwellSeconds);
      minFirstSeen = Math.min(minFirstSeen, m.firstSeenAt);
      maxLastSeen = Math.max(maxLastSeen, m.lastSeenAt);

      const zoneRecency = Math.max(0, Math.round(((now - m.lastSeenAt) / ONE_HOUR_MS) * 10) / 10);

      // Afinidade de zona ponderada: frequência (0.5) + dwell relativo (0.5)
      // Normalização local com saturação linear
      const visitFactor = Math.min(1.0, m.totalVisits / 5);
      const dwellFactor = Math.min(1.0, m.totalDwellSeconds / 3600); // 1 hora de dwell = 1.0
      const affinityScore = Math.round((visitFactor * 0.5 + dwellFactor * 0.5) * 100) / 100;

      zoneAffinities.push({
        zoneId: m.zoneId,
        visitCount: m.totalVisits,
        totalDwellSeconds: m.totalDwellSeconds,
        affinityScore,
        firstObservedAt: m.firstSeenAt,
        lastObservedAt: m.lastSeenAt,
        recencyHours: zoneRecency,
      });
    }

    // Ordenar afinidades pela pontuação decrescente
    zoneAffinities.sort((a, b) => b.affinityScore - a.affinityScore);

    const distinctZonesCount = metricsList.length;
    const avgDwell = totalVisits > 0 ? Math.round(totalDwell / totalVisits) : 0;
    const recencyHours = maxLastSeen > 0 ? Math.max(0, Math.round(((now - maxLastSeen) / ONE_HOUR_MS) * 10) / 10) : 0;

    const observedSpanDays = Math.max(1, Math.ceil((maxLastSeen - minFirstSeen) / ONE_DAY_MS));
    const visitFrequency = Math.round((totalVisits / observedSpanDays) * 100) / 100;

    // Recorrência: se observou mais de 1 visita e o intervalo abrange dias ou visitas repetidas
    const recurringPresence = totalVisits >= 2 && observedSpanDays >= 1;

    const inferences: Record<string, InferenceMetadata> = {
      recurrent_visitor: {
        source: 'behavioral_feature_extractor',
        confidence: recurringPresence ? 0.9 : 0.2,
        confidenceBand: recurringPresence ? 'HIGH' : 'LOW',
        timestamp: now,
        provenance: 'pub-machine:audience:behavior',
        methodologyVersion: this.VERSION,
      },
      high_dwell_intensity: {
        source: 'behavioral_feature_extractor',
        confidence: totalDwell >= 1800 ? 0.85 : 0.3, // 30min+ = alta intensidade
        confidenceBand: totalDwell >= 1800 ? 'HIGH' : 'LOW',
        timestamp: now,
        provenance: 'pub-machine:audience:behavior',
        methodologyVersion: this.VERSION,
      },
    };

    return {
      totalObservations: totalVisits,
      distinctZonesCount,
      totalDwellSeconds: totalDwell,
      averageDwellSecondsPerSession: avgDwell,
      maxDwellSecondsSingleSession: maxSingleDwell,
      visitFrequencyPerDay: visitFrequency,
      recencyHours,
      recurringPresence,
      zoneAffinities,
      temporalPatterns: {},
      inferences,
    };
  }

  private emptyFeatures(now: number): BehavioralFeatures {
    return {
      totalObservations: 0,
      distinctZonesCount: 0,
      totalDwellSeconds: 0,
      averageDwellSecondsPerSession: 0,
      maxDwellSecondsSingleSession: 0,
      visitFrequencyPerDay: 0,
      recencyHours: 999999,
      recurringPresence: false,
      zoneAffinities: [],
      temporalPatterns: {},
      inferences: {},
    };
  }
}
