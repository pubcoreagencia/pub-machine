/**
 * Presence Intelligence Calculator
 * Módulo: Signal / Capture Intelligence V0
 *
 * Transforma eventos brutos de geofence em inteligência comportamental agregada:
 * - Primeira e última entrada
 * - Frequência e recorrência
 * - Dwell time total, médio e máximo
 * - Recência em horas
 * - Número total de visitas
 */

import { GeofenceEvent, PresenceMetrics } from './geo-signal.types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export class PresenceIntelligenceService {
  /**
   * Atualiza as métricas de presença consolidadas de um subject em uma zona
   * com base em um novo GeofenceEvent.
   */
  updateMetrics(
    currentMetrics: PresenceMetrics | null,
    event: GeofenceEvent,
    now: number = event.timestamp,
  ): PresenceMetrics {
    const isNew = !currentMetrics;

    const base: PresenceMetrics = isNew
      ? {
          pseudonymousSubjectId: event.pseudonymousSubjectId,
          zoneId: event.zoneId,
          firstSeenAt: event.timestamp,
          lastSeenAt: event.timestamp,
          totalVisits: 0,
          frequencyDays: 1,
          totalDwellSeconds: 0,
          averageDwellSeconds: 0,
          maxDwellSeconds: 0,
          recencyHours: 0,
          isCurrentlyInside: false,
        }
      : { ...currentMetrics };

    base.lastSeenAt = Math.max(base.lastSeenAt, event.timestamp);
    base.recencyHours = Math.max(0, Math.round(((now - base.lastSeenAt) / ONE_HOUR_MS) * 10) / 10);

    if (event.type === 'ENTER') {
      base.totalVisits += 1;
      base.isCurrentlyInside = true;
      base.currentSessionStartedAt = event.timestamp;
      if (isNew) {
        base.firstSeenAt = event.timestamp;
      }
      base.frequencyDays = this.calculateFrequencyDays(base.firstSeenAt, base.lastSeenAt, base.totalVisits);
    } else if (event.type === 'INSIDE' || event.type === 'DWELL_THRESHOLD') {
      base.isCurrentlyInside = true;
      if (!base.currentSessionStartedAt) {
        base.currentSessionStartedAt = event.timestamp;
      }
    } else if (event.type === 'EXIT') {
      base.isCurrentlyInside = false;
      base.currentSessionStartedAt = undefined;

      const sessionDwell = event.dwellDurationSeconds;
      base.totalDwellSeconds += sessionDwell;
      base.maxDwellSeconds = Math.max(base.maxDwellSeconds, sessionDwell);
      base.averageDwellSeconds =
        base.totalVisits > 0
          ? Math.round(base.totalDwellSeconds / base.totalVisits)
          : sessionDwell;

      base.frequencyDays = this.calculateFrequencyDays(base.firstSeenAt, base.lastSeenAt, base.totalVisits);
    }

    return base;
  }

  /**
   * Estima a frequência em visitas por janela temporal observada (dias).
   */
  private calculateFrequencyDays(firstSeen: number, lastSeen: number, visits: number): number {
    const spanDays = Math.max(1, Math.ceil((lastSeen - firstSeen) / ONE_DAY_MS));
    // Frequência = visitas por dia observado
    return Math.round((visits / spanDays) * 100) / 100;
  }
}
