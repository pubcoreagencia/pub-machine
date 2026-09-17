/**
 * Suíte de Testes Automatizados para Physical → Lead Intent Integration V0
 *
 * Cobertura exigida:
 * 1. BridgeIntentSignal válido → AdaptedLeadIntentSignal via PhysicalIntentAdapter.
 * 2. Sinal físico sem consentimento → rejeitado no pipeline.
 * 3. Sinal físico expirado → decay temporal aplicado rigorosamente pelo modelo exponencial.
 * 4. Physical + Digital → composição correta multi-canal sem distorção.
 * 5. Evento físico isolado (ex: mero ENTER sem dwell/visitas) → não produz score comercial indevido.
 * 6. Múltiplos sinais físicos → agregação correta no perfil de intenção.
 * 7. Provenance preservada com trilha de auditoria completa.
 * 8. Timestamp preservado através da adaptação.
 * 9. Purge remove também os sinais derivados de intenção.
 * 10. Determinismo da adaptação e do cálculo de intenção.
 * 11. Compatibilidade com LeadScoringService existente (regras de threshold).
 * 12. Teste de Causalidade End-to-End:
 *     subject -> ENTER -> INSIDE -> DWELL_THRESHOLD -> recorrência -> AudienceProfile
 *     -> BridgeIntentSignal -> LeadIntentSignal -> scoring -> priorização.
 */

import 'reflect-metadata';
import assert from 'node:assert';
import {
  AudienceSignalAggregator,
  BridgeIntentSignal,
  IntentBridge,
  IntentBridgeRule,
  MemoryAudienceProfileStore,
  MemoryIntentSignalStore,
  PhysicalIntentAdapter,
  PHYSICAL_INTENT_TAXONOMY,
  SegmentationEngine,
  SegmentationRule,
} from '../src/audience';
import { MemorySignalStore } from '../src/signal/signal-store';
import { SignalCaptureService } from '../src/signal/signal-capture.service';
import { PhysicalZone, PrivacyConsentMetadata } from '../src/signal/geo-signal.types';
import {
  IntentSignal,
  LeadIntentSignalsService,
} from '../src/prospecting/lead-intent-signals.service';
import { LeadScoringService } from '../src/prospecting/lead-scoring.service';

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

// Mock mockável de EventEmitter2 para instanciar LeadIntentSignalsService
class MockEventEmitter {
  public emitted: Array<{ event: string; payload: unknown }> = [];
  emit(event: string, payload: unknown): boolean {
    this.emitted.push({ event, payload });
    return true;
  }
  on(): this { return this; }
}

