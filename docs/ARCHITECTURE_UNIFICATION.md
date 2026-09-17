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
2. **PUB Machine é o produto canônico:** Motor de inteligência, prospecção e geração de negócios da PUB Core Holding.
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

1. **CAPTURE (Signal / Capture Intelligence):** Captação de sinais físicos e digitais com proveniência e consentimento.
2. **UNDERSTAND (Audience Intelligence):** Enriquecimento contextual, decodificação de perfil, interesses e awareness.
3. **QUALIFY (Lead Intelligence):** Scoring ponderado, intenção cross-channel, decaimento temporal e ICP fit.
4. **PRIORITIZE (Opportunity Intelligence):** Ensemble scoring, previsão de velocidade e esteiras de SLA.
5. **CONVERT (Conversion & Execution):** Campanhas, touchpoints multicanal, automações e copy personalizada.
6. **MEASURE (Revenue Intelligence):** Tracking de conversão, velocidade de ciclo e acurácia de forecast.
7. **LEARN (Feedback Loop):** Rebalanceamento dinâmico de pesos, saturação logística e calibração de modelos.

---

## 3. Matriz Arquitetural de Unificação

Abaixo está o mapeamento exaustivo entre o conceito herdado de "PUB Server", os componentes correspondentes no **PUB Machine**, o status real auditado no código e os gaps técnicos identificados.

| Legacy Concept (PUB Server) | PUB Machine Component | Status Atual | Evidência no Código / Histórico | Gaps Técnicos Identificados |
| :--- | :--- | :--- | :--- | :--- |
| **Sinais de Localização / Presença Física** | `SignalCaptureService` / `GeoSignalService` | **ARQUITETURA-ALVO (GAP TOTAL)** | Nenhuma evidência de código de GPS, geofence ou presença física no repositório. | Ausência de ingestores de latitude/longitude, cálculo de polígonos/geofencing, detecção de dwell time (permanência/entrada/saída) e telemetria de sensores físicos. |
| **Sinais de Intenção Digital Multi-Canal** | `LeadIntentSignalsService` (`src/prospecting/lead-intent-signals.service.ts`) | **IMPLEMENTADO** | Modelagem de canais (`IntentChannel`: pricing page, demo, competitor mention, hiring, email, linkedin, webinars), agregação por half-life e decaimento temporal exponencial (`Math.pow(0.5, age/halfLife)`), saturação logística (`1 - exp(-score)`). | Persistência plugada em Redis/Postgres (atualmente buffer in-memory e cache Map); ingestão de webhook em tempo real. |
| **Enriquecimento B2B & Perfil de Audiência** | `LeadEnrichmentService` (`src/prospecting/lead-enrichment.service.ts`) | **IMPLEMENTADO** | Orquestração multi-provider (`EnrichmentProvider`), cache in-flight com TTL, identificação de tomador de decisão (seniority/C-level), tecnologias, faturamento e porte. | Conectar conectores reais (Clearbit, Apollo, Hunter, Receita Federal) além das interfaces; enriquecimento de pessoa física (B2C) e consentimento LGPD granular. |
| **Scoring Transacional & Interações** | `LeadScoringService` (`src/prospecting/lead-scoring.service.ts`) | **IMPLEMENTADO** | Cálculo de pontos por evento (`emailOpen`, `emailClick`, `websiteVisit`, `formSubmit`, `purchase`), teto logístico em 100 pontos. | Adicionar pesos dinâmicos configuráveis por tenant/campanha via banco e granularidade temporal. |
| **Previsão de Velocidade de Conversão** | `LeadConversionVelocityService` & `PredictiveDealVelocityService` (`src/prospecting/`) | **IMPLEMENTADO** | Matriz ponderada multissinal (tempo de resposta, taxa de inbound, sentimento, frequência, recência, intenção, maturidade de enriquecimento), predição de horas/dias para conversão e bandas de temperatura (`cold`, `warm`, `hot`, `blazing`). | Treinamento contínuo sobre dados históricos reais de fechamento (calibração bayesiana dos pesos W). |
| **Orquestrador de Priorização de Oportunidades** | `LeadPrioritizationOrchestrator` (`src/prospecting/lead-prioritization-orchestrator.service.ts`) | **IMPLEMENTADO** | Ensemble scoring ponderado (Fit 30%, Intent 35%, Velocity 25%, Enrichment 10%), categorização em SLA (`P0_CRITICAL` a `P4_COLD`), roteamento automático de canal (`whatsapp`, `phone`, `email`, `linkedin`, `sdr_queue`). | Filas de mensageria assíncrona (RabbitMQ/BullMQ/SQS) e dispatch automatizado de webhooks. |
| **Forecasting de Deal & Win Probability** | `DealProbabilityForecasting` (`src/prospecting/deal-probability-forecasting.service.ts`) | **IMPLEMENTADO** | Algoritmo determinístico TypeScript puro: ponderação de lead score, velocity, intent, stage progression, presença de concorrente, decisores engajados e baseline de mercado; cálculo de Expected Value (`dealValue * winProbability`). | Telemetria de CRM em closed loop para reajustar taxas de baseline automaticamente. |
| **Execução de Campanhas & Automação** | `ExecutionEngine` / `CampaignDispatcher` | **ARQUITETURA-ALVO (GAP PARCIAL)** | Motores de ciclo autônomo presentes em `src/autonomous/*Engine.ts` vinculados ao PUB DEV LOOP. | Conectores nativos de disparo de mensagens (WhatsApp API, SendGrid, LinkedIn Automation) e geração dinâmica de copy via LLM (PUB Neural). |
| **Closed Loop Feedback & Governança** | `AutonomousOptimization` (`src/autonomous/`) | **IMPLEMENTADO (EMBRIONÁRIO)** | Interfaces e rotinas de ciclo autônomo (`architectEngine.ts`, `machine-saas-automation-tech-leadEngine.ts`). | Telemetria de aprendizado de ponta a ponta que atualiza automaticamente as matrizes de peso (`CHANNEL_WEIGHTS`, `WEIGHTS`) após conclusão de negócio. |

