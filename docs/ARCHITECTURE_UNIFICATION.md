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

O PUB Machine não é concebido como um CRM passivo ou mero calculador de lead scoring. Trata-se de um **sistema de inteligência operacional contínua** orientado a loop fechado:

```
┌────────────────────────────────────────────────────────┐
│                      CLOSED LOOP                       │
│                                                        │
│   CAPTURE  ──►  UNDERSTAND  ──►  QUALIFY  ──► PRIORITIZE│
│      ▲                                           │     │
│      │                                           ▼     │
│   CAPTURE  ◄──   LEARN   ◄──  MEASURE  ◄───  CONVERT   │
└────────────────────────────────────────────────────────┘
```

1. **CAPTURE (Signal / Capture Intelligence):** Captação de sinais físicos (geolocalização, geofence, beacons) e digitais (web, intenção, e-mail) com proveniência e consentimento.
2. **UNDERSTAND (Audience Intelligence):** Enriquecimento contextual, decodificação de perfil, interesses e awareness.
3. **QUALIFY (Lead Intelligence):** Scoring ponderado, intenção cross-channel, decaimento temporal e ICP fit.
4. **PRIORITIZE (Opportunity Intelligence):** Ensemble scoring, previsão de velocidade e esteiras de SLA.
5. **CONVERT (Conversion & Execution):** Campanhas, touchpoints multicanal, automações e copy personalizada.
6. **MEASURE (Revenue Intelligence):** Tracking de conversão, velocidade de ciclo e acurácia de forecast.
7. **LEARN (Feedback Loop):** Rebalanceamento dinâmico de pesos, saturação logística e calibração de modelos.

---

## 3. Matriz Arquitetural de Unificação & Status

Abaixo está o mapeamento exaustivo entre o conceito herdado de "PUB Server", os componentes correspondentes no **PUB Machine**, o status real auditado no código e os gaps técnicos identificados.

| Legacy Concept (PUB Server) | PUB Machine Component | Status Atual | Evidência no Código / Testes | Gaps Técnicos Restantes |
| :--- | :--- | :--- | :--- | :--- |
| **Sinais de Localização / Presença Física** | `SignalCaptureService`, `GeofenceEngine`, `PresenceIntelligenceService` (`src/signal/`) | **IMPLEMENTADO (V0)** | Motor determinístico de Geofence (Haversine + Ray Casting), transições ENTER/INSIDE/DWELL/EXIT, cálculo de permanência e testes 100% verdes (`tests/signal-capture.test.ts`). | Adapters de produção de persistência (Redis / Postgres) e conectores de hardware físico real (antenas BLE / Mobile SDK push). |
| **Sinais de Intenção Digital Multi-Canal** | `LeadIntentSignalsService` (`src/prospecting/lead-intent-signals.service.ts`) | **IMPLEMENTADO** | Modelagem de canais (`IntentChannel`: pricing page, demo, competitor mention, hiring, email, linkedin, webinars), agregação por half-life e decaimento temporal exponencial (`Math.pow(0.5, age/halfLife)`), saturação logística (`1 - exp(-score)`). | Persistência plugada em Redis/Postgres (atualmente buffer in-memory e cache Map); ingestão de webhook em tempo real. |
| **Enriquecimento B2B & Perfil de Audiência** | `LeadEnrichmentService` (`src/prospecting/lead-enrichment.service.ts`) | **IMPLEMENTADO** | Orquestração multi-provider (`EnrichmentProvider`), cache in-flight com TTL, identificação de tomador de decisão (seniority/C-level), tecnologias, faturamento e porte. | Conectar conectores reais (Clearbit, Apollo, Hunter, Receita Federal) além das interfaces; enriquecimento de pessoa física (B2C) e consentimento LGPD granular. |
| **Scoring Transacional & Interações** | `LeadScoringService` (`src/prospecting/lead-scoring.service.ts`) | **IMPLEMENTADO** | Cálculo de pontos por evento (`emailOpen`, `emailClick`, `websiteVisit`, `formSubmit`, `purchase`), teto logístico em 100 pontos. | Adicionar pesos dinâmicos configuráveis por tenant/campanha via banco e granularidade temporal. |
| **Previsão de Velocidade de Conversão** | `LeadConversionVelocityService` & `PredictiveDealVelocityService` (`src/prospecting/`) | **IMPLEMENTADO** | Matriz ponderada multissinal (tempo de resposta, taxa de inbound, sentimento, frequência, recência, intenção, maturidade de enriquecimento), predição de horas/dias para conversão e bandas de temperatura (`cold`, `warm`, `hot`, `blazing`). | Treinamento contínuo sobre dados históricos reais de fechamento (calibração bayesiana dos pesos W). |
| **Orquestrador de Priorização de Oportunidades** | `LeadPrioritizationOrchestrator` (`src/prospecting/lead-prioritization-orchestrator.service.ts`) | **IMPLEMENTADO** | Ensemble scoring ponderado (Fit 30%, Intent 35%, Velocity 25%, Enrichment 10%), categorização em SLA (`P0_CRITICAL` a `P4_COLD`), roteamento automático de canal (`whatsapp`, `phone`, `email`, `linkedin`, `sdr_queue`). | Filas de mensageria assíncrona (RabbitMQ/BullMQ/SQS) e dispatch automatizado de webhooks. |
| **Forecasting de Deal & Win Probability** | `DealProbabilityForecasting` (`src/prospecting/deal-probability-forecasting.service.ts`) | **IMPLEMENTADO** | Algoritmo determinístico TypeScript puro: ponderação de lead score, velocity, intent, stage progression, presença de concorrente, decisores engajados e baseline de mercado; cálculo de Expected Value (`dealValue * winProbability`). | Telemetria de CRM em closed loop para reajustar taxas de baseline automaticamente. |
| **Execução de Campanhas & Automação** | `ExecutionEngine` / `CampaignDispatcher` | **ARQUITETURA-ALVO (GAP PARCIAL)** | Motores de ciclo autônomo presentes em `src/autonomous/*Engine.ts` vinculados ao PUB DEV LOOP. | Conectores nativos de disparo de mensagens (WhatsApp API, SendGrid, LinkedIn Automation) e geração dinâmica de copy via LLM (PUB Neural). |
| **Closed Loop Feedback & Governança** | `AutonomousOptimization` (`src/autonomous/`) | **IMPLEMENTADO (EMBRIONÁRIO)** | Interfaces e rotinas de ciclo autônomo (`architectEngine.ts`, `machine-saas-automation-tech-leadEngine.ts`). | Telemetria de aprendizado de ponta a ponta que atualiza automaticamente as matrizes de peso (`CHANNEL_WEIGHTS`, `WEIGHTS`) após conclusão de negócio. |

