# PUB Machine

> **Diretriz Canônica da PUB Core Holding:**  
> **PUB SERVER = PUB MACHINE**  
> *"PUB Server" é a linhagem conceitual histórica do PUB Machine. Não existe produto, arquitetura ou repositório independente chamado PUB Server. O nome canônico, presente e futuro, é **PUB MACHINE**.*

O **PUB Machine** é o motor de inteligência operacional, prospecção e geração de negócios da holding PUB, unificando a captura de sinais físicos e digitais, enriquecimento de audiência, qualificação de leads, previsão preditiva de conversão e automação de fechamento comercial em regime de **Closed Loop**.

---

## 🎯 Arquitetura de 6 Camadas

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

1. **Signal / Capture Intelligence (V0 Implementado):** Captura de sinais do mundo físico (geolocalização determinística, geofence circular e poligonal, métricas de permanência, detecção de transições ENTER/INSIDE/DWELL/EXIT, controle de consentimento LGPD) e digital (navegação, intenção, interações).
2. **Audience Intelligence:** Enriquecimento contínuo de dados B2B/B2C, mapeamento de decisores, tecnologias e porte (*Implementado*).
3. **Lead Intelligence:** Pontuação com normalização logística, agregação temporal cross-channel com decaimento exponencial (half-life) (*Implementado*).
4. **Conversion Intelligence:** Previsão determinística de velocidade de fechamento, win-probability forecasting, cálculo de expected value e priorização de oportunidades por SLA (*Implementado*).
5. **Execution Intelligence:** Orquestração de ações comerciais, cadências multicanal e integração com agentes autônomos via PUB DEV LOOP (*Em andamento / Estrutural*).
6. **Closed Loop & Continuous Learning:** Calibração dinâmica de pesos com base no desfecho real de oportunidades (*Arquitetura-Alvo / Otimização Autônoma*).

---

## 📂 Estrutura do Repositório

```
PUB MACHINE/
├── docs/
│   ├── ARCHITECTURE_UNIFICATION.md         # Documento canônico completo da unificação
│   └── SIGNAL_INTELLIGENCE.md              # Especificação técnica do Signal Capture V0
├── src/
│   ├── autonomous/                         # Engines de execução e processamento autônomo (PDL)
│   │   ├── architectEngine.ts
│   │   └── machine-saas-automation-tech-leadEngine.ts
│   ├── prospecting/                        # Camada de inteligência e qualificação de oportunidades
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
│       ├── index.ts                        # Barrel de exportações públicas
│       ├── presence-intelligence.service.ts# Cálculo de permanência, visitas e recência
│       ├── signal-capture.service.ts       # Orquestrador com governança LGPD e validação
│       └── signal-store.ts                 # Contrato ISignalStore e MemorySignalStore
├── tests/
│   └── signal-capture.test.ts              # Suíte de testes unitários automatizados (11 testes)
├── MASTER_CONTEXT.md                       # Governança canônica, status e matriz de auditoria
├── package.json                            # Dependências e scripts de teste (npm test / typecheck)
├── PUB_GIT_CLOSURE_RULE.md                 # Regra mandatória de fechamento de estágios Git
└── README.md                               # Visão geral do produto e arquitetura
```

---

## 🔍 Matriz de Status e Auditoria (Resumo)

| Camada / Serviço | Status Real | Evidência no Repositório |
| :--- | :--- | :--- |
| **Sinais Físicos & Geofence Engine** | `IMPLEMENTADO (V0)` | `src/signal/` (11 testes unitários passando) |
| **Sinais Digitais & Intenção** | `IMPLEMENTADO` | `src/prospecting/lead-intent-signals.service.ts` |
| **Enriquecimento B2B** | `IMPLEMENTADO` | `src/prospecting/lead-enrichment.service.ts` |
| **Scoring de Leads** | `IMPLEMENTADO` | `src/prospecting/lead-scoring.service.ts` |
| **Velocidade de Conversão** | `IMPLEMENTADO` | `src/prospecting/lead-conversion-velocity.service.ts` |
| **Orquestração & Priorização** | `IMPLEMENTADO` | `src/prospecting/lead-prioritization-orchestrator.service.ts` |
| **Forecasting de Fechamento** | `IMPLEMENTADO` | `src/prospecting/deal-probability-forecasting.service.ts` |
| **Disparo Automatizado Multicanal** | `ARQUITETURA-ALVO (GAP)` | Modelado em interfaces; integradores em pipeline. |

---

## 📖 Documentação Completa

- [MASTER_CONTEXT.md](./MASTER_CONTEXT.md)
- [docs/ARCHITECTURE_UNIFICATION.md](./docs/ARCHITECTURE_UNIFICATION.md)
- [docs/SIGNAL_INTELLIGENCE.md](./docs/SIGNAL_INTELLIGENCE.md)
- [PUB_GIT_CLOSURE_RULE.md](./PUB_GIT_CLOSURE_RULE.md)
