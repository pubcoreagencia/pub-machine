/**
 * Contrato de Armazenamento e Repositório Desacoplado
 * Módulo: Signal / Capture Intelligence V0
 */

import {
  GeoSignal,
  GeofenceEvent,
  PhysicalZone,
  PresenceMetrics,
  PrivacyConsentMetadata,
} from './geo-signal.types';

export interface ISignalStore {
  // Sinais brutos
  saveSignal(signal: GeoSignal): Promise<void>;
  getSignalsBySubject(subjectId: string, limit?: number): Promise<GeoSignal[]>;

  // Zonas
  saveZone(zone: PhysicalZone): Promise<void>;
  getZone(zoneId: string): Promise<PhysicalZone | null>;
  getActiveZones(): Promise<PhysicalZone[]>;

  // Eventos de Geofence
  saveGeofenceEvent(event: GeofenceEvent): Promise<void>;
  getGeofenceEvents(subjectId: string, zoneId?: string): Promise<GeofenceEvent[]>;

  // Métricas de Presença
  savePresenceMetrics(metrics: PresenceMetrics): Promise<void>;
  getPresenceMetrics(subjectId: string, zoneId: string): Promise<PresenceMetrics | null>;
  getAllPresenceMetricsForSubject(subjectId: string): Promise<PresenceMetrics[]>;

  // Privacidade / LGPD
  saveConsent(consent: PrivacyConsentMetadata): Promise<void>;
  getConsent(subjectId: string): Promise<PrivacyConsentMetadata | null>;
  purge(subjectId: string): Promise<number>; // Retorna número de registros removidos
}

/**
 * Implementação em memória para testes e execução serverless/local isolada.
 */
export class MemorySignalStore implements ISignalStore {
  private readonly signals = new Map<string, GeoSignal[]>();
  private readonly zones = new Map<string, PhysicalZone>();
  private readonly events = new Map<string, GeofenceEvent[]>();
  private readonly presence = new Map<string, PresenceMetrics>(); // Chave: `${subjectId}:${zoneId}`
  private readonly consents = new Map<string, PrivacyConsentMetadata>();

  async saveSignal(signal: GeoSignal): Promise<void> {
    const list = this.signals.get(signal.pseudonymousSubjectId) ?? [];
    list.push(signal);
    this.signals.set(signal.pseudonymousSubjectId, list);
  }

  async getSignalsBySubject(subjectId: string, limit = 100): Promise<GeoSignal[]> {
    const list = this.signals.get(subjectId) ?? [];
    return list.slice(-limit);
  }

  async saveZone(zone: PhysicalZone): Promise<void> {
    this.zones.set(zone.zoneId, { ...zone });
  }

  async getZone(zoneId: string): Promise<PhysicalZone | null> {
    const zone = this.zones.get(zoneId);
    return zone ? { ...zone } : null;
  }

  async getActiveZones(): Promise<PhysicalZone[]> {
    return Array.from(this.zones.values()).filter(z => z.active);
  }

  async saveGeofenceEvent(event: GeofenceEvent): Promise<void> {
    const list = this.events.get(event.pseudonymousSubjectId) ?? [];
    list.push(event);
    this.events.set(event.pseudonymousSubjectId, list);
  }

  async getGeofenceEvents(subjectId: string, zoneId?: string): Promise<GeofenceEvent[]> {
    const list = this.events.get(subjectId) ?? [];
    if (zoneId) {
      return list.filter(e => e.zoneId === zoneId);
    }
    return [...list];
  }

  async savePresenceMetrics(metrics: PresenceMetrics): Promise<void> {
    const key = `${metrics.pseudonymousSubjectId}:${metrics.zoneId}`;
    this.presence.set(key, { ...metrics });
  }

  async getPresenceMetrics(subjectId: string, zoneId: string): Promise<PresenceMetrics | null> {
    const key = `${subjectId}:${zoneId}`;
    const m = this.presence.get(key);
    return m ? { ...m } : null;
  }

  async getAllPresenceMetricsForSubject(subjectId: string): Promise<PresenceMetrics[]> {
    const prefix = `${subjectId}:`;
    const results: PresenceMetrics[] = [];
    for (const [k, v] of this.presence.entries()) {
      if (k.startsWith(prefix)) {
        results.push({ ...v });
      }
    }
    return results;
  }

  async saveConsent(consent: PrivacyConsentMetadata): Promise<void> {
    this.consents.set(consent.subjectId, { ...consent });
  }

  async getConsent(subjectId: string): Promise<PrivacyConsentMetadata | null> {
    const c = this.consents.get(subjectId);
    return c ? { ...c } : null;
  }

  /**
   * Purge total de qualquer dado associado ao subjectId (direito de exclusão LGPD).
   */
  async purge(subjectId: string): Promise<number> {
    let purgedCount = 0;

    if (this.signals.has(subjectId)) {
      purgedCount += this.signals.get(subjectId)!.length;
      this.signals.delete(subjectId);
    }

    if (this.events.has(subjectId)) {
      purgedCount += this.events.get(subjectId)!.length;
      this.events.delete(subjectId);
    }

    const prefix = `${subjectId}:`;
    for (const key of Array.from(this.presence.keys())) {
      if (key.startsWith(prefix)) {
        this.presence.delete(key);
        purgedCount += 1;
      }
    }

    if (this.consents.has(subjectId)) {
      this.consents.delete(subjectId);
      purgedCount += 1;
    }

    return purgedCount;
  }
}