---

## 4. Camada 1: Signal / Capture Intelligence V0 (Implementação)

A fundação do subsistema de captura e inteligência de sinais foi implementada com sucesso no pacote `src/signal/`:

1. **Contratos Canônicos Provider-Agnostic (`geo-signal.types.ts`):** `GeoSignal`, `SignalProvenance`, `PhysicalZone`, `GeofenceEvent` e `PresenceMetrics`.
2. **Matemática Espacial Pura (`geo-math.ts`):** Distância geodésica exata via fórmula de Haversine e algoritmo Ray Casting para polígonos arbitrários.
3. **Engine Determinística (`geofence-engine.ts`):** Emissão determinística de `ENTER`, `INSIDE`, `DWELL_THRESHOLD` e `EXIT` com descarte de baixa acurácia.
4. **Inteligência de Presença (`presence-intelligence.service.ts`):** Métricas consolidadas de visitas, recência, frequência e permanência média.
5. **Persistência Desacoplada (`signal-store.ts`):** Interface `ISignalStore` e implementação `MemorySignalStore` para testes isolados.
6. **Privacidade e LGPD:** Bloqueio mandatório de sinais sem consentimento (`CONSENT_REQUIRED_OR_NOT_GRANTED`) e rotina irrevogável de expurgo via `purgeSubject(subjectId)`.

Consulte [docs/SIGNAL_INTELLIGENCE.md](./SIGNAL_INTELLIGENCE.md) para a especificação técnica detalhada.

---

## 5. Diretrizes para Engenharia & PRs Futuras
1. **Nomenclatura Única:** O único nome canônico é `PUB Machine` (`pub-machine`).
2. **Integração Progressiva:** As camadas subsequentes (Audience, Lead, Conversion) consumirão a inteligência derivada de presença calculada pela Camada 1.
3. **Padrão de Fechamento de Etapa:** Seguir estritamente a `PUB_GIT_CLOSURE_RULE.md` (`IMPLEMENT → TEST → COMMIT → PUSH → VERIFY REMOTE → DECLARE CLOSED`).
