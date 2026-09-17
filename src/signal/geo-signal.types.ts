/**
 * Tipos e Contratos Canônicos para Sinais Físicos e Digitais
 * Módulo: Signal / Capture Intelligence V0
 * Produto: PUB Machine (pubcoreagencia/pub-machine)
 */

export type SignalSource =
  | 'gps'
  | 'wifi'
  | 'ble'
  | 'beacon'
  | 'mobile_sdk'
  | 'hardware_sensor'
  | 'network_gateway'
  | 'web_browser'
  | 'api_ingest';

export type ConsentStatus =
  | 'GRANTED'
  | 'DENIED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'NOT_APPLICABLE';

export interface SignalProvenance {
  source: SignalSource;
  providerId?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  sdkVersion?: string;
  collectedAt: number; // Unix timestamp ms
  receivedAt: number;  // Unix timestamp ms
  ipHash?: string;     // Hash anônimo (SHA-256) se aplicável
}

export interface PrivacyConsentMetadata {
  subjectId: string;         // Identificador pseudonimizado
  status: ConsentStatus;
  purpose: string;           // ex: 'physical_presence_optimization'
  legalBasis: 'CONSENT' | 'LEGITIMATE_INTEREST' | 'CONTRACT' | 'LEGAL_OBLIGATION';
  grantedAt?: number;
  expiresAt?: number;
  retentionDays: number;     // Prazo de expiração/retenção legal
}

export interface Coordinates {
  latitude: number;   // -90 .. 90
  longitude: number;  // -180 .. 180
  altitude?: number;  // Metros acima do nível do mar
}

export interface GeoSignal {
  signalId: string;
  pseudonymousSubjectId: string; // Pseudônimo (ex: hash SHA-256 rotativo), NUNCA PII real
  coordinates: Coordinates;
  accuracyMeters: number;        // Raio de precisão estimada em metros
  timestamp: number;             // Timestamp da ocorrência (ms)
  source: SignalSource;
  confidence: number;            // 0.0 .. 1.0 (qualidade/confiabilidade do sinal)
  provenance: SignalProvenance;
  altitude?: number;
  beaconId?: string;             // UUID/Major/Minor ou MAC hash se originado de beacon
  metadata?: Record<string, unknown>;
}

export interface CircularGeometry {
  type: 'Circle';
  center: Coordinates;
  radiusMeters: number;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Coordinates[]; // Mínimo 3 vértices fechando o anel
}

export type ZoneGeometry = CircularGeometry | PolygonGeometry;

export interface PhysicalZone {
  zoneId: string;
  name: string;
  category?: 'retail_store' | 'event_venue' | 'commercial_hub' | 'outdoor_area' | 'office';
  geometry: ZoneGeometry;
  active: boolean;
  dwellThresholdSeconds: number; // Tempo mínimo em segundos para caracterizar permanência
  metadata?: Record<string, unknown>;
  provenance?: {
    createdBy: string;
    createdAt: number;
    updatedAt: number;
  };
}

export type GeofenceTransitionType =
  | 'ENTER'
  | 'INSIDE'
  | 'DWELL_THRESHOLD'
  | 'EXIT';

export interface GeofenceEvent {
  eventId: string;
  zoneId: string;
  pseudonymousSubjectId: string;
  type: GeofenceTransitionType;
  timestamp: number;
  dwellDurationSeconds: number;
  accuracyMeters: number;
  signalConfidence: number;
  coordinates: Coordinates;
}

export interface PresenceMetrics {
  pseudonymousSubjectId: string;
  zoneId: string;
  firstSeenAt: number;
  lastSeenAt: number;
  totalVisits: number;
  frequencyDays: number;         // Visitas distintas por período de dias
  totalDwellSeconds: number;
  averageDwellSeconds: number;
  maxDwellSeconds: number;
  recencyHours: number;          // Horas desde a última observação
  isCurrentlyInside: boolean;
  currentSessionStartedAt?: number;
}
