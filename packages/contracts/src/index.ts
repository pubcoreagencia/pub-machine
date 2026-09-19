/**
 * PUB MACHINE OS — Canonical Contracts V1
 * Framework-agnostic domain contracts shared by engine, API, persistence and UI.
 */

export type Id = string;
export type TimestampMs = number;

export type SignalSource =
  | 'gps' | 'wifi' | 'ble' | 'beacon' | 'mobile_sdk'
  | 'hardware_sensor' | 'network_gateway' | 'web_browser' | 'api_ingest'
  | 'website' | 'email' | 'social' | 'crm' | 'ecommerce' | 'ad_network';

export type RawEventType =
  | 'GEO_PRESENCE'
  | 'PAGE_VIEW'
  | 'VIDEO_VIEW'
  | 'VIDEO_25'
  | 'VIDEO_50'
  | 'VIDEO_75'
  | 'VIDEO_100'
  | 'FOLLOW'
  | 'LIKE'
  | 'COMMENT'
  | 'SHARE'
  | 'CTA_CLICK'
  | 'SITE_VISIT'
  | 'PRODUCT_VIEW'
  | 'CART_STARTED'
  | 'CART_ABANDONED'
  | 'CHECKOUT_STARTED'
  | 'ORDER_CREATED'
  | 'PIX_PENDING'
  | 'BOLETO_PENDING'
  | 'CARD_DECLINED'
  | 'PURCHASE'
  | 'EMAIL_OPEN'
  | 'EMAIL_CLICK'
  | 'DEMO_REQUEST'
  | 'CONTENT_DOWNLOAD'
  | 'WEBINAR_ATTENDANCE'
  | 'LINKEDIN_ENGAGEMENT'
  | 'COMPETITOR_MENTION'
  | 'FUNDING_ANNOUNCEMENT'
  | 'HIRING_SIGNAL';

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface SignalProvenance {
  source: SignalSource | string;
  providerId?: string;
  sdkVersion?: string;
  hardwareModel?: string;
  collectedAt: TimestampMs;
  receivedAt: TimestampMs;
  ipHash?: string;
  metadata?: Record<string, unknown>;
}

export interface PrivacyContext {
  subjectId: Id;
  status: 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED' | 'NOT_APPLICABLE';
  purpose: string;
  legalBasis: 'CONSENT' | 'LEGITIMATE_INTEREST' | 'CONTRACT' | 'LEGAL_OBLIGATION';
  verifiedAt: TimestampMs;
  expiresAt?: TimestampMs;
  retentionUntil?: TimestampMs;
}

export interface RawSignal {
  signalId: Id;
  subjectId: Id;
  eventType: RawEventType | string;
  occurredAt: TimestampMs;
  source: SignalSource | string;
  confidence: number;
  coordinates?: Coordinates;
  metadata?: Record<string, unknown>;
  provenance: SignalProvenance;
  privacy: PrivacyContext;
}

export interface CircularGeometry {
  type: 'Circle';
  center: Coordinates;
  radiusMeters: number;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Coordinates[];
}

export type ZoneGeometry = CircularGeometry | PolygonGeometry;

