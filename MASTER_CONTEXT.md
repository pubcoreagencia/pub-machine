# MASTER CONTEXT — PUB Machine

**Identificador Canônico:** `pub-machine`  
**Vertical:** Tecnologia / Inteligência Comercial e Operacional  
**Holding:** PUB Core Holding  
**Status de Maturidade:** EM DEV / GITHUB  
**Nível de Prioridade:** MÁXIMA  
**Data de Alinhamento & Consolidação:** 2026-09-16  
**Linhagem Arquitetural:** PUB Server (linhagem histórica unificada) → **PUB Machine** (canônico)

---

## 1. Diretriz Canônica: Unificação PUB Server → PUB Machine

> **PUB SERVER = PUB MACHINE**  
> "PUB Server" é um nome/conceito histórico da arquitetura da PUB. **Não existe e não deve existir um produto, repositório ou arquitetura independente chamada PUB Server.**  
> O nome canônico, presente e futuro, é exclusivamente:  
> **PUB MACHINE** (`pubcoreagencia/pub-machine`)

O PUB Machine é o **motor de inteligência, prospecção e geração de negócios da PUB**, incorporando progressivamente toda a visão e arquitetura concebidas sob o antigo conceito "PUB Server".

---

## 2. Visão Executiva & Propósito (Closed Loop)

```
SIGNAL ──► AUDIENCE INTELLIGENCE ──► INTENT ──► LEAD INTELLIGENCE ──► CONVERSION
  ▲                                                                        │
  │                                                                        ▼
CAPTURE  ◄───────────────  LEARN  ◄─────────────  MEASURE  ◄────────────────┘
```

> **REGRA DE OURO:**  
> **RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD.**  
> A presença em uma zona física ou digital não caracteriza imediatamente um lead. Sinais brutos são agregados em perfis comportamentais de audiência; sob evidências consistentes, a `IntentBridge` gera sinais de intenção; e apenas intenções qualificadas alimentam oportunidades comerciais.

---

## 3. Arquitetura Canônica em 6 Camadas

1. **SIGNAL / CAPTURE INTELLIGENCE (V0 IMPLEMENTADO)**
   - Captura provider-agnostic (GPS, beacons BLE, Wi-Fi, sensores físicos e digitais).
   - Engine determinística com matemática espacial pura (Haversine e Ray-Casting).
   - Transições de estado: `ENTER`, `INSIDE`, `DWELL_THRESHOLD`, `EXIT`.
   - Privacy by Design: identificação estritamente pseudonimizada e bloqueio por consentimento LGPD.

2. **AUDIENCE INTELLIGENCE (V0 IMPLEMENTADO)**
   - Agregação contínua de telemetria em perfis de audiência pseudonimizados (`AudienceProfile`).
   - Extração de features comportamentais determinísticas: frequência diária, intensidade de dwell, recência e afinidade de zonas.
   - Metadados mandatórios de inferência: `confidence`, `confidenceBand`, `provenance`, `timestamp` e `version`.
   - Engine de segmentação declarativa e priorizada (`SegmentationEngine`).
   - Ponte explícita de intenção (`IntentBridge`) gerando `BridgeIntentSignal` exclusivamente com base em evidências consolidadas.

3. **LEAD INTELLIGENCE (IMPLEMENTADO)**
   - Scoring transacional com normalização logística (`LeadScoringService`).
   - Agregação de intenção cross-channel com decaimento exponencial (`LeadIntentSignalsService`).
   - Enriquecimento B2B multi-provedor (`LeadEnrichmentService`).

4. **CONVERSION INTELLIGENCE (IMPLEMENTADO)**
   - Previsão de velocidade de conversão (`LeadConversionVelocityService` e `PredictiveDealVelocityService`).
   - Forecasting determinístico de probabilidade de ganho e expected value (`DealProbabilityForecasting`).
   - Orquestração de priorização por SLA (`LeadPrioritizationOrchestrator`).

5. **EXECUTION INTELLIGENCE (EM ANDAMENTO / ESTRUTURAL)**
   - Engines de ciclo autônomo vinculados ao PUB DEV LOOP (`architectEngine.ts`, `machine-saas-automation-tech-leadEngine.ts`).

6. **CLOSED LOOP & CONTINUOUS LEARNING (ARQUITETURA-ALVO / EMBRIONÁRIO)**
   - Calibração dinâmica de pesos com base no desfecho real de negócios.

---

## 4. Matriz de Auditoria e Status Técnico

| Camada / Componente | Status Real | Evidência no Repositório | Gaps Restantes |
| :--- | :--- | :--- | :--- |
| **Camada 1: Signal / Capture Intelligence** | `IMPLEMENTADO (V0)` | `src/signal/` (11 testes verdes) | Conectores de hardware BLE e adapters persistentes em banco. |
| **Camada 2: Audience Intelligence** | `IMPLEMENTADO (V0)` | `src/audience/` (6 testes verdes) | Adaptador de persistência relacional/Redis para produção. |
| **Camada 3: Lead Intelligence** | `IMPLEMENTADO` | `src/prospecting/` | Conectar conectores externos reais nas interfaces de enriquecimento. |
| **Camada 4: Conversion Intelligence** | `IMPLEMENTADO` | `src/prospecting/` | Filas assíncronas para despacho de oportunidades. |
| **Camada 5: Execution Intelligence** | `IMPLEMENTADO (ESTRUTURAL)`| `src/autonomous/` | Integradores nativos de mensageria comercial. |
| **Camada 6: Closed Loop Learner** | `ARQUITETURA-ALVO` | Modelagem teórica | Calibração bayesiana automática de parâmetros. |

---

## 5. Diretrizes de Governança
- **Zero Fake Work:** Toda funcionalidade declarada implementada possui código e testes unitários automatizados.
- **Git Stage Closure:** `IMPLEMENT → TEST → COMMIT → PUSH → VERIFY REMOTE → DECLARE CLOSED`.