---

## 4. Detalhamento dos Gaps: Camada 1 (Signal / Capture Intelligence)

A auditoria forense do repositório `pubcoreagencia/pub-machine` ratificou com precisão: **não existe implementação histórica de telemetria física ou geolocalização no repositório**.

Para transformar a visão conceitual do antigo PUB Server em realidade técnica dentro do PUB Machine, os seguintes módulos deverão ser arquitetados e implementados nas fases correspondentes:

### 4.1 Geo & Physical Signal Specification
1. **Schema de Sinal Físico:**
   - Coordenadas geográficas (`latitude`, `longitude`, `accuracy_meters`, `altitude`).
   - Identificadores de sinal pseudonimizados (`beacon_id`, `wifi_bssid_hash`, `device_ephemeral_token`).
   - Timestamp de captura com fuso horário e confiança da fonte (`confidence_score: 0..1`).
2. **Geofencing & Polygon Engine:**
   - Definição de zonas de interesse comercial (raios circulares e polígonos geoespaciais GeoJSON).
   - Detecção de transição de estado: `ENTER`, `INSIDE`, `DWELL_THRESHOLD_REACHED`, `EXIT`.
   - Métricas de permanência: tempo de residência contínuo, frequência de retorno e recência de visita.
3. **Privacidade e Compliance Legal (LGPD / GDPR):**
   - Consentimento explícito verificado (`opt_in_timestamp`, `purpose_id`, `legal_basis`).
   - Anonimização/pseudonimização obrigatória na borda (hashing de identificadores de hardware).
   - Purga e direito ao esquecimento (`purge(identifier)`), padrão já estabelecido no `LeadIntentSignalsService`.

---

## 5. Arquitetura Canônica das 6 Camadas do PUB Machine

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                PUB MACHINE                                │
├───────────────────────────────────────────────────────────────────────────┤
│ 1. SIGNAL / CAPTURE INTELLIGENCE                                          │
│    - Digital Signals: Web, Pricing, Email, Social, Hiring (IMPLEMENTADO)  │
│    - Physical Signals: Geo, Coordinates, Geofence, Dwell (ARQUITETURA-ALVO)│
├───────────────────────────────────────────────────────────────────────────┤
│ 2. AUDIENCE INTELLIGENCE                                                  │
│    - Multi-provider enrichment, Firmographics, Tech stack (IMPLEMENTADO) │
│    - ICP scoring, Persona segmentation, Awareness stage (IMPLEMENTADO)    │
├───────────────────────────────────────────────────────────────────────────┤
│ 3. LEAD INTELLIGENCE                                                      │
│    - Interaction Scoring (0-100), Thresholds (IMPLEMENTADO)               │
│    - Cross-channel temporal decay, Half-life normalization (IMPLEMENTADO) │
├───────────────────────────────────────────────────────────────────────────┤
│ 4. CONVERSION INTELLIGENCE                                                │
│    - Predictive velocity, Time-to-opportunity (IMPLEMENTADO)              │
│    - Deal win-probability forecasting, Expected value (IMPLEMENTADO)      │
│    - Lead prioritization orchestrator, SLA & Band routing (IMPLEMENTADO)  │
├───────────────────────────────────────────────────────────────────────────┤
│ 5. EXECUTION INTELLIGENCE                                                 │
│    - Autonomous process engines, PDL integration (IMPLEMENTADO)           │
│    - Channel connectors (WhatsApp, Email, CRM queues) (ARQUITETURA-ALVO)   │
├───────────────────────────────────────────────────────────────────────────┤
│ 6. CLOSED LOOP & CONTINUOUS LEARNING                                      │
│    - Feedback de conversão para calibração de pesos (ARQUITETURA-ALVO)     │
│    - Autonomous optimization cycles (IMPLEMENTADO)                         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Diretrizes para Engenharia & PRs Futuras
1. **Nomenclatura Única:** Qualquer referência a "PUB Server" em novos códigos, rotas, variáveis ou documentações é terminantemente proibida. O único nome aceito é `PUB Machine` (e o identificador `pub-machine`).
2. **Proibições de Mock Especulativo:** Nenhuma funcionalidade de GPS ou geofencing deve ser commitada como mock superficial sem arquitetura de ingestão e testes unitários reais.
3. **Padrão de Fechamento de Etapa:** Seguir estritamente a `PUB_GIT_CLOSURE_RULE.md` (`IMPLEMENT → TEST → COMMIT → PUSH → VERIFY REMOTE → DECLARE CLOSED`).
