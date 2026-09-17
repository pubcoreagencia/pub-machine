# Signal / Capture Intelligence V0 — Especificação Técnica

**Módulo:** `src/signal/`  
**Status:** IMPLEMENTADO (V0 - Core Engine & Contratos Puros)  
**Data:** 2026-09-16  
**Repositório Canônico:** `pubcoreagencia/pub-machine`  

---

## 1. Visão Geral & Princípios

O módulo **Signal / Capture Intelligence V0** é a fundação da Camada 1 do PUB Machine. Seu propósito é ingerir sinais de presença e localização (físicos e digitais) de maneira:
1. **Provider-Agnostic:** Independente da tecnologia subjacente (GPS de smartphones, beacons BLE, probes Wi-Fi, sensores IoT ou web SDKs).
2. **Determinística:** Motores matemáticos puros sem efeitos colaterais ocultos ou dependências de bibliotecas de terceiros para cálculos geodésicos.
3. **Privacidade por Design (LGPD/GDPR):** Todo sujeito é identificado exclusivamente por identificadores pseudonimizados rotativos (`pseudonymousSubjectId`). Sinais sem consentimento explícito ativo são rejeitados na borda. Suporte imediato a expurgo total por `purge(subjectId)`.
4. **Desacoplada:** Persistência intermediada pela interface `ISignalStore`, permitindo execução em memória para testes e conectores futuros para Redis, Postgres ou Edge Workers.

---

## 2. Contratos Canônicos

### 2.1 GeoSignal (`src/signal/geo-signal.types.ts`)
```typescript
export interface GeoSignal {
  signalId: string;
  pseudonymousSubjectId: string; // NUNCA dados pessoais/PII
  coordinates: {
    latitude: number;   // -90..90
    longitude: number;  // -180..180
    altitude?: number;
  };
  accuracyMeters: number;        // Raio de incerteza do sinal
  timestamp: number;             // Timestamp da observação
  source: SignalSource;          // 'gps' | 'wifi' | 'ble' | 'beacon' | 'mobile_sdk' | 'hardware_sensor'
  confidence: number;            // 0.0 .. 1.0
  provenance: SignalProvenance;  // Provider, firmware, modelo, timestamps
  altitude?: number;
  beaconId?: string;
  metadata?: Record<string, unknown>;
}
```

### 2.2 PhysicalZone & Geometrias
Suporte nativo a duas formas geométricas puras:
* **Círculo (`CircularGeometry`):** Definido por centro (`Coordinates`) e raio em metros (`radiusMeters`). Cálculo geodésico exato via fórmula de Haversine.
* **Polígono (`PolygonGeometry`):** Definido por array de vértices (`Coordinates[]`). Avaliação pelo algoritmo Ray Casting (Even-Odd rule).

---

## 3. Máquina de Estados da Geofence (`GeofenceEngine`)

O motor de geofencing avalia deterministamente as transições de estado para cada par `(subjectId, zoneId)`:

```
                  ┌──────────────┐
                  │     OUT      │
                  └──────┬───────┘
                         │
                    ENTER│ (Primeiro sinal dentro da zona)
                         ▼
                  ┌──────────────┐
       ┌──────────┤    INSIDE    │◄─────────┐
       │          └──────┬───────┘          │
       │                 │                  │
       │   DWELL_THRESHOLD│ (Permanência >= threshold)
       │                 ▼                  │
       │          ┌──────────────┐          │
       │          │DWELL_EXCEEDED│──────────┘ (Sinais subsequentes)
       │          └──────┬───────┘
       │                 │
       └────────► EXIT  ◄┘ (Sinal fora da zona)
                   │
                   ▼
            (Retorna a OUT)
```

1. **ENTER:** Emitido no instante exato em que um sinal válido entra na geometria da zona.
2. **INSIDE:** Emitido a cada sinal subsequente dentro da zona.
3. **DWELL_THRESHOLD:** Emitido uma única vez por sessão quando o tempo contínuo dentro da zona ultrapassa `zone.dwellThresholdSeconds`.
4. **EXIT:** Emitido no instante em que o sinal subsequente é detectado fora da geometria da zona (ou disparado via `forceExit` por timeout).

---

## 4. Presence Intelligence (`PresenceIntelligenceService`)

Não confunde eventos brutos com inteligência analítica. O serviço computa métricas consolidadas:
* `firstSeenAt` / `lastSeenAt`: Histórico temporal da relação sujeito-zona.
* `totalVisits`: Contagem de visitas consolidadas (sessões de entrada e saída).
* `totalDwellSeconds`: Tempo acumulado de permanência.
* `averageDwellSeconds`: Tempo médio gasto por visita.
* `maxDwellSeconds`: Sessão mais longa registrada.
* `frequencyDays`: Frequência de retorno observada ao longo dos dias de janela.
* `recencyHours`: Horas transcorridas desde a última observação.

---

## 5. Governança e Privacidade LGPD (`PrivacyConsentMetadata`)

1. **Validação Prévia:** `SignalCaptureService.ingestGeoSignal()` valida obrigatoriamente se `store.getConsent(subjectId)` possui `status === 'GRANTED'` e se não está expirado.
2. **Rejeição Transparente:** Sinais sem consentimento retornam `{ accepted: false, reason: 'CONSENT_REQUIRED_OR_NOT_GRANTED' }` e não são persistidos nem avaliados em nenhuma zona.
3. **Purge Total:** `purgeSubject(subjectId)` remove atomicamente do `ISignalStore` e do `GeofenceEngine` todo e qualquer sinal bruto, evento, métrica de presença e consentimento armazenado.