export interface PhysicalZone {
  zoneId: Id;
  name: string;
  geometry: ZoneGeometry;
  active: boolean;
  dwellThresholdSeconds: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export type GeofenceTransition = 'ENTER' | 'INSIDE' | 'DWELL_THRESHOLD' | 'EXIT';

export interface GeofenceEvent {
  eventId: Id;
  subjectId: Id;
  zoneId: Id;
  type: GeofenceTransition;
  timestamp: TimestampMs;
  dwellDurationSeconds: number;
  accuracyMeters: number;
  signalConfidence: number;
  coordinates: Coordinates;
  provenance: SignalProvenance;
}

export interface PresenceMetrics {
  subjectId: Id;
  zoneId: Id;
  firstSeenAt: TimestampMs;
  lastSeenAt: TimestampMs;
  totalVisits: number;
  frequencyDays: number;
  totalDwellSeconds: number;
  averageDwellSeconds: number;
  maxDwellSeconds: number;
  recencyHours: number;
  isCurrentlyInside: boolean;
  currentSessionStartedAt?: TimestampMs;
}

export interface BehavioralFeatures {
  totalObservations: number;
  distinctZonesCount: number;
  totalDwellSeconds: number;
  averageDwellSecondsPerSession: number;
  maxDwellSecondsSingleSession: number;
  visitFrequencyPerDay: number;
  recencyHours: number;
  recurringPresence: boolean;
  zoneAffinities: Array<{
    zoneId: Id;
    category?: string;
    visitCount: number;
    totalDwellSeconds: number;
    affinityScore: number;
    firstObservedAt: TimestampMs;
    lastObservedAt: TimestampMs;
    recencyHours: number;
  }>;
  temporalPatterns: {
    peakHours?: number[];
    weekdayRatio?: number;
  };
}

export interface AudienceSegmentAssignment {
  segmentId: Id;
  segmentName: string;
  ruleId: Id;
  confidence: number;
  reasoning: string[];
  assignedAt: TimestampMs;
  expiresAt?: TimestampMs;
}

export type LifecycleStage =
  | 'NEW' | 'WARM' | 'QUALIFIED' | 'HOT'
  | 'CONVERTED' | 'CUSTOMER' | 'RECOVERY' | 'SUPPRESSED';

export interface AudienceProfile {
  subjectId: Id;
  firstObservedAt: TimestampMs;
  lastObservedAt: TimestampMs;
  features: BehavioralFeatures;
  segments: AudienceSegmentAssignment[];
  lifecycle: LifecycleStage;
  consent: PrivacyContext;
  provenance: {
    createdAt: TimestampMs;
    updatedAt: TimestampMs;
    version: string;
  };
}

export interface IntentEvidence {
  source: 'physical' | 'digital' | 'commerce' | 'crm' | string;
  signalType: string;
  strength: number;
  confidence: number;
  decay: number;
  timestamp: TimestampMs;
  provenance: Record<string, unknown>;
}

export interface IntentSignal {
  intentId: Id;
  subjectId: Id;
  signalType: string;
  strength: number;
  confidence: number;
  source: string;
  timestamp: TimestampMs;
  decayHalfLifeHours: number;
  evidence: IntentEvidence[];
}

export interface LeadIntentProfile {
  leadId: Id;
  score: number;
  signalCount: number;
  decayFactor: number;
  topChannels: string[];
  evidence: IntentEvidence[];
  computedAt: TimestampMs;
}

export interface Lead {
  leadId: Id;
  subjectId?: Id;
  source?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export type ActionPriority =
  | 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW' | 'P4_COLD';

export type ExecutionMode = 'AUTONOMOUS' | 'HUMAN_APPROVAL' | 'HUMAN_ONLY';

export interface LeadActionDecision {
  decisionId: Id;
  leadId: Id;
  subjectId: Id;
  deduplicationKey: string;
  priority: ActionPriority;
  urgency: 'IMMEDIATE' | 'SAME_DAY' | 'NEXT_DAY' | 'SCHEDULED' | 'PASSIVE';
  slaHours: number;
  recommendedAction: string;
  recommendedChannel: string;
  executionMode: ExecutionMode;
  score: number;
  intentStrength: number;
  confidence: number;
  evidence: IntentEvidence[];
  reasons: string[];
  generatedAt: TimestampMs;
  expiresAt: TimestampMs;
  cooldownUntil: TimestampMs;
  provenance: Record<string, unknown>;
}

export type DispatchStatus =
  | 'QUEUED' | 'PENDING_APPROVAL' | 'IGNORED_DUPLICATE'
  | 'EXPIRED' | 'REJECTED_CONSENT';

export interface DispatchResult {
  dispatched: boolean;
  decisionId: Id;
  deduplicationKey: string;
  timestamp: TimestampMs;
  handler: string;
  status: DispatchStatus;
  details?: Record<string, unknown>;
}

export type ConversionStatus =
  | 'PENDING' | 'FAILED' | 'ABANDONED' | 'PAID';

export type PaymentMethod = 'PIX' | 'BOLETO' | 'CARD' | 'OTHER';

export interface Conversion {
  conversionId: Id;
  leadId?: Id;
  subjectId: Id;
  orderId: string;
  value: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: ConversionStatus;
  recovered: boolean;
  recoveryType?: string;
  originatingDecisionId?: Id;
  occurredAt: TimestampMs;
  metadata?: Record<string, unknown>;
}

export interface MachineTelemetry {
  machineId: Id;
  machineNumber: 1 | 2 | 3;
  timestamp: TimestampMs;
  status: 'CONNECTING' | 'LIVE' | 'DEGRADED' | 'OFFLINE';
  peopleTracked?: number;
  peopleInside?: number;
  signalsPerMinute?: number;
  confidence?: number;
  accuracyMeters?: number;
  metrics?: Record<string, number>;
}

export type MachineEventType =
  | 'SIGNAL_CAPTURED'
  | 'GEOFENCE_ENTER'
  | 'GEOFENCE_EXIT'
  | 'AUDIENCE_UPDATED'
  | 'SEGMENT_ASSIGNED'
  | 'INTENT_UPDATED'
  | 'LEAD_UPDATED'
  | 'DECISION_CREATED'
  | 'DISPATCH_QUEUED'
  | 'CONVERSION_UPDATED'
  | 'RECOVERY_TRIGGERED';

export interface MachineEvent {
  eventId: Id;
  type: MachineEventType;
  timestamp: TimestampMs;
  machineNumber: 1 | 2 | 3;
  subjectId?: Id;
  leadId?: Id;
  payload: Record<string, unknown>;
  provenance: Record<string, unknown>;
}
