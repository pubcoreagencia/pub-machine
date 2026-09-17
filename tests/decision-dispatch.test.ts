/**
 * Suíte de Testes Automatizados para Decision & Dispatch V0
 *
 * Cobertura exigida:
 * 1. LeadActionDecision determinístico com todos os campos (decisionId, priority, urgency, SLA, channel).
 * 2. Cadeia de evidências auditável (Evidence Chain com source, confidence, decay e provenance).
 * 3. Channel Recommendation Engine (separação estrita entre Prioridade/Quando e Canal/Como).
 * 4. Idempotência e Cooldown: mesma oportunidade na mesma janela não duplica despacho.
 * 5. Expiração temporal: decisão com sinais expirados é bloqueada no despacho com status EXPIRED.
 * 6. Human Handoff: Lead P0 ou com restrições marca status PENDING_APPROVAL.
 * 7. Multi-sinal: composição harmônica entre sinal físico, digital e CRM.
 * 8. Evento físico isolado / sem evidência: não produz LeadActionDecision indevida.
 * 9. Ausência de consentimento / Purge: respeito rigoroso à privacidade LGPD.
 * 10. CENÁRIO END-TO-END DE CAUSALIDADE:
 *     physical signal -> geofence -> presence -> audience -> intent -> physical lead intent
 *     -> lead scoring -> prioritization -> action decision -> channel recommendation -> noop/memory dispatch.
 */

import assert from 'node:assert';
import 'reflect-metadata';

import {
  ActionEvidence,
  ChannelRecommendationEngine,
  LeadActionDecisionEngine,
  MemoryActionDispatcher,
} from '../src/decision';

import {
  AudienceSignalAggregator,
  IntentBridge,
  MemoryAudienceProfileStore,
  MemoryIntentSignalStore,
  PhysicalIntentAdapter,
  PHYSICAL_INTENT_TAXONOMY,
} from '../src/audience';

