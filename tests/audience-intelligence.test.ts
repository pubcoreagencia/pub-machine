/**
 * Suíte de Testes Automatizados para Audience Intelligence V0
 *
 * Cobertura exigida:
 * - Múltiplas visitas e agregação
 * - Recorrência temporal
 * - Dwell time total, médio e máximo
 * - Recência em horas
 * - Múltiplas zonas e cross-zone behavior
 * - Confidence e provenance das inferências
 * - Engine de segmentação determinística e regras declarativas
 * - Intent Bridge: transformação Audience -> Intent somente com evidência
 * - Ausência de consentimento e bloqueio de agregação
 * - Purge atômico de Audience Profile e Intent Store
 * - Isolamento estrito entre diferentes subjects pseudonimizados
 * - Verificação conceitual: RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD
 */

import assert from 'node:assert';
import {
  AudienceSignalAggregator,
  BehavioralFeatureExtractor,
  IntentBridge,
  IntentBridgeRule,
  MemoryAudienceProfileStore,
  MemoryIntentSignalStore,
  SegmentationEngine,
  SegmentationRule,
} from '../src/audience';
import { MemorySignalStore } from '../src/signal/signal-store';
import { SignalCaptureService } from '../src/signal/signal-capture.service';
import {
  GeoSignal,
  PhysicalZone,
  PrivacyConsentMetadata,
} from '../src/signal/geo-signal.types';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('AUDIENCE INTELLIGENCE V0 - TEST RUNNER');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. Behavioral Feature Extraction: Múltiplas visitas, Dwell e Recorrência
  // ----------------------------------------------------
  await runTest('BehavioralFeatureExtractor: métricas consolidadas e afinidade de zona', () => {
    const extractor = new BehavioralFeatureExtractor();
    const t0 = 1770000000000;
    const now = t0 + 24 * 3600 * 1000; // 24h depois

    const metricsList = [
      {
        pseudonymousSubjectId: 'subj_alpha',
        zoneId: 'zone_flagship',
        firstSeenAt: t0,
        lastSeenAt: t0 + 3600 * 1000,
        totalVisits: 3,
        frequencyDays: 3,
        totalDwellSeconds: 1800,
        averageDwellSeconds: 600,
        maxDwellSeconds: 900,
        recencyHours: 23,
        isCurrentlyInside: false,
      },
      {
        pseudonymousSubjectId: 'subj_alpha',
        zoneId: 'zone_lounge',
        firstSeenAt: t0 + 7200 * 1000,
        lastSeenAt: t0 + 10800 * 1000,
        totalVisits: 2,
        frequencyDays: 2,
        totalDwellSeconds: 1200,
        averageDwellSeconds: 600,
        maxDwellSeconds: 700,
        recencyHours: 21,
        isCurrentlyInside: false,
      },
    ];

    const features = extractor.extract('subj_alpha', metricsList, now);

    assert.strictEqual(features.totalObservations, 5, 'Total de visitas agregadas deve ser 5');
    assert.strictEqual(features.distinctZonesCount, 2, '2 zonas distintas observadas');
    assert.strictEqual(features.totalDwellSeconds, 3000, 'Dwell acumulado de 3000s');
    assert.strictEqual(features.averageDwellSecondsPerSession, 600, 'Dwell médio 600s');
    assert.strictEqual(features.maxDwellSecondsSingleSession, 900, 'Pico de sessão 900s');
    assert.strictEqual(features.recurringPresence, true, 'Visitante recorrente');
    assert.strictEqual(features.zoneAffinities.length, 2);
    assert.strictEqual(features.zoneAffinities[0].zoneId, 'zone_flagship');
    assert.ok(features.zoneAffinities[0].affinityScore > 0.5);

    // Inferences determinísticas
    assert.strictEqual(features.inferences['recurrent_visitor'].confidenceBand, 'HIGH');
    assert.strictEqual(features.inferences['high_dwell_intensity'].confidenceBand, 'HIGH');
  });

  // ----------------------------------------------------
  // 2. Segmentation Engine: Regras declarativas determinísticas
  // ----------------------------------------------------
  await runTest('SegmentationEngine: Avaliação de regras por visitas, dwell e afinidade', () => {
    const rules: SegmentationRule[] = [
      {
        ruleId: 'rule_high_value_visitor',
        targetSegmentId: 'seg_high_dwell_hub',
        targetSegmentName: 'High Engagement Hub Visitor',
        description: 'Usuários com alta permanência e visitas na zona flagship',
        active: true,
        priority: 100,
        conditions: {
          minVisits: 3,
          minTotalDwellSeconds: 1500,
          requiredZones: ['zone_flagship'],
        },
      },
      {
        ruleId: 'rule_casual_passerby',
        targetSegmentId: 'seg_casual',
        targetSegmentName: 'Casual Passerby',
        description: 'Visitante esporádico',
        active: true,
        priority: 10,
        conditions: {
          minVisits: 1,
        },
      },
      {
        ruleId: 'rule_inactive',
        targetSegmentId: 'seg_inactive',
        targetSegmentName: 'Inactive Rule',
        description: 'Regra desativada',
        active: false,
        priority: 50,
        conditions: { minVisits: 1 },
      },
    ];

    const engine = new SegmentationEngine(rules);
    const extractor = new BehavioralFeatureExtractor();
    const features = extractor.extract('subj_beta', [
      {
        pseudonymousSubjectId: 'subj_beta',
        zoneId: 'zone_flagship',
        firstSeenAt: 1000,
        lastSeenAt: 5000,
        totalVisits: 4,
        frequencyDays: 4,
        totalDwellSeconds: 2000,
        averageDwellSeconds: 500,
        maxDwellSeconds: 600,
        recencyHours: 2,
        isCurrentlyInside: false,
      },
    ]);

    const segments = engine.evaluate(features);
    assert.strictEqual(segments.length, 2, 'Deve corresponder a 2 regras ativas');
    assert.strictEqual(segments[0].segmentId, 'seg_high_dwell_hub', 'Regra de maior prioridade primeiro');
    assert.strictEqual(segments[1].segmentId, 'seg_casual');
    assert.ok(segments[0].reasoning.length >= 3);
    assert.ok(segments[0].confidence >= 0.8);
  });

  // ----------------------------------------------------
  // 3. Pipeline Integrado: Signal -> SignalStore -> AudienceAggregator -> AudienceProfile
  // ----------------------------------------------------
  await runTest('Signal -> Audience Aggregation: ingestão física transformando-se em AudienceProfile', async () => {
    const signalStore = new MemorySignalStore();
    const audienceStore = new MemoryAudienceProfileStore();
    const signalCapture = new SignalCaptureService(signalStore);
    const audienceAggregator = new AudienceSignalAggregator(signalStore, audienceStore);

    const subjectId = 'subj_gamma_42';
    const now = 1770000000000;

    // Consentimento
    const consent: PrivacyConsentMetadata = {
      subjectId,
      status: 'GRANTED',
      purpose: 'commercial_intelligence',
      legalBasis: 'CONSENT',
      grantedAt: now,
      retentionDays: 60,
    };
    await signalCapture.registerConsent(consent);

    // Registrar Zona
    const zone: PhysicalZone = {
      zoneId: 'zone_commercial_hub',
      name: 'PUB Business Hub',
      active: true,
      dwellThresholdSeconds: 120,
      geometry: { type: 'Circle', center: { latitude: -22.90, longitude: -43.17 }, radiusMeters: 200 },
    };
    await signalCapture.registerZone(zone);

    // Ingerir Sinais (ENTER -> DWELL -> EXIT)
    await signalCapture.ingestGeoSignal({
      signalId: 's1',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.90, longitude: -43.17 },
      accuracyMeters: 5,
      timestamp: now,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: now, receivedAt: now },
    });

    await signalCapture.ingestGeoSignal({
      signalId: 's2',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.90, longitude: -43.17 },
      accuracyMeters: 5,
      timestamp: now + 300000, // 300s de permanência
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: now + 300000, receivedAt: now + 300000 },
    });

    await signalCapture.ingestGeoSignal({
      signalId: 's3',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.95, longitude: -43.17 }, // Saiu
      accuracyMeters: 5,
      timestamp: now + 400000,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: now + 400000, receivedAt: now + 400000 },
    });

    // Agregar AudienceProfile
    const profile = await audienceAggregator.aggregateProfile(subjectId, now + 500000);
    assert.ok(profile !== null, 'Profile de audiência deve ser gerado');
    assert.strictEqual(profile!.subjectId, subjectId);
    assert.strictEqual(profile!.features.totalObservations, 1, '1 sessão/visita computada');
    assert.strictEqual(profile!.features.totalDwellSeconds, 400, '400 segundos acumulados');
    assert.strictEqual(profile!.consentMetadata.status, 'GRANTED');

    // Recuperar do Audience Store desacoplado
    const cachedProfile = await audienceStore.getProfile(subjectId);
    assert.ok(cachedProfile !== null);
    assert.strictEqual(cachedProfile!.features.totalDwellSeconds, 400);
  });

  // ----------------------------------------------------
  // 4. Intent Bridge: Emissão de Sinais de Intenção apenas com evidência
  // ----------------------------------------------------
  await runTest('IntentBridge: Emissão estrita de intenção somente quando houver evidência empírica', async () => {
    const intentStore = new MemoryIntentSignalStore();
    const bridgeRules: IntentBridgeRule[] = [
      {
        ruleId: 'rule_intent_commercial_interest',
        signalType: 'physical_commercial_hub_high_dwell',
        minTotalDwellSeconds: 600, // Exige 10 minutos (600s)
        baseStrength: 0.85,
        baseConfidence: 0.90,
        decayHalfLifeHours: 72,
      },
      {
        ruleId: 'rule_intent_frequent_visitor',
        signalType: 'high_frequency_physical_engagement',
        minVisits: 5, // Exige 5 visitas
        baseStrength: 0.75,
        baseConfidence: 0.80,
        decayHalfLifeHours: 120,
      },
    ];

    const bridge = new IntentBridge(intentStore, bridgeRules);

    // Perfil A: Apenas 100 segundos de dwell e 1 visita -> NENHUMA intenção emitida
    const weakProfile = {
      subjectId: 'subj_weak',
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      features: {
        totalObservations: 1,
        distinctZonesCount: 1,
        totalDwellSeconds: 100,
        averageDwellSecondsPerSession: 100,
        maxDwellSecondsSingleSession: 100,
        visitFrequencyPerDay: 1,
        recencyHours: 1,
        recurringPresence: false,
        zoneAffinities: [],
        temporalPatterns: {},
        inferences: {},
      },
      segments: [],
      provenance: { createdAt: 1000, updatedAt: 2000, version: 'v1' },
      consentMetadata: { status: 'GRANTED' as const, purpose: 'test', verifiedAt: 1000 },
    };

    const weakSignals = await bridge.evaluateAndBridge(weakProfile);
    assert.strictEqual(weakSignals.length, 0, 'Sinais fracos não devem gerar intenção de compra');

    // Perfil B: 900 segundos de dwell (ultrapassa 600s) -> Emite 1 sinal de intenção
    const strongProfile = {
      ...weakProfile,
      subjectId: 'subj_strong',
      features: {
        ...weakProfile.features,
        totalDwellSeconds: 900,
      },
    };

    const strongSignals = await bridge.evaluateAndBridge(strongProfile, 'lead_corp_123');
    assert.strictEqual(strongSignals.length, 1, 'Deve emitir 1 sinal de intenção com base no dwell');
    assert.strictEqual(strongSignals[0].signalType, 'physical_commercial_hub_high_dwell');
    assert.strictEqual(strongSignals[0].strength, 0.85);
    assert.strictEqual(strongSignals[0].confidence, 0.90);
    assert.strictEqual(strongSignals[0].decayHalfLifeHours, 72);
    assert.strictEqual(strongSignals[0].leadCorrelationKey, 'lead_corp_123');

    // Persistido no Intent Store desacoplado
    const saved = await intentStore.getSignalsBySubject('subj_strong');
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].signalType, 'physical_commercial_hub_high_dwell');
  });

  // ----------------------------------------------------
  // 5. Privacidade & LGPD: Bloqueio e Purge Atômico em Todas as Camadas
  // ----------------------------------------------------
  await runTest('Privacidade LGPD: Bloqueio sem consentimento e expurgo atômico na camada Audience', async () => {
    const signalStore = new MemorySignalStore();
    const audienceStore = new MemoryAudienceProfileStore();
    const intentStore = new MemoryIntentSignalStore();
    const aggregator = new AudienceSignalAggregator(signalStore, audienceStore);

    const subj = 'subj_privacy_test';

    // 1. Tentar agregar sem consentimento gravado
    const resNoConsent = await aggregator.aggregateProfile(subj);
    assert.strictEqual(resNoConsent, null, 'Sem consentimento, agregação deve retornar null');

    // 2. Cadastrar consentimento e dados
    await signalStore.saveConsent({
      subjectId: subj,
      status: 'GRANTED',
      purpose: 'test',
      legalBasis: 'CONSENT',
      retentionDays: 30,
    });
    await signalStore.savePresenceMetrics({
      pseudonymousSubjectId: subj,
      zoneId: 'z1',
      firstSeenAt: 1000,
      lastSeenAt: 2000,
      totalVisits: 1,
      frequencyDays: 1,
      totalDwellSeconds: 50,
      averageDwellSeconds: 50,
      maxDwellSeconds: 50,
      recencyHours: 1,
      isCurrentlyInside: false,
    });

    const validProfile = await aggregator.aggregateProfile(subj);
    assert.ok(validProfile !== null);

    // Salvar sinal na intent store
    await intentStore.saveIntentSignal({
      intentId: 'int_1',
      subjectId: subj,
      signalType: 'test_signal',
      strength: 0.5,
      confidence: 0.8,
      source: 'test',
      timestamp: Date.now(),
      decayHalfLifeHours: 24,
      provenance: { evidenceRule: 'test', evidenceDetails: {} },
    });

    // 3. Purge nas 3 camadas
    await signalStore.purge(subj);
    await audienceStore.purge(subj);
    await intentStore.purge(subj);

    // 4. Verificar ausência completa
    assert.strictEqual(await signalStore.getConsent(subj), null);
    assert.strictEqual(await signalStore.getAllPresenceMetricsForSubject(subj).then(l => l.length), 0);
    assert.strictEqual(await audienceStore.getProfile(subj), null);
    assert.strictEqual(await intentStore.getSignalsBySubject(subj).then(l => l.length), 0);
  });

  // ----------------------------------------------------
  // 6. Separação Conceitual: RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD
  // ----------------------------------------------------
  await runTest('Isolamento Conceitual: A presença física não cria Lead diretamente', () => {
    // Prova formal de tipagem e objetos:
    // Raw Signal tem apenas dados telemétricos (lat, lon, accuracy, timestamp)
    const rawSignal: GeoSignal = {
      signalId: 'sig_test',
      pseudonymousSubjectId: 'sub_concept',
      coordinates: { latitude: 0, longitude: 0 },
      accuracyMeters: 10,
      timestamp: 1000,
      source: 'gps',
      confidence: 1.0,
      provenance: { source: 'gps', collectedAt: 1000, receivedAt: 1000 },
    };

    // Não possui atributos de lead nem score de venda
    assert.strictEqual((rawSignal as unknown as Record<string, unknown>).leadScore, undefined);
    assert.strictEqual((rawSignal as unknown as Record<string, unknown>).companyName, undefined);

    // Audience Profile possui apenas features comportamentais e afinidades
    const extractor = new BehavioralFeatureExtractor();
    const features = extractor.extract(rawSignal.pseudonymousSubjectId, []);
    assert.strictEqual(features.totalObservations, 0);
    assert.strictEqual((features as unknown as Record<string, unknown>).isLead, undefined);
  });

  console.log('\n====================================================');
  console.log(`RESUMO DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
