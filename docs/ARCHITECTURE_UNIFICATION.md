# ARQUITETURA DE UNIFICAÇÃO CANÔNICA: PUB SERVER → PUB MACHINE

**Identificador Canônico do Repositório:** `pubcoreagencia/pub-machine`  
**Holding:** PUB Core Holding  
**Data da Consolidação:** 2026-09-16  
**Status Arquitetural:** CANÔNICO & VINCULANTE  

---

## 1. Diretriz Canônica & Linhagem Histórica

### 1.1 Regra de Unificação
> **PUB SERVER = PUB MACHINE**  
> "PUB Server" é um nome e conceito histórico da arquitetura da PUB. **Não existe nem existirá** um produto, repositório ou arquitetura independente chamada PUB Server. O nome canônico presente e futuro é exclusivamente **PUB MACHINE**.

### 1.2 Princípios Vinculantes
1. **PUB Server não é um segundo produto:** É a linhagem conceitual do PUB Machine.
2. **PUB Machine é o produto canônico:** Motor de inteligência operacional, prospecção e geração de negócios da PUB Core Holding.
3. **Sem bifurcações (No Forks):** Proibida a criação de repositórios paralelos (`pub-server`), duplicação de microsserviços ou forks conceituais.
4. **Preservação de Histórico:** O histórico conceitual é respeitado e documentado como ancestral direto, integrando organicamente toda a visão ao PUB Machine.
5. **Zero Fake Work & Integridade da Auditoria:** Declarar como **IMPLEMENTADO** exclusivamente o que o código-fonte e o histórico Git comprovam. As capacidades concebidas ainda não codificadas são categorizadas estritamente como **ARQUITETURA-ALVO / GAP**.

---

## 2. O Ciclo Operacional Canônico (Closed Loop)

O fluxo contínuo de inteligência do PUB Machine opera sob o rigoroso pipeline de causalidade:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CLOSED LOOP                                      │
│                                                                                        │
│   SIGNAL ──► AUDIENCE INTELLIGENCE ──► INTENT ──► LEAD INTELLIGENCE ──► CONVERSION     │
│     ▲                                                                        │         │
│     │                                                                        ▼         │
│  CAPTURE  ◄───────────────  LEARN  ◄─────────────  MEASURE  ◄────────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> **REGRA FUNDAMENTAL:**  
> **RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD.**  
> Uma presença em geofence não cria um lead automaticamente. A presença gera um sinal; múltiplos sinais agregados geram inteligência de audiência; evidências consistentes geram sinais de intenção; e intenções qualificadas alimentam oportunidades de negócio.

---

## 3. Matriz Arquitetural de Unificação & Status

| Legacy Concept (PUB Server) | PUB Machine Component | Status Atual | Evidência no Código / Testes | Gaps Técnicos Restantes |
| :--- | :--- | :--- | :--- | :--- |
| **Sinais de Localização / Presença Física** | `SignalCaptureService`, `GeofenceEngine` (`src/signal/`) | **IMPLEMENTADO (V0)** | Motor puro de Geofence (Haversine + Ray Casting), transições ENTER/INSIDE/DWELL/EXIT, métricas de permanência (`tests/signal-capture.test.ts`). | Adapters de produção (Redis/Postgres) e conectores de antenas BLE/Gateways. |
| **Inteligência de Audiência & Segmentação** | `AudienceSignalAggregator`, `SegmentationEngine`, `IntentBridge` (`src/audience/`) | **IMPLEMENTADO (V0)** | Extração determinística de features, segmentação declarativa, store desacoplado e ponte de intenção (`tests/audience-intelligence.test.ts`). | Persistência persistente em banco e enriquecimento B2C contextual com consentimento granular. |
| **Sinais de Intenção Digital Multi-Canal** | `LeadIntentSignalsService` (`src/prospecting/lead-intent-signals.service.ts`) | **IMPLEMENTADO** | Modelagem cross-channel, decaimento temporal exponencial e saturação logística. | Persistir buffer in-memory em Redis/Postgres; plugar webhooks em tempo real. |
| **Enriquecimento B2B & Perfil de Lead** | `LeadEnrichmentService` (`src/prospecting/lead-enrichment.service.ts`) | **IMPLEMENTADO** | Multi-provider orchestration, cache TTL, identificação de tomadores de decisão e porte. | Integrar conectores externos (Clearbit, Apollo, CNPJ) além da interface. |
| **Scoring de Interações & Leads** | `LeadScoringService` (`src/prospecting/lead-scoring.service.ts`) | **IMPLEMENTADO** | Cálculo determinístico de pontos por evento com teto logístico em 100 pontos. | Configuração dinâmica de pesos por tenant/campanha via banco. |
| **Previsão de Velocidade de Conversão** | `LeadConversionVelocityService` & `PredictiveDealVelocityService` | **IMPLEMENTADO** | Matriz ponderada de velocidade multissinal e predição de time-to-opportunity. | Treinamento contínuo sobre dados históricos reais de fechamento. |
| **Orquestrador de Priorização de Oportunidades** | `LeadPrioritizationOrchestrator` (`src/prospecting/`) | **IMPLEMENTADO** | Ensemble scoring ponderado, categorização por SLA (`P0_CRITICAL` a `P4_COLD`) e roteamento multicanal. | Filas assíncronas (BullMQ/RabbitMQ) e webhooks de disparo. |
| **Forecasting de Deal & Win Probability** | `DealProbabilityForecasting` (`src/prospecting/`) | **IMPLEMENTADO** | Ponderação de lead score, velocity, intent e cálculo de Expected Value em BRL. | Telemetria contínua do CRM para calibração automática de baselines. |
| **Execução de Campanhas & Automação** | `ExecutionEngines` (`src/autonomous/`) | **IMPLEMENTADO (ESTRUTURAL)** | Motores de ciclo autônomo vinculados ao PUB DEV LOOP. | Conectores nativos de disparo (WhatsApp API, SendGrid, LinkedIn) e copy via PUB Neural. |
| **Closed Loop Feedback & Governança** | `AutonomousOptimization` (`src/autonomous/`) | **IMPLEMENTADO (EMBRIONÁRIO)** | Interfaces e rotinas de ciclo autônomo. | Realimentação automática de desfecho comercial calibrando matrizes de peso. |

---

## 4. Documentações Complementares
* [docs/SIGNAL_INTELLIGENCE.md](./SIGNAL_INTELLIGENCE.md) — Camada 1: Captura e Geofencing determinístico.
* [docs/AUDIENCE_INTELLIGENCE.md](./AUDIENCE_INTELLIGENCE.md) — Camada 2: Features comportamentais, segmentação e ponte de intenção.
* [PUB_GIT_CLOSURE_RULE.md](../PUB_GIT_CLOSURE_RULE.md) — Regra mandatória de fechamento de estágios Git.
