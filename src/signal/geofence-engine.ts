/**
 * Engine Determinística de Geofence e Transições de Estado
 * Módulo: Signal / Capture Intelligence V0
 *
 * Determina com precisão matemática as transições:
 * - ENTER
 * - INSIDE
 * - DWELL_THRESHOLD
 * - EXIT
 */

import {
  Coordinates,
  GeofenceEvent,
  GeoSignal,
  PhysicalZone,
} from './geo-signal.types';
import { isPointInZoneGeometry, isValidCoordinates } from './geo-math';

export interface SubjectZoneState {
  subjectId: string;
  zoneId: string;
  isInside: boolean;
  enteredAt?: number;
  lastSeenAt?: number;
  dwellThresholdEmitted: boolean;
  lastCoordinates?: Coordinates;
}

export interface GeofenceEngineOptions {
  maxAllowedAccuracyMeters?: number; // Descarta sinais com imprecisão excessiva (default: 150m)
  minConfidenceThreshold?: number;   // Descarta sinais com confiança abaixo (default: 0.2)
}

export class GeofenceEngine {
  private readonly states = new Map<string, SubjectZoneState>(); // Chave: `${subjectId}:${zoneId}`
  private readonly maxAllowedAccuracyMeters: number;
  private readonly minConfidenceThreshold: number;

  constructor(options: GeofenceEngineOptions = {}) {
    this.maxAllowedAccuracyMeters = options.maxAllowedAccuracyMeters ?? 150;
    this.minConfidenceThreshold = options.minConfidenceThreshold ?? 0.2;
  }

  /**
   * Avalia um sinal contra uma zona física específica e retorna qualquer evento de transição disparado.
   */
  processSignal(signal: GeoSignal, zone: PhysicalZone): GeofenceEvent | null {
    // 1. Validação de sanidade do sinal
    if (!signal || !isValidCoordinates(signal.coordinates)) {
      return null;
    }

    // 2. Filtro de qualidade de sinal (acurácia e confiança)
    if (
      signal.accuracyMeters > this.maxAllowedAccuracyMeters ||
      signal.confidence < this.minConfidenceThreshold
    ) {
      return null;
    }

    // 3. Zona ativa?
    if (!zone || !zone.active) {
      return null;
    }

    const stateKey = `${signal.pseudonymousSubjectId}:${zone.zoneId}`;
    const state = this.states.get(stateKey) ?? {
      subjectId: signal.pseudonymousSubjectId,
      zoneId: zone.zoneId,
      isInside: false,
      dwellThresholdEmitted: false,
    };

    const isInsideGeometry = isPointInZoneGeometry(signal.coordinates, zone.geometry);
    const now = signal.timestamp;

    let event: GeofenceEvent | null = null;

    if (isInsideGeometry) {
      if (!state.isInside) {
        // Transição: Fora -> Dentro = ENTER
        state.isInside = true;
        state.enteredAt = now;
        state.lastSeenAt = now;
        state.dwellThresholdEmitted = false;
        state.lastCoordinates = signal.coordinates;

        event = {
          eventId: `evt_${now}_${Math.random().toString(36).substring(2, 9)}`,
          zoneId: zone.zoneId,
          pseudonymousSubjectId: signal.pseudonymousSubjectId,
          type: 'ENTER',
          timestamp: now,
          dwellDurationSeconds: 0,
          accuracyMeters: signal.accuracyMeters,
          signalConfidence: signal.confidence,
          coordinates: signal.coordinates,
        };
      } else {
        // Continua dentro
        state.lastSeenAt = now;
        state.lastCoordinates = signal.coordinates;
        const dwellSeconds = Math.max(0, Math.floor((now - (state.enteredAt ?? now)) / 1000));

        // Checar se atingiu o limiar de permanência (DWELL_THRESHOLD)
        if (!state.dwellThresholdEmitted && dwellSeconds >= zone.dwellThresholdSeconds) {
          state.dwellThresholdEmitted = true;
          event = {
            eventId: `evt_${now}_${Math.random().toString(36).substring(2, 9)}`,
            zoneId: zone.zoneId,
            pseudonymousSubjectId: signal.pseudonymousSubjectId,
            type: 'DWELL_THRESHOLD',
            timestamp: now,
            dwellDurationSeconds: dwellSeconds,
            accuracyMeters: signal.accuracyMeters,
            signalConfidence: signal.confidence,
            coordinates: signal.coordinates,
          };
        } else {
          // Evento periódico regular de INSIDE
          event = {
            eventId: `evt_${now}_${Math.random().toString(36).substring(2, 9)}`,
            zoneId: zone.zoneId,
            pseudonymousSubjectId: signal.pseudonymousSubjectId,
            type: 'INSIDE',
            timestamp: now,
            dwellDurationSeconds: dwellSeconds,
            accuracyMeters: signal.accuracyMeters,
            signalConfidence: signal.confidence,
            coordinates: signal.coordinates,
          };
        }
      }
    } else {
      // Ponto fora da geometria
      if (state.isInside) {
        // Transição: Dentro -> Fora = EXIT
        const dwellSeconds = Math.max(0, Math.floor((now - (state.enteredAt ?? now)) / 1000));
        state.isInside = false;
        state.lastSeenAt = now;
        state.dwellThresholdEmitted = false;

        event = {
          eventId: `evt_${now}_${Math.random().toString(36).substring(2, 9)}`,
          zoneId: zone.zoneId,
          pseudonymousSubjectId: signal.pseudonymousSubjectId,
          type: 'EXIT',
          timestamp: now,
          dwellDurationSeconds: dwellSeconds,
          accuracyMeters: signal.accuracyMeters,
          signalConfidence: signal.confidence,
          coordinates: signal.coordinates,
        };
      }
    }

    this.states.set(stateKey, state);
    return event;
  }

  /**
   * Força uma saída (útil em timeout de sessão quando o subject não reporta sinais há horas).
   */
  forceExit(subjectId: string, zoneId: string, timestamp: number): GeofenceEvent | null {
    const stateKey = `${subjectId}:${zoneId}`;
    const state = this.states.get(stateKey);
    if (!state || !state.isInside) {
      return null;
    }

    const dwellSeconds = Math.max(0, Math.floor((timestamp - (state.enteredAt ?? timestamp)) / 1000));
    state.isInside = false;
    state.dwellThresholdEmitted = false;
    this.states.set(stateKey, state);

    return {
      eventId: `evt_${timestamp}_timeout`,
      zoneId,
      pseudonymousSubjectId: subjectId,
      type: 'EXIT',
      timestamp,
      dwellDurationSeconds: dwellSeconds,
      accuracyMeters: 0,
      signalConfidence: 1.0,
      coordinates: state.lastCoordinates ?? { latitude: 0, longitude: 0 },
    };
  }

  /**
   * Obtém o estado atual mantido em memória.
   */
  getState(subjectId: string, zoneId: string): SubjectZoneState | null {
    const state = this.states.get(`${subjectId}:${zoneId}`);
    return state ? { ...state } : null;
  }

  /**
   * Limpa estados de um subject específico (LGPD).
   */
  purgeSubject(subjectId: string): void {
    const prefix = `${subjectId}:`;
    for (const key of Array.from(this.states.keys())) {
      if (key.startsWith(prefix)) {
        this.states.delete(key);
      }
    }
  }
}
