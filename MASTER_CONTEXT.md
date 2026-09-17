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
RAW SIGNAL ──► AUDIENCE PROFILE ──► INTENT BRIDGE ──► LEAD INTENT ──► LEAD SCORING ──► CONVERSION
    ▲                                                                                     │
    │                                                                                     ▼
  CAPTURE   ◄───────────────  LEARN  ◄───────────────────────────  MEASURE  ◄──────────────┘
```

> **REGRA DE OURO:**  
> **RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD.**  
> Uma presença em uma zona física é apenas um sinal. Sinais agregados e enriquecidos formam um perfil comportamental de audiência. Evidências empíricas consistentes geram sinais de intenção via `IntentBridge`. O `PhysicalIntentAdapter` conecta essas intenções ao `LeadIntentSignalsService` sem criar um segundo motor de scoring.

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
   - Engine de segmentação declarativa e priorizada (`SegmentationEngine`).
   - Ponte explícita de intenção (`IntentBridge`) gerando `BridgeIntentSignal` exclusivamente com base em evidências consolidadas.

3. **PHYSICAL → LEAD INTENT INTEGRATION (V0 IMPLEMENTADO)**
   - `PhysicalIntentAdapter` conectando sinais da `IntentBridge` ao canal canônico `physical` do `LeadIntentSignalsService`.
   - Taxonomia unificada: `physical.commercial_hub_high_dwell`, `physical.frequent_engagement`, `physical.zone_affinity`.
   - Decaimento temporal exponencial com half-life de 72 horas.
   - Trilha de auditoria completa preservando proveniência e confiança.

4. **LEAD & CONVERSION INTELLIGENCE (IMPLEMENTADO)**
   - Scoring transacional com normalização logística (`LeadScoringService`).
   - Agregação de intenção cross-channel (digital + físico) (`LeadIntentSignalsService`).
   - Previsão determinística de velocidade e time-to-opportunity (`LeadConversionVelocityService`).
   - Forecasting de probabilidade de fechamento e expected value (`DealProbabilityForecasting`).
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
| **Integração: Physical → Lead Intent** | `IMPLEMENTADO (V0)` | `src/audience/physical-intent.adapter.ts` (8 testes verdes) | Webhooks em tempo real para cadências de outbound. |
| **Camada 3 & 4: Lead & Conversion Intelligence** | `IMPLEMENTADO` | `src/prospecting/` | Conectar conectores externos reais nas interfaces de enriquecimento. |
| **Camada 5: Execution Intelligence** | `IMPLEMENTADO (ESTRUTURAL)`| `src/autonomous/` | Integradores nativos de mensageria comercial. |
| **Camada 6: Closed Loop Learner** | `ARQUITETURA-ALVO` | Modelagem teórica | Calibração bayesiana automática de parâmetros. |

---

## 5. Diretrizes de Governança
- **Zero Fake Work:** Toda funcionalidade declarada implementada possui código e testes unitários automatizados (25 testes no total).
- **Git Stage Closure:** `IMPLEMENT → TEST → COMMIT → PUSH → VERIFY REMOTE → DECLARE CLOSED`.
