/**
 * Suíte Completa de Testes Unitários e de Integração
 * Módulo: Signal / Capture Intelligence V0
 * Cobertura exigida:
 * - ponto dentro de zona (círculo e polígono)
 * - ponto fora de zona
 * - transição ENTER
 * - transição INSIDE
 * - transição EXIT
 * - detecção de DWELL_THRESHOLD
 * - baixa precisão GPS (rejeição)
 * - coordenadas inválidas (rejeição)
 * - mudança de zona
 * - recorrência e múltiplas visitas
 * - purge (LGPD)
 * - ausência ou expiração de consentimento
 * - determinismo da engine
 */

import assert from 'node:assert';
import {
  CircularGeometry,
  Coordinates,
  GeoSignal,
  PhysicalZone,
  PolygonGeometry,
  PrivacyConsentMetadata,
} from '../src/signal/geo-signal.types';
import {
  calculateHaversineDistanceMeters,
  isPointInCircle,
  isPointInPolygon,
  isValidCoordinates,
} from '../src/signal/geo-math';
import { GeofenceEngine } from '../src/signal/geofence-engine';
import { MemorySignalStore } from '../src/signal/signal-store';
import { PresenceIntelligenceService } from '../src/signal/presence-intelligence.service';
import { SignalCaptureService } from '../src/signal/signal-capture.service';

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    testsFailed++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('SIGNAL / CAPTURE INTELLIGENCE V0 - TEST RUNNER');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. Geo-Math: Validação de Coordenadas
  // ----------------------------------------------------
  await runTest('Coord Validation: coordenadas válidas e inválidas', () => {
    assert.strictEqual(isValidCoordinates({ latitude: -22.9068, longitude: -43.1729 }), true);
    assert.strictEqual(isValidCoordinates({ latitude: 91, longitude: 0 }), false);
    assert.strictEqual(isValidCoordinates({ latitude: 0, longitude: 181 }), false);
    assert.strictEqual(isValidCoordinates({ latitude: NaN, longitude: -40 }), false);
    assert.strictEqual(isValidCoordinates(null as unknown as Coordinates), false);
  });

  // ----------------------------------------------------
  // 2. Geo-Math: Haversine Distance
  // ----------------------------------------------------
  await runTest('Haversine: cálculo de distância aproximada Rio-SP', () => {
    const rio: Coordinates = { latitude: -22.9068, longitude: -43.1729 };
    const sp: Coordinates = { latitude: -23.5505, longitude: -46.6333 };
    const dist = calculateHaversineDistanceMeters(rio, sp);
    // Aproximadamente 355-365 km
    assert.ok(dist > 350000 && dist < 370000, `Distância calculada foi ${dist}m`);
  });

  // ----------------------------------------------------
  // 3. Ponto dentro e fora de zona circular
  // ----------------------------------------------------
  await runTest('Geofence Circle: ponto dentro e ponto fora', () => {
    const center: Coordinates = { latitude: -22.9068, longitude: -43.1729 };
    const circle: CircularGeometry = { type: 'Circle', center, radiusMeters: 500 };

    // Ponto a ~50 metros
    const pointInside: Coordinates = { latitude: -22.9065, longitude: -43.1729 };
    assert.strictEqual(isPointInCircle(pointInside, circle), true);

    // Ponto a ~2km
    const pointOutside: Coordinates = { latitude: -22.9300, longitude: -43.1729 };
    assert.strictEqual(isPointInCircle(pointOutside, circle), false);
  });

  // ----------------------------------------------------
  // 4. Ponto dentro e fora de polígono
  // ----------------------------------------------------
  await runTest('Geofence Polygon: Ray-Casting dentro e fora', () => {
    const polygon: PolygonGeometry = {
      type: 'Polygon',
      coordinates: [
        { latitude: 0, longitude: 0 },
        { latitude: 10, longitude: 0 },
        { latitude: 10, longitude: 10 },
        { latitude: 0, longitude: 10 },
      ],
    };

    assert.strictEqual(isPointInPolygon({ latitude: 5, longitude: 5 }, polygon), true);
    assert.strictEqual(isPointInPolygon({ latitude: 15, longitude: 5 }, polygon), false);
    assert.strictEqual(isPointInPolygon({ latitude: -1, longitude: 5 }, polygon), false);
  });

  // ----------------------------------------------------
  // 5. GeofenceEngine: Transições ENTER, INSIDE, DWELL e EXIT
  // ----------------------------------------------------
  await runTest('GeofenceEngine: Ciclo completo ENTER -> INSIDE -> DWELL_THRESHOLD -> EXIT', () => {
    const engine = new GeofenceEngine();
    const zone: PhysicalZone = {
      zoneId: 'zone_flagship_pub',
      name: 'PUB Flagship Hub',
      active: true,
      dwellThresholdSeconds: 300, // 5 minutos
      geometry: {
        type: 'Circle',
        center: { latitude: -22.9068, longitude: -43.1729 },
        radiusMeters: 100,
      },
    };

    const subjectId = 'subj_anon_42';
    const t0 = 1770000000000;

    // Sinal 1: Fora da zona
    const sOutside: GeoSignal = {
      signalId: 'sig_1',
      pseudonymousSubjectId: subjectId,
      coordinates: { latitude: -22.9500, longitude: -43.1729 },
      accuracyMeters: 10,
      timestamp: t0,
      source: 'mobile_sdk',
      confidence: 0.95,
      provenance: { source: 'mobile_sdk', collectedAt: t0, receivedAt: t0 },
    };
    const ev1 = engine.processSignal(sOutside, zone);
    assert.strictEqual(ev1, null, 'Sinal fora não deve gerar evento inicial');

    // Sinal 2: Entra na zona (t0 + 10s)
    const sEnter: GeoSignal = {
      ...sOutside,
      signalId: 'sig_2',
      coordinates: { latitude: -22.9068, longitude: -43.1729 },
      timestamp: t0 + 10000,
    };
    const ev2 = engine.processSignal(sEnter, zone);
    assert.ok(ev2 !== null);
    assert.strictEqual(ev2!.type, 'ENTER');
    assert.strictEqual(ev2!.zoneId, 'zone_flagship_pub');
    assert.strictEqual(ev2!.dwellDurationSeconds, 0);

    // Sinal 3: Continua dentro (t0 + 60s) -> INSIDE
    const sInside1: GeoSignal = {
      ...sEnter,
      signalId: 'sig_3',
      timestamp: t0 + 60000,
    };
    const ev3 = engine.processSignal(sInside1, zone);
    assert.ok(ev3 !== null);
    assert.strictEqual(ev3!.type, 'INSIDE');
    assert.strictEqual(ev3!.dwellDurationSeconds, 50); // 60s - 10s

    // Sinal 4: Continua dentro até passar o DWELL_THRESHOLD (300s) -> t0 + 350s (dwell 340s)
    const sDwell: GeoSignal = {
      ...sEnter,
      signalId: 'sig_4',
      timestamp: t0 + 350000,
    };
    const ev4 = engine.processSignal(sDwell, zone);
    assert.ok(ev4 !== null);
    assert.strictEqual(ev4!.type, 'DWELL_THRESHOLD');
    assert.strictEqual(ev4!.dwellDurationSeconds, 340);

    // Sinal 5: Continua dentro após dwell threshold -> volta para INSIDE
    const sInside2: GeoSignal = {
      ...sEnter,
      signalId: 'sig_5',
      timestamp: t0 + 400000,
    };
    const ev5 = engine.processSignal(sInside2, zone);
    assert.ok(ev5 !== null);
    assert.strictEqual(ev5!.type, 'INSIDE');

    // Sinal 6: Sai da zona -> EXIT (t0 + 500s, dwell total 490s)
    const sExit: GeoSignal = {
      ...sOutside,
      signalId: 'sig_6',
      timestamp: t0 + 500000,
    };
    const ev6 = engine.processSignal(sExit, zone);
    assert.ok(ev6 !== null);
    assert.strictEqual(ev6!.type, 'EXIT');
    assert.strictEqual(ev6!.dwellDurationSeconds, 490);
  });

  // ----------------------------------------------------
  // 6. Filtros de Qualidade de Sinal: Imprecisão e Baixa Confiança
  // ----------------------------------------------------
  await runTest('Qualidade de Sinal: Rejeição de baixa acurácia e baixa confiança', () => {
    const engine = new GeofenceEngine({ maxAllowedAccuracyMeters: 50, minConfidenceThreshold: 0.5 });
    const zone: PhysicalZone = {
      zoneId: 'zone_test',
      name: 'Test Zone',
      active: true,
      dwellThresholdSeconds: 60,
      geometry: {
        type: 'Circle',
        center: { latitude: 0, longitude: 0 },
        radiusMeters: 500,
      },
    };

    // Ponto perfeitamente no centro, mas com acurácia ruim (120m > 50m)
    const badAccuracy: GeoSignal = {
      signalId: 'sig_bad_acc',
      pseudonymousSubjectId: 'subj_1',
      coordinates: { latitude: 0, longitude: 0 },
      accuracyMeters: 120,
      timestamp: 1000,
      source: 'gps',
      confidence: 0.9,
      provenance: { source: 'gps', collectedAt: 1000, receivedAt: 1000 },
    };
    assert.strictEqual(engine.processSignal(badAccuracy, zone), null);

    // Ponto perfeitamente no centro, mas com baixa confiança (0.1 < 0.5)
    const badConf: GeoSignal = {
      ...badAccuracy,
      accuracyMeters: 10,
      confidence: 0.1,
    };
    assert.strictEqual(engine.processSignal(badConf, zone), null);
  });

  // ----------------------------------------------------
  // 7. Mudança de Zona Concorrente
  // ----------------------------------------------------
  await runTest('Múltiplas Zonas: Detecção de transição e saída independente', () => {
    const engine = new GeofenceEngine();
    const zoneA: PhysicalZone = {
      zoneId: 'zone_A',
      name: 'Zona A',
      active: true,
      dwellThresholdSeconds: 60,
      geometry: { type: 'Circle', center: { latitude: 0, longitude: 0 }, radiusMeters: 50 },
    };
    const zoneB: PhysicalZone = {
      zoneId: 'zone_B',
      name: 'Zona B',
      active: true,
      dwellThresholdSeconds: 60,
      geometry: { type: 'Circle', center: { latitude: 1, longitude: 1 }, radiusMeters: 50 },
    };

    const subj = 'subj_traveler';
    // Entra na zona A
    const sA: GeoSignal = {
      signalId: 's1',
      pseudonymousSubjectId: subj,
      coordinates: { latitude: 0, longitude: 0 },
      accuracyMeters: 5,
      timestamp: 1000,
      source: 'gps',
      confidence: 1.0,
      provenance: { source: 'gps', collectedAt: 1000, receivedAt: 1000 },
    };
    const evA1 = engine.processSignal(sA, zoneA);
    const evB1 = engine.processSignal(sA, zoneB);
    assert.strictEqual(evA1?.type, 'ENTER');
    assert.strictEqual(evB1, null);

    // Move-se direto para a zona B
    const sB: GeoSignal = {
      ...sA,
      signalId: 's2',
      coordinates: { latitude: 1, longitude: 1 },
      timestamp: 2000,
    };
    const evA2 = engine.processSignal(sB, zoneA);
    const evB2 = engine.processSignal(sB, zoneB);
    assert.strictEqual(evA2?.type, 'EXIT');
    assert.strictEqual(evB2?.type, 'ENTER');
  });

  // ----------------------------------------------------
  // 8. Presence Intelligence: Recorrência e Múltiplas Visitas
  // ----------------------------------------------------
  await runTest('PresenceIntelligence: Recorrência, visitas e tempo médio de permanência', () => {
    const presenceService = new PresenceIntelligenceService();
    const zoneId = 'pub_lounge';
    const subj = 'subj_regular';

    // Visita 1: ENTER (1000) e EXIT (1000 + 60s)
    let metrics = presenceService.updateMetrics(null, {
      eventId: 'e1',
      zoneId,
      pseudonymousSubjectId: subj,
      type: 'ENTER',
      timestamp: 1000,
      dwellDurationSeconds: 0,
      accuracyMeters: 5,
      signalConfidence: 1.0,
      coordinates: { latitude: 0, longitude: 0 },
    });
    assert.strictEqual(metrics.totalVisits, 1);
    assert.strictEqual(metrics.isCurrentlyInside, true);

    metrics = presenceService.updateMetrics(metrics, {
      eventId: 'e2',
      zoneId,
      pseudonymousSubjectId: subj,
      type: 'EXIT',
      timestamp: 61000,
      dwellDurationSeconds: 60,
      accuracyMeters: 5,
      signalConfidence: 1.0,
      coordinates: { latitude: 0.1, longitude: 0.1 },
    });
    assert.strictEqual(metrics.totalVisits, 1);
    assert.strictEqual(metrics.isCurrentlyInside, false);
    assert.strictEqual(metrics.totalDwellSeconds, 60);
    assert.strictEqual(metrics.averageDwellSeconds, 60);

    // Visita 2: No dia seguinte (+86400s), Dwell de 120s
    metrics = presenceService.updateMetrics(metrics, {
      eventId: 'e3',
      zoneId,
      pseudonymousSubjectId: subj,
      type: 'ENTER',
      timestamp: 61000 + 86400000,
      dwellDurationSeconds: 0,
      accuracyMeters: 5,
      signalConfidence: 1.0,
      coordinates: { latitude: 0, longitude: 0 },
    });
    assert.strictEqual(metrics.totalVisits, 2);
    assert.strictEqual(metrics.isCurrentlyInside, true);

    metrics = presenceService.updateMetrics(metrics, {
      eventId: 'e4',
      zoneId,
      pseudonymousSubjectId: subj,
      type: 'EXIT',
      timestamp: 61000 + 86400000 + 120000,
      dwellDurationSeconds: 120,
      accuracyMeters: 5,
      signalConfidence: 1.0,
      coordinates: { latitude: 0.1, longitude: 0.1 },
    });
    assert.strictEqual(metrics.totalVisits, 2);
    assert.strictEqual(metrics.totalDwellSeconds, 180);
    assert.strictEqual(metrics.averageDwellSeconds, 90);
    assert.strictEqual(metrics.maxDwellSeconds, 120);
  });

  // ----------------------------------------------------
  // 9. Privacidade & LGPD: Verificação de Consentimento
  // ----------------------------------------------------
  await runTest('Privacidade LGPD: Bloqueio de sinais sem consentimento explícito', async () => {
    const store = new MemorySignalStore();
    const service = new SignalCaptureService(store);

    const zone: PhysicalZone = {
      zoneId: 'secure_zone',
      name: 'Secure Zone',
      active: true,
      dwellThresholdSeconds: 60,
      geometry: { type: 'Circle', center: { latitude: 0, longitude: 0 }, radiusMeters: 100 },
    };
    await service.registerZone(zone);

    const signalNoConsent: GeoSignal = {
      signalId: 'sig_unauth',
      pseudonymousSubjectId: 'subj_no_consent',
      coordinates: { latitude: 0, longitude: 0 },
      accuracyMeters: 5,
      timestamp: Date.now(),
      source: 'gps',
      confidence: 1.0,
      provenance: { source: 'gps', collectedAt: Date.now(), receivedAt: Date.now() },
    };

    // Deve ser rejeitado por falta de consentimento
    const res1 = await service.ingestGeoSignal(signalNoConsent);
    assert.strictEqual(res1.accepted, false);
    assert.strictEqual(res1.reason, 'CONSENT_REQUIRED_OR_NOT_GRANTED');

    // Conceder consentimento e re-testar
    const consent: PrivacyConsentMetadata = {
      subjectId: 'subj_no_consent',
      status: 'GRANTED',
      purpose: 'presence_intelligence',
      legalBasis: 'CONSENT',
      grantedAt: Date.now(),
      retentionDays: 30,
    };
    await service.registerConsent(consent);

    const res2 = await service.ingestGeoSignal(signalNoConsent);
    assert.strictEqual(res2.accepted, true);
    assert.strictEqual(res2.triggeredEvents.length, 1);
    assert.strictEqual(res2.triggeredEvents[0].type, 'ENTER');
  });

  // ----------------------------------------------------
  // 10. Privacidade & LGPD: Purge Completo
  // ----------------------------------------------------
  await runTest('Privacidade LGPD: purgeSubject remove todos os rastros', async () => {
    const store = new MemorySignalStore();
    const service = new SignalCaptureService(store);
    const subj = 'subj_to_purge';

    await service.registerConsent({
      subjectId: subj,
      status: 'GRANTED',
      purpose: 'test',
      legalBasis: 'CONSENT',
      retentionDays: 7,
    });

    const zone: PhysicalZone = {
      zoneId: 'z_test',
      name: 'Zone Test',
      active: true,
      dwellThresholdSeconds: 10,
      geometry: { type: 'Circle', center: { latitude: 0, longitude: 0 }, radiusMeters: 50 },
    };
    await service.registerZone(zone);

    await service.ingestGeoSignal({
      signalId: 's_purge',
      pseudonymousSubjectId: subj,
      coordinates: { latitude: 0, longitude: 0 },
      accuracyMeters: 5,
      timestamp: Date.now(),
      source: 'gps',
      confidence: 1.0,
      provenance: { source: 'gps', collectedAt: Date.now(), receivedAt: Date.now() },
    });

    // Validar presença de dados
    const signalsBefore = await store.getSignalsBySubject(subj);
    assert.strictEqual(signalsBefore.length, 1);
    const consentBefore = await store.getConsent(subj);
    assert.ok(consentBefore !== null);

    // Executar purge
    const count = await service.purgeSubject(subj);
    assert.ok(count >= 3, `Deveria ter expurgado múltiplos registros, expurgou ${count}`);

    // Validar ausência absoluta
    const signalsAfter = await store.getSignalsBySubject(subj);
    assert.strictEqual(signalsAfter.length, 0);
    const consentAfter = await store.getConsent(subj);
    assert.strictEqual(consentAfter, null);
    const metricsAfter = await store.getPresenceMetrics(subj, 'z_test');
    assert.strictEqual(metricsAfter, null);
  });

  // ----------------------------------------------------
  // 11. Determinismo da Engine
  // ----------------------------------------------------
  await runTest('Determinismo: Dois engines com a mesma sequência de sinais geram saída idêntica', () => {
    const e1 = new GeofenceEngine();
    const e2 = new GeofenceEngine();

    const zone: PhysicalZone = {
      zoneId: 'z_det',
      name: 'Deterministic Zone',
      active: true,
      dwellThresholdSeconds: 30,
      geometry: { type: 'Circle', center: { latitude: 10, longitude: 20 }, radiusMeters: 100 },
    };

    const signals: GeoSignal[] = [
      {
        signalId: 's1',
        pseudonymousSubjectId: 'subj_det',
        coordinates: { latitude: 10, longitude: 20 },
        accuracyMeters: 5,
        timestamp: 1000,
        source: 'gps',
        confidence: 1.0,
        provenance: { source: 'gps', collectedAt: 1000, receivedAt: 1000 },
      },
      {
        signalId: 's2',
        pseudonymousSubjectId: 'subj_det',
        coordinates: { latitude: 10, longitude: 20 },
        accuracyMeters: 5,
        timestamp: 40000,
        source: 'gps',
        confidence: 1.0,
        provenance: { source: 'gps', collectedAt: 40000, receivedAt: 40000 },
      },
      {
        signalId: 's3',
        pseudonymousSubjectId: 'subj_det',
        coordinates: { latitude: 10.05, longitude: 20 },
        accuracyMeters: 5,
        timestamp: 50000,
        source: 'gps',
        confidence: 1.0,
        provenance: { source: 'gps', collectedAt: 50000, receivedAt: 50000 },
      },
    ];

    for (const sig of signals) {
      const res1 = e1.processSignal(sig, zone);
      const res2 = e2.processSignal(sig, zone);
      assert.strictEqual(res1?.type, res2?.type);
      assert.strictEqual(res1?.dwellDurationSeconds, res2?.dwellDurationSeconds);
    }
  });

  console.log('\n====================================================');
  console.log(`RESUMO DOS TESTES: ${testsPassed} PASSOU | ${testsFailed} FALHOU`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
