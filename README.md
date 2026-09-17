# PUB Machine

> **Diretriz Canônica da PUB Core Holding:**  
> **PUB SERVER = PUB MACHINE**  
> *"PUB Server" é a linhagem conceitual histórica do PUB Machine. Não existe produto, arquitetura ou repositório independente chamado PUB Server. O nome canônico, presente e futuro, é **PUB MACHINE**.*

O **PUB Machine** é o motor de inteligência operacional, prospecção e geração de negócios da holding PUB, unificando a captura de sinais físicos e digitais, enriquecimento de audiência, qualificação de leads, previsão preditiva de conversão e automação de fechamento comercial em regime de **Closed Loop**.

---

## 🎯 Pipeline de Inteligência Causal

```
SIGNAL ──► AUDIENCE INTELLIGENCE ──► INTENT ──► LEAD INTELLIGENCE ──► CONVERSION
```

> **REGRA DE OURO:**  
> **RAW SIGNAL ≠ AUDIENCE PROFILE ≠ INTENT ≠ LEAD.**  
> Uma presença em uma zona física é apenas um sinal. Sinais agregados e enriquecidos formam um perfil comportamental de audiência. Evidências empíricas consistentes geram sinais de intenção via `IntentBridge`. Somente intenções qualificadas alimentam o pipeline de leads.

---

## 📂 Estrutura do Repositório

```
PUB MACHINE/
├── docs/
│   ├── ARCHITECTURE_UNIFICATION.md         # Documento canônico completo da unificação
│   ├── AUDIENCE_INTELLIGENCE.md            # Especificação técnica do Audience Intelligence V0
│   └── SIGNAL_INTELLIGENCE.md              # Especificação técnica do Signal Capture V0
├── src/
│   ├── audience/                           # Camada 2: Audience Intelligence V0
│   │   ├── audience-profile.store.ts       # Store desacoplado para AudienceProfile
│   │   ├── audience-signal-aggregator.ts   # Agregador de presença em perfil comportamental
│   │   ├── audience.types.ts               # Contratos de features, inferências e regras
│   │   ├── behavioral-features.ts          # Extrator determinístico de métricas comportamentais
│   │   ├── index.ts                        # Barrel de exportações públicas de audience
│   │   ├── intent-bridge.ts                # Ponte explícita Audience -> Sinais de Intenção
│   │   ├── intent-signal.store.ts          # Store desacoplado para BridgeIntentSignal
│   │   └── segmentation-engine.ts          # Motor determinístico de segmentação declarativa
│   ├── autonomous/                         # Engines de execução e processamento autônomo (PDL)
│   │   ├── architectEngine.ts
│   │   └── machine-saas-automation-tech-leadEngine.ts
│   ├── prospecting/                        # Camadas 3 e 4: Lead e Conversion Intelligence
│   │   ├── deal-probability-forecasting.service.ts
│   │   ├── lead-conversion-velocity.service.ts
│   │   ├── lead-enrichment.service.ts
│   │   ├── lead-intent-signals.service.ts
│   │   ├── lead-prioritization-orchestrator.service.ts
│   │   ├── lead-scoring.service.ts
│   │   └── predictive-deal-velocity.service.ts
│   └── signal/                             # Camada 1: Signal / Capture Intelligence V0
│       ├── geo-math.ts                     # Cálculos geodésicos puros (Haversine & Ray Casting)
│       ├── geo-signal.types.ts             # Contratos canônicos de sinais, zonas e consentimento
│       ├── geofence-engine.ts              # Engine determinística de transições de geofence
│       ├── index.ts                        # Barrel de exportações públicas de signal
│       ├── presence-intelligence.service.ts# Cálculo de permanência, visitas e recência
│       ├── signal-capture.service.ts       # Orquestrador com governança LGPD e validação
│       └── signal-store.ts                 # Contrato ISignalStore e MemorySignalStore
├── tests/
│   ├── audience-intelligence.test.ts       # Suíte de testes da Camada Audience (6 testes)
│   └── signal-capture.test.ts              # Suíte de testes da Camada Signal (11 testes)
├── MASTER_CONTEXT.md                       # Governança canônica, status e matriz de auditoria
├── package.json                            # Dependências e scripts de teste
├── PUB_GIT_CLOSURE_RULE.md                 # Regra mandatória de fechamento de estágios Git
└── README.md                               # Visão geral do produto e arquitetura
```

---

## 🔍 Matriz de Status e Auditoria (Resumo)

| Camada / Serviço | Status Real | Evidência no Repositório |
| :--- | :--- | :--- |
| **Camada 1: Sinais Físicos & Geofence Engine** | `IMPLEMENTADO (V0)` | `src/signal/` (11 testes unitários passando) |
| **Camada 2: Audience Intelligence & Intent Bridge**| `IMPLEMENTADO (V0)` | `src/audience/` (6 testes unitários passando) |
| **Camada 3: Sinais Digitais & Scoring de Lead** | `IMPLEMENTADO` | `src/prospecting/` |
| **Camada 4: Conversão, Velocity & Forecasting** | `IMPLEMENTADO` | `src/prospecting/` |
| **Camada 5: Execução Autônoma** | `IMPLEMENTADO (ESTRUTURAL)` | `src/autonomous/` |
| **Camada 6: Closed Loop Feedback** | `ARQUITETURA-ALVO` | Em andamento |

---

## 📖 Documentação Completa

- [MASTER_CONTEXT.md](./MASTER_CONTEXT.md)
- [docs/ARCHITECTURE_UNIFICATION.md](./docs/ARCHITECTURE_UNIFICATION.md)
- [docs/AUDIENCE_INTELLIGENCE.md](./docs/AUDIENCE_INTELLIGENCE.md)
- [docs/SIGNAL_INTELLIGENCE.md](./docs/SIGNAL_INTELLIGENCE.md)
- [PUB_GIT_CLOSURE_RULE.md](./PUB_GIT_CLOSURE_RULE.md)