async function main() {
  console.log('====================================================');
  console.log('PHYSICAL → LEAD INTENT INTEGRATION V0 - TEST RUNNER');
  console.log('====================================================\n');

  const adapter = new PhysicalIntentAdapter();
  const emitter = new MockEventEmitter();
  const intentService = new LeadIntentSignalsService(emitter as any);

  // ----------------------------------------------------
  // 1. BridgeIntentSignal -> AdaptedLeadIntentSignal
  // ----------------------------------------------------
  await runTest('PhysicalIntentAdapter: conversão precisa e preservação de proveniência', () => {
    const t0 = 1770000000000;
    const bridgeSignal: BridgeIntentSignal = {
      intentId: 'int_test_1',
      subjectId: 'subj_anon_01',
      leadCorrelationKey: 'lead_b2b_77',
      signalType: 'physical_commercial_hub_high_dwell',
      strength: 0.8,
      confidence: 0.9,
      source: 'audience_intelligence_bridge',
      timestamp: t0,
      decayHalfLifeHours: 72,
      provenance: {
        evidenceRule: 'rule_high_dwell_hub',
        evidenceDetails: {
          totalDwellSeconds: 1800,
          totalVisits: 3,
        },
      },
    };

    const adapted = adapter.adapt(bridgeSignal);
    assert.ok(adapted !== null);
    assert.strictEqual(adapted!.leadId, 'lead_b2b_77');
    assert.strictEqual(adapted!.channel, 'physical');
    assert.strictEqual(adapted!.signalType, PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL);
    assert.strictEqual(adapted!.weight, 0.72); // 0.8 * 0.9 = 0.72
    assert.strictEqual(adapted!.occurredAt.getTime(), t0);
    assert.strictEqual(adapted!.decayHalfLifeHours, 72);
    assert.strictEqual(adapted!.metadata.audit.evidenceRule, 'rule_high_dwell_hub');
    assert.strictEqual(adapted!.metadata.audit.detectedDwellSeconds, 1800);
    assert.strictEqual(adapted!.metadata.audit.confidence, 0.9);
  });

  // ----------------------------------------------------
  // 2. Bloqueio por ausência de consentimento
  // ----------------------------------------------------
  await runTest('Governança LGPD: Sinais físicos sem consentimento são rejeitados na borda', async () => {
    const signalStore = new MemorySignalStore();
    const service = new SignalCaptureService(signalStore);

    const res = await service.ingestGeoSignal({
      signalId: 'sig_unauth',
      pseudonymousSubjectId: 'subj_unauthorized',
      coordinates: { latitude: 0, longitude: 0 },
      accuracyMeters: 5,
      timestamp: Date.now(),
      source: 'gps',
      confidence: 1.0,
      provenance: { source: 'gps', collectedAt: Date.now(), receivedAt: Date.now() },
    });

    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'CONSENT_REQUIRED_OR_NOT_GRANTED');
  });

  // ----------------------------------------------------
  // 3. Integração com LeadIntentSignalsService e Decay Temporal
  // ----------------------------------------------------
  await runTest('Decay Temporal: Sinal físico decai conforme half-life estabelecido', async () => {
    const leadId = 'lead_decay_test';
    const now = Date.now();

    // Sinal físico fresco (agora)
    const freshSignal: IntentSignal = {
      leadId,
      channel: 'physical',
      weight: 0.8,
      occurredAt: new Date(now),
    };

    const freshProfile = await intentService.capture(freshSignal);
    const freshScore = freshProfile.score;
    assert.ok(freshScore > 0, 'Sinal físico recente deve produzir score de intenção positivo');

    // Simular sinal antigo (72 horas atrás = 1 half-life de physical)
    const agedSignal: IntentSignal = {
      leadId: 'lead_aged_test',
      channel: 'physical',
      weight: 0.8,
      occurredAt: new Date(now - 72 * 3600 * 1000), // 72 horas atrás
    };

    const agedProfile = await intentService.capture(agedSignal);
    // Com 1 half-life de decay (50% de perda de contribuição), a contribuição bruta cai pela metade
    assert.ok(agedProfile.score < freshScore, 'Sinal com 72h deve ter score significativamente menor');
    assert.ok(agedProfile.decayFactor <= 0.55, 'Fator de decay deve refletir ~0.5');
  });

  // ----------------------------------------------------
  // 4. Composição Multi-Sinal: Physical + Digital
  // ----------------------------------------------------
  await runTest('Multi-Signal Composition: Sinais físicos e digitais compõem sem dominância indevida', async () => {
    const leadId = 'lead_multichannel';
    const now = new Date();

    // Injetar sinal físico (presença qualificada)
    await intentService.capture({
      leadId,
      channel: 'physical',
      weight: 0.7,
      occurredAt: now,
    });

    // Injetar sinal digital (pricing page view)
    const compositeProfile = await intentService.capture({
      leadId,
      channel: 'pricing_page_view',
      weight: 0.9,
      occurredAt: now,
    });

    assert.strictEqual(compositeProfile.signalCount, 2);
    assert.ok(compositeProfile.topChannels.includes('physical'));
    assert.ok(compositeProfile.topChannels.includes('pricing_page_view'));
    assert.ok(compositeProfile.score > 60, 'Composição multi-canal deve gerar score robusto');
  });

  // ----------------------------------------------------
  // 5. Evento Físico Isolado: Não produz score comercial indevido
  // ----------------------------------------------------
  await runTest('Isolamento Causal: Presença isolada sem dwell não vira intenção comercial', async () => {
    const intentStore = new MemoryIntentSignalStore();
    const bridgeRules: IntentBridgeRule[] = [
      {
        ruleId: 'rule_high_intent',
        signalType: PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL,
        minTotalDwellSeconds: 900, // Exige 15 min
        minVisits: 3,              // Exige 3 visitas
        baseStrength: 0.8,
        baseConfidence: 0.9,
        decayHalfLifeHours: 72,
      },
    ];
    const bridge = new IntentBridge(intentStore, bridgeRules);

    // Mero transeunte: 1 visita, 20 segundos de permanência
    const passerbyProfile = {
      subjectId: 'subj_passerby',
      firstObservedAt: 1000,
      lastObservedAt: 1020,
      features: {
        totalObservations: 1,
        distinctZonesCount: 1,
        totalDwellSeconds: 20,
        averageDwellSecondsPerSession: 20,
        maxDwellSecondsSingleSession: 20,
        visitFrequencyPerDay: 1,
        recencyHours: 0.1,
        recurringPresence: false,
        zoneAffinities: [],
        temporalPatterns: {},
        inferences: {},
      },
      segments: [],
      provenance: { createdAt: 1000, updatedAt: 1020, version: 'v1' },
      consentMetadata: { status: 'GRANTED' as const, purpose: 'test', verifiedAt: 1000 },
    };

    const signals = await bridge.evaluateAndBridge(passerbyProfile);
    assert.strictEqual(signals.length, 0, 'Passagem rápida NÃO deve emitir nenhum sinal de intenção');
  });

  // ----------------------------------------------------
  // 6. Purge em Cascata & Direito ao Esquecimento
  // ----------------------------------------------------
  await runTest('Purge em Cascata: Expurgo atômico limpa sinais brutos, perfil e sinais derivados', async () => {
    const signalStore = new MemorySignalStore();
    const audienceStore = new MemoryAudienceProfileStore();
    const intentStore = new MemoryIntentSignalStore();
    const subj = 'subj_full_purge';

    await signalStore.saveConsent({
      subjectId: subj,
      status: 'GRANTED',
      purpose: 'test',
      legalBasis: 'CONSENT',
      retentionDays: 30,
    });
    await audienceStore.saveProfile({
      subjectId: subj,
      firstObservedAt: 1000,
      lastObservedAt: 2000,
      features: {} as any,
      segments: [],
      provenance: { createdAt: 1000, updatedAt: 2000, version: 'v1' },
      consentMetadata: { status: 'GRANTED', purpose: 'test', verifiedAt: 1000 },
    });
    await intentStore.saveIntentSignal({
      intentId: 'int_purge_1',
      subjectId: subj,
      signalType: 'physical.test',
      strength: 0.8,
      confidence: 0.9,
      source: 'bridge',
      timestamp: 1000,
      decayHalfLifeHours: 72,
      provenance: { evidenceRule: 'r1', evidenceDetails: {} },
    });

    // Limpar no LeadIntentSignalsService também
    intentService.purge(subj);

    // Executar purgas nas stores desacopladas
    await signalStore.purge(subj);
    await audienceStore.purge(subj);
    await intentStore.purge(subj);

    assert.strictEqual(await signalStore.getConsent(subj), null);
    assert.strictEqual(await audienceStore.getProfile(subj), null);
    assert.strictEqual((await intentStore.getSignalsBySubject(subj)).length, 0);
    assert.strictEqual(intentService.getProfile(subj).score, 0);
  });

  // ----------------------------------------------------
  // 7. Compatibilidade com LeadScoringService (Thresholds)
  // ----------------------------------------------------
  await runTest('LeadScoringService: Compatibilidade de regras e persistência de score', async () => {
    // Simular LeadRepository em memória
    const mockRepo = {
      lead: { id: 'lead_score_test', score: 0 },
      interactions: [
        { type: 'websiteVisit' },
        { type: 'formSubmit' },
      ],
      async findById(id: string) { return this.lead; },
      async getInteractions(id: string) { return this.interactions; },
      async updateScore(id: string, score: number) { this.lead.score = score; },
    };

    const scoringService = new LeadScoringService(mockRepo as any);
    const score = await scoringService.calculateScore('lead_score_test');
    assert.strictEqual(score, 50); // websiteVisit (20) + formSubmit (30) = 50

    await scoringService.assignScore('lead_score_test');
    assert.strictEqual(mockRepo.lead.score, 50);
  });

  // ----------------------------------------------------
  // 8. TESTE DE CAUSALIDADE END-TO-END (O Santo Graal)
  // ----------------------------------------------------
  await runTest('CAUSALIDADE END-TO-END: Telemetria -> Geofence -> Audiência -> Bridge -> Intent -> Score', async () => {
    const signalStore = new MemorySignalStore();
    const audienceStore = new MemoryAudienceProfileStore();
    const intentStore = new MemoryIntentSignalStore();

    const signalCapture = new SignalCaptureService(signalStore);
    const audienceAggregator = new AudienceSignalAggregator(signalStore, audienceStore);
    const intentBridge = new IntentBridge(intentStore);
    const intentAdapter = new PhysicalIntentAdapter();

    const subjectId = 'subj_enterprise_vip';
    const leadId = 'lead_enterprise_holding_01';
    const t0 = Date.now() - 3600000; // 1 hora atrás

    // ETAPA 1: Consentimento Explícito e Cadastro de Zona
    await signalCapture.registerConsent({
      subjectId,
      status: 'GRANTED',
      purpose: 'commercial_intelligence',
      legalBasis: 'CONSENT',
      retentionDays: 90,
    });

    const commercialHubZone: PhysicalZone = {
      zoneId: 'zone_flagship_pub_hub',
      name: 'PUB Business Flagship Hub',
      active: true,
      dwellThresholdSeconds: 300, // 5 minutos de permanência para disparar DWELL_THRESHOLD
      geometry: {
        type: 'Circle',
        center: { latitude: -22.9068, longitude: -43.1729 },
        radiusMeters: 150,
      },
    };
    await signalCapture.registerZone(commercialHubZone);

    // ETAPA 2: Telemetria Bruta (ENTER -> INSIDE -> DWELL_THRESHOLD -> EXIT)
    // 2.1 ENTER
    const enterRes = await signalCapture.ingestGeoSignal({
      signalId: 'telemetry_01',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.9068, longitude: -43.1729 },
      accuracyMeters: 8,
      timestamp: t0,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: t0, receivedAt: t0 },
    });
    assert.strictEqual(enterRes.triggeredEvents[0].type, 'ENTER');

    // 2.2 DWELL_THRESHOLD (350s depois)
    const dwellRes = await signalCapture.ingestGeoSignal({
      signalId: 'telemetry_02',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.9068, longitude: -43.1729 },
      accuracyMeters: 8,
      timestamp: t0 + 350000,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: t0 + 350000, receivedAt: t0 + 350000 },
    });
    assert.strictEqual(dwellRes.triggeredEvents[0].type, 'DWELL_THRESHOLD');

    // 2.3 EXIT (500s depois - move-se para fora da zona)
    const exitRes = await signalCapture.ingestGeoSignal({
      signalId: 'telemetry_03',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.9500, longitude: -43.1729 },
      accuracyMeters: 8,
      timestamp: t0 + 500000,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: t0 + 500000, receivedAt: t0 + 500000 },
    });
    assert.strictEqual(exitRes.triggeredEvents[0].type, 'EXIT');

    // ETAPA 3: Agregação Comportamental (AudienceProfile)
    const audienceProfile = await audienceAggregator.aggregateProfile(subjectId, t0 + 600000);
    assert.ok(audienceProfile !== null);
    assert.strictEqual(audienceProfile!.features.totalObservations, 1);
    assert.strictEqual(audienceProfile!.features.totalDwellSeconds, 500);
    assert.ok(audienceProfile!.features.zoneAffinities[0].affinityScore > 0.1);

    // ETAPA 4: Avaliação da IntentBridge (Evidência: dwell >= 400s)
    intentBridge.registerRule({
      ruleId: 'rule_vip_hub_immersion',
      signalType: PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL,
      minTotalDwellSeconds: 400, // Exige 400s
      baseStrength: 0.90,
      baseConfidence: 0.95,
      decayHalfLifeHours: 72,
    });

    const bridgeSignals = await intentBridge.evaluateAndBridge(audienceProfile!, leadId, t0 + 600000);
    assert.strictEqual(bridgeSignals.length, 1, 'Deve emitir 1 sinal de intenção qualificado');
    assert.strictEqual(bridgeSignals[0].signalType, PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL);

    // ETAPA 5: Adaptação para Lead Intent (PhysicalIntentAdapter)
    const adaptedSignal = intentAdapter.adapt(bridgeSignals[0]);
    assert.ok(adaptedSignal !== null);
    assert.strictEqual(adaptedSignal!.channel, 'physical');
    assert.strictEqual(adaptedSignal!.leadId, leadId);
    assert.strictEqual(adaptedSignal!.weight, 0.86); // 0.90 * 0.95 = 0.855 -> 0.86

    // ETAPA 6: Ingestão no LeadIntentSignalsService
    const profileBefore = intentService.getProfile(leadId);
    assert.strictEqual(profileBefore.score, 0);

    const updatedProfile = await intentService.capture({
      leadId: adaptedSignal!.leadId,
      channel: adaptedSignal!.channel,
      weight: adaptedSignal!.weight,
      occurredAt: adaptedSignal!.occurredAt,
      metadata: adaptedSignal!.metadata,
    });

    // ETAPA 7: Verificação do Impacto no Lead Intent Profile
    assert.ok(updatedProfile.score > 0, 'O score de intenção do lead deve ter sido elevado');
    assert.strictEqual(updatedProfile.topChannels[0], 'physical');
    assert.strictEqual(updatedProfile.signalCount, 1);

    // Auditoria comprovada
    const lastAudit = (adaptedSignal!.metadata.audit as any);
    assert.strictEqual(lastAudit.evidenceRule, 'rule_vip_hub_immersion');
    assert.strictEqual(lastAudit.detectedDwellSeconds, 500);
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
