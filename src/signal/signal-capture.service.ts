/**
 * Signal Capture Orchestrator
 * Módulo: Signal / Capture Intelligence V0
 *
 * Ponto de entrada unificado para recepção de sinais (físicos e digitais),
 * validação de consentimento e LGPD, roteamento para o GeofenceEngine
 * e atualização das métricas de PresenceIntelligence.
 */

import {
  GeoSignal,
  GeofenceEvent,
  PhysicalZone,
  PresenceMetrics,
  PrivacyConsentMetadata,
} from './geo-signal.types';
import { GeofenceEngine } from './geofence-engine';
import { PresenceIntelligenceService } from './presence-intelligence.service';
import { ISignalStore } from './signal-store';

export interface IngestResult {
  accepted: boolean;
  reason?: string;
  signalId?: string;
  triggeredEvents: GeofenceEvent[];
  updatedMetrics: PresenceMetrics[];
}

export class SignalCaptureService {
  private readonly geofenceEngine: GeofenceEngine;
  private readonly presenceService: PresenceIntelligenceService;

  constructor(
    private readonly store: ISignalStore,
    geofenceEngine?: GeofenceEngine,
    presenceService?: PresenceIntelligenceService,
  ) {
    this.geofenceEngine = geofenceEngine ?? new GeofenceEngine();
    this.presenceService = presenceService ?? new PresenceIntelligenceService();
  }

  /**
   * Ingestão de um sinal bruto de localização.
   * Valida consentimento LGPD, persiste no store e avalia zonas ativas.
   */
  async ingestGeoSignal(signal: GeoSignal): Promise<IngestResult> {
    const subjectId = signal.pseudonymousSubjectId;

    // 1. Verificação de Consentimento e Privacidade (LGPD)
    const consent = await this.store.getConsent(subjectId);
    if (!consent || consent.status !== 'GRANTED') {
      return {
        accepted: false,
        reason: 'CONSENT_REQUIRED_OR_NOT_GRANTED',
        triggeredEvents: [],
        updatedMetrics: [],
      };
    }

    // Verificar se o consentimento expirou
    if (consent.expiresAt && consent.expiresAt < signal.timestamp) {
      return {
        accepted: false,
        reason: 'CONSENT_EXPIRED',
        triggeredEvents: [],
        updatedMetrics: [],
      };
    }

    // 2. Persistir sinal bruto
    await this.store.saveSignal(signal);

    // 3. Avaliar zonas ativas
    const activeZones = await this.store.getActiveZones();
    const triggeredEvents: GeofenceEvent[] = [];
    const updatedMetrics: PresenceMetrics[] = [];

    for (const zone of activeZones) {
      const event = this.geofenceEngine.processSignal(signal, zone);
      if (event) {
        triggeredEvents.push(event);
        await this.store.saveGeofenceEvent(event);

        // Atualizar inteligência de presença
        const currentMetrics = await this.store.getPresenceMetrics(subjectId, zone.zoneId);
        const newMetrics = this.presenceService.updateMetrics(currentMetrics, event, signal.timestamp);
        await this.store.savePresenceMetrics(newMetrics);
        updatedMetrics.push(newMetrics);
      }
    }

    return {
      accepted: true,
      signalId: signal.signalId,
      triggeredEvents,
      updatedMetrics,
    };
  }

  /**
   * Purge total e irrevogável de todos os dados e métricas de um sujeito (LGPD).
   */
  async purgeSubject(subjectId: string): Promise<number> {
    this.geofenceEngine.purgeSubject(subjectId);
    return await this.store.purge(subjectId);
  }

  /**
   * Registra consentimento explícito para um identificador pseudonimizado.
   */
  async registerConsent(consent: PrivacyConsentMetadata): Promise<void> {
    await this.store.saveConsent(consent);
  }

  /**
   * Registra ou atualiza uma zona física.
   */
  async registerZone(zone: PhysicalZone): Promise<void> {
    await this.store.saveZone(zone);
  }
}