import { MemorySignalStore } from '../src/signal/signal-store';
import { SignalCaptureService } from '../src/signal/signal-capture.service';
import { PhysicalZone } from '../src/signal/geo-signal.types';
import { LeadIntentSignalsService } from '../src/prospecting/lead-intent-signals.service';
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
  console.log('DECISION & DISPATCH V0 - TEST RUNNER');
  console.log('====================================================\n');

  const channelEngine = new ChannelRecommendationEngine();
  const decisionEngine = new LeadActionDecisionEngine(channelEngine);
  const dispatcher = new MemoryActionDispatcher();

  // ----------------------------------------------------
  // 1. LeadActionDecision Determinístico & Auditável
  // ----------------------------------------------------
  await runTest('LeadActionDecision: geração determinística com auditoria e SLA calculados', () => {
    const evidence: ActionEvidence[] = [
      {
        source: 'physical',
        signalType: PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL,
        strength: 0.9,
        confidence: 0.95,
        decay: 1.0,
        timestamp: Date.now(),
        provenance: { zoneId: 'flagship_hub', evidenceRule: 'rule_high_dwell' },
      },
      {
        source: 'digital',
        signalType: 'pricing_page_view',
        strength: 0.85,
        confidence: 0.90,
        decay: 0.95,
        timestamp: Date.now(),
        provenance: { url: '/pricing' },
      },
    ];

    const decision = decisionEngine.evaluate({
      leadId: 'lead_audit_01',
      subjectId: 'subj_audit_01',
      intentScore: 88,
      leadScore: 80,
      evidence,
      conversionVelocityHours: 12,
    });

    assert.ok(decision !== null, 'Decisão deve ser gerada');
    assert.strictEqual(decision!.leadId, 'lead_audit_01');
    assert.strictEqual(decision!.priority, 'P0_CRITICAL');
    assert.strictEqual(decision!.urgency, 'IMMEDIATE');
    assert.strictEqual(decision!.slaHours, 1);
    assert.strictEqual(decision!.recommendedChannel, 'whatsapp');
    assert.strictEqual(decision!.executionMode, 'HUMAN_APPROVAL');
    assert.strictEqual(decision!.evidence.length, 2);
    assert.ok(decision!.reasons.length >= 2);
    assert.ok(decision!.deduplicationKey.includes('lead_audit_01'));
  });

  // ----------------------------------------------------
  // 2. Separação Conceitual: Prioridade (Quando) vs Canal (Como)
  // ----------------------------------------------------
  await runTest('Separação Prioridade vs Canal: P0 corporativo sem demo solicita telefone/sdr', () => {
    // Evidência corporativa pura (sem demo ou WhatsApp direto)
    const evidence: ActionEvidence[] = [
      {
        source: 'crm',
        signalType: 'executive_inbound_form',
        strength: 0.95,
        confidence: 0.95,
        decay: 1.0,
        timestamp: Date.now(),
        provenance: {},
      },
    ];

    const recP0 = channelEngine.recommendChannel({
      leadId: 'lead_corp_ceo',
      priority: 'P0_CRITICAL',
      evidence,
      intentProfileChannels: [],
    });

    assert.strictEqual(recP0.channel, 'phone', 'P0 corporativo sem canais diretos deve recomendar telefone');

    // O mesmo lead classificado como P2 receberia e-mail para nutrição
    const recP2 = channelEngine.recommendChannel({
      leadId: 'lead_corp_ceo',
      priority: 'P2_MEDIUM',
      evidence,
      intentProfileChannels: [],
    });
    assert.strictEqual(recP2.channel, 'email', 'P2 recomenda email independentemente do telefone');
  });

  // ----------------------------------------------------
  // 3. Idempotência e Cooldown no Despacho
  // ----------------------------------------------------
  await runTest('Idempotência e Cooldown: mesma oportunidade na mesma janela não duplica ação', async () => {
    dispatcher.clear();

    const decision = decisionEngine.evaluate({
      leadId: 'lead_idempotent_test',
      subjectId: 'subj_idemp_test',
      intentScore: 75,
      leadScore: 70,
      evidence: [
        {
          source: 'digital',
          signalType: 'content_download',
          strength: 0.7,
          confidence: 0.85,
          decay: 1.0,
          timestamp: Date.now(),
          provenance: {},
        },
      ],
    });

    assert.ok(decision !== null);

    // Primeiro despacho -> Aceito (PENDING_APPROVAL por governança ou QUEUED)
    const res1 = await dispatcher.dispatch(decision!);
    assert.strictEqual(res1.dispatched, true);
    assert.strictEqual(res1.status, 'PENDING_APPROVAL');

    // Segundo despacho imediato com a mesma decisão -> Bloqueado por duplicidade (cooldown)
    const res2 = await dispatcher.dispatch(decision!);
    assert.strictEqual(res2.dispatched, false);
    assert.strictEqual(res2.status, 'IGNORED_DUPLICATE');
  });

  // ----------------------------------------------------
  // 4. Expiração da Decisão
  // ----------------------------------------------------
  await runTest('Expiração da Decisão: sinais envelhecidos geram decisão que expira e é bloqueada', async () => {
    dispatcher.clear();

    const decision = decisionEngine.evaluate({
      leadId: 'lead_expire_test',
      subjectId: 'subj_expire_test',
      intentScore: 50,
      leadScore: 50,
      evidence: [
        {
          source: 'digital',
          signalType: 'website_visit',
          strength: 0.4,
          confidence: 0.7,
          decay: 0.1, // Sinal com forte decaimento
          timestamp: Date.now() - 30 * 24 * 3600 * 1000,
          provenance: {},
        },
      ],
    });

    assert.ok(decision !== null);

    // Forçar data de expiração no passado para testar a proteção do dispatcher
    const expiredDecision = {
      ...decision!,
      expiresAt: Date.now() - 1000,
    };

    const res = await dispatcher.dispatch(expiredDecision);
    assert.strictEqual(res.dispatched, false);
    assert.strictEqual(res.status, 'EXPIRED');
  });

  // ----------------------------------------------------
  // 5. Governança e Human Handoff Obrigatório em P0
  // ----------------------------------------------------
  await runTest('Human Handoff: Decisões P0 nunca disparam autonomamente na V0 (exigem aprovação)', async () => {
    dispatcher.clear();

    const decision = decisionEngine.evaluate({
      leadId: 'lead_p0_gov',
      subjectId: 'subj_p0_gov',
      intentScore: 95,
      leadScore: 90,
      evidence: [
        {
          source: 'physical',
          signalType: PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL,
          strength: 1.0,
          confidence: 1.0,
          decay: 1.0,
          timestamp: Date.now(),
          provenance: {},
        },
      ],
    });

    assert.ok(decision !== null);
    assert.strictEqual(decision!.executionMode, 'HUMAN_APPROVAL');

    const result = await dispatcher.dispatch(decision!);
    assert.strictEqual(result.dispatched, true);
    assert.strictEqual(result.status, 'PENDING_APPROVAL', 'Status deve ser estritamente PENDING_APPROVAL');
  });

  // ----------------------------------------------------
  // 6. Ausência de Evidências: Não gera Decisão "Mágica"
  // ----------------------------------------------------
  await runTest('Isolamento Causal: Tentativa de decisão sem evidências rastreáveis retorna null', () => {
    const decision = decisionEngine.evaluate({
      leadId: 'lead_no_evidence',
      subjectId: 'subj_no_evidence',
      intentScore: 90,
      leadScore: 90,
      evidence: [], // Lista vazia de evidências
    });

    assert.strictEqual(decision, null, 'Sem evidências rastreáveis, nenhuma decisão pode ser gerada');
  });

  // ----------------------------------------------------
  // 7. CENÁRIO END-TO-END DE CAUSALIDADE COMPLETO (FASE 1 A 4)
  // ----------------------------------------------------
  await runTest('CAUSALIDADE COMPLETA E2E: Signal -> Geofence -> Audience -> Intent -> Lead -> Decision -> Dispatch', async () => {
    dispatcher.clear();

    // 1. Instanciar toda a cadeia de serviços
    const signalStore = new MemorySignalStore();
    const audienceStore = new MemoryAudienceProfileStore();
    const intentStore = new MemoryIntentSignalStore();

    const signalCapture = new SignalCaptureService(signalStore);
    const audienceAggregator = new AudienceSignalAggregator(signalStore, audienceStore);
    const intentBridge = new IntentBridge(intentStore);
    const intentAdapter = new PhysicalIntentAdapter();
    const emitter = new MockEventEmitter();
    const leadIntentService = new LeadIntentSignalsService(emitter as any);

    const subjectId = 'subj_enterprise_e2e';
    const leadId = 'lead_enterprise_corp_99';
    const now = Date.now();
    const t0 = now - 7200000; // 2 horas atrás

    // 2. Consentimento e Zona Comercial
    await signalCapture.registerConsent({
      subjectId,
      status: 'GRANTED',
      purpose: 'business_intelligence',
      legalBasis: 'CONSENT',
      retentionDays: 60,
    });

    const flagshipZone: PhysicalZone = {
      zoneId: 'zone_e2e_flagship',
      name: 'PUB Innovation Center',
      active: true,
      dwellThresholdSeconds: 300,
      geometry: { type: 'Circle', center: { latitude: -22.90, longitude: -43.17 }, radiusMeters: 100 },
    };
    await signalCapture.registerZone(flagshipZone);

    // 3. Telemetria Física (ENTER -> DWELL 500s -> EXIT)
    await signalCapture.ingestGeoSignal({
      signalId: 's1',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.90, longitude: -43.17 },
      accuracyMeters: 5,
      timestamp: t0,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: t0, receivedAt: t0 },
    });

    await signalCapture.ingestGeoSignal({
      signalId: 's2',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.90, longitude: -43.17 },
      accuracyMeters: 5,
      timestamp: t0 + 350000,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: t0 + 350000, receivedAt: t0 + 350000 },
    });

    await signalCapture.ingestGeoSignal({
      signalId: 's3',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.95, longitude: -43.17 }, // Saiu
      accuracyMeters: 5,
      timestamp: t0 + 500000,
      source: 'mobile_sdk',
      confidence: 1.0,
      provenance: { source: 'mobile_sdk', collectedAt: t0 + 500000, receivedAt: t0 + 500000 },
    });

    // 4. Agregação em Audience Profile
    const audienceProfile = await audienceAggregator.aggregateProfile(subjectId, t0 + 600000);
    assert.ok(audienceProfile !== null);
    assert.strictEqual(audienceProfile!.features.totalDwellSeconds, 500);

    // 5. Intent Bridge (Evidência: dwell >= 400s)
    intentBridge.registerRule({
      ruleId: 'rule_innovation_hub_immersion',
      signalType: PHYSICAL_INTENT_TAXONOMY.COMMERCIAL_HUB_HIGH_DWELL,
      minTotalDwellSeconds: 400,
      baseStrength: 0.95,
      baseConfidence: 0.95,
      decayHalfLifeHours: 72,
    });
    const bridgeSignals = await intentBridge.evaluateAndBridge(audienceProfile!, leadId, t0 + 600000);
    assert.strictEqual(bridgeSignals.length, 1);

    // 6. Adaptação Física para Lead Intent
    const adaptedSignal = intentAdapter.adapt(bridgeSignals[0]);
    assert.ok(adaptedSignal !== null);

    // 7. Ingestão no LeadIntentSignalsService (composição Física + Digital)
    await leadIntentService.capture({
      leadId,
      channel: adaptedSignal!.channel,
      weight: adaptedSignal!.weight,
      occurredAt: adaptedSignal!.occurredAt,
      metadata: adaptedSignal!.metadata,
    });

    const intentProfile = await leadIntentService.capture({
      leadId,
      channel: 'pricing_page_view',
      weight: 0.90,
      occurredAt: new Date(now),
    });

    assert.ok(intentProfile.score >= 70, `Score esperado alto, obtido: ${intentProfile.score}`);

    // 8. Lead Scoring Transacional Simulado
    const mockRepo = {
      lead: { id: leadId, score: 0 },
      interactions: [{ type: 'websiteVisit' }, { type: 'formSubmit' }],
      async findById() { return this.lead; },
      async getInteractions() { return this.interactions; },
      async updateScore(_: string, s: number) { this.lead.score = s; },
    };
    const scoringService = new LeadScoringService(mockRepo as any);
    const calculatedLeadScore = await scoringService.calculateScore(leadId); // 50 pts

    // 9. Construção da Evidência para Decisão
    const actionEvidences: ActionEvidence[] = [
      {
        source: 'physical',
        signalType: adaptedSignal!.signalType,
        strength: adaptedSignal!.weight,
        confidence: adaptedSignal!.metadata.rawConfidence,
        decay: 1.0,
        timestamp: adaptedSignal!.occurredAt.getTime(),
        provenance: {
          zoneId: flagshipZone.zoneId,
          evidenceRule: 'rule_innovation_hub_immersion',
          details: { dwellSeconds: 500 },
        },
      },
      {
        source: 'digital',
        signalType: 'pricing_page_view',
        strength: 0.90,
        confidence: 0.95,
        decay: 1.0,
        timestamp: now,
        provenance: { url: '/pricing' },
      },
    ];

    // 10. Geração da Decisão Operacional
    const decision = decisionEngine.evaluate({
      leadId,
      subjectId,
      intentScore: intentProfile.score,
      leadScore: calculatedLeadScore,
      evidence: actionEvidences,
      conversionVelocityHours: 8,
      intentTopChannels: intentProfile.topChannels,
      now,
    });

    assert.ok(decision !== null, 'Decisão operacional deve ser produzida');
    assert.strictEqual(decision!.priority, 'P0_CRITICAL');
    assert.strictEqual(decision!.urgency, 'IMMEDIATE');
    assert.strictEqual(decision!.slaHours, 1);
    assert.strictEqual(decision!.recommendedChannel, 'whatsapp');
    assert.strictEqual(decision!.executionMode, 'HUMAN_APPROVAL');
    assert.strictEqual(decision!.evidence.length, 2);

    // 11. Despacho através do Contrato Desacoplado
    const dispatchResult = await dispatcher.dispatch(decision!);
    assert.strictEqual(dispatchResult.dispatched, true);
    assert.strictEqual(dispatchResult.status, 'PENDING_APPROVAL');
    assert.strictEqual(dispatcher.getDispatchedHistory().length, 1);
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
