/**
 * Audience Signal Aggregator
 * Módulo: Audience Intelligence V0
 *
 * Agrega PresenceMetrics, GeofenceEvents e sinais observados em um AudienceProfile
 * estruturado, acionando a extração de features e a engine de segmentação.
 */

import { PresenceMetrics } from '../signal/geo-signal.types';
import { ISignalStore } from '../signal/signal-store';
import {
  AudienceProfile,
  AudienceSegmentAssignment,
} from './audience.types';
import { BehavioralFeatureExtractor } from './behavioral-features';
import { IAudienceProfileStore } from './audience-profile.store';
import { SegmentationEngine } from './segmentation-engine';

export class AudienceSignalAggregator {
  private readonly featureExtractor: BehavioralFeatureExtractor;
  private readonly segmentationEngine: SegmentationEngine;

  constructor(
    private readonly signalStore: ISignalStore,
    private readonly audienceStore: IAudienceProfileStore,
    segmentationEngine?: SegmentationEngine,
    featureExtractor?: BehavioralFeatureExtractor,
  ) {
    this.segmentationEngine = segmentationEngine ?? new SegmentationEngine();
    this.featureExtractor = featureExtractor ?? new BehavioralFeatureExtractor();
  }

  /**
   * Consolida todo o histórico de presença de um sujeito em um perfil de audiência unificado.
   */
  async aggregateProfile(
    subjectId: string,
    now: number = Date.now(),
  ): Promise<AudienceProfile | null> {
    // 1. Validar consentimento prévio
    const consent = await this.signalStore.getConsent(subjectId);
    if (!consent || consent.status !== 'GRANTED') {
      return null;
    }

    // 2. Coletar todas as métricas de presença por zona
    const presenceMetricsList = await this.signalStore.getAllPresenceMetricsForSubject(subjectId);
    if (presenceMetricsList.length === 0) {
      return null;
    }

    // 3. Extrair features comportamentais determinísticas
    const features = this.featureExtractor.extract(subjectId, presenceMetricsList, now);

    // 4. Determinar timestamps limites
    let minFirstObserved = Infinity;
    let maxLastObserved = -Infinity;
    for (const m of presenceMetricsList) {
      minFirstObserved = Math.min(minFirstObserved, m.firstSeenAt);
      maxLastObserved = Math.max(maxLastObserved, m.lastSeenAt);
    }

    // 5. Avaliar regras de segmentação ativas
    const segments = this.segmentationEngine.evaluate(features, now);

    // 6. Montar o perfil de audiência
    const existing = await this.audienceStore.getProfile(subjectId);

    const profile: AudienceProfile = {
      subjectId,
      firstObservedAt: minFirstObserved,
      lastObservedAt: maxLastObserved,
      features,
      segments,
      provenance: {
        createdAt: existing ? existing.provenance.createdAt : now,
        updatedAt: now,
        version: 'audience_v0.1.0',
      },
      consentMetadata: {
        status: consent.status,
        purpose: consent.purpose,
        verifiedAt: now,
      },
    };

    // 7. Persistir perfil no store desacoplado
    await this.audienceStore.saveProfile(profile);
    return profile;
  }

  /**
   * Expurgar perfil de audiência de forma atômica (LGPD).
   */
  async purgeSubject(subjectId: string): Promise<boolean> {
    return await this.audienceStore.purge(subjectId);
  }
}
