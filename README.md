# PUB Machine

> **Diretriz Canônica da PUB Core Holding:**  
> **PUB SERVER = PUB MACHINE**  
> *"PUB Server" é a linhagem conceitual histórica do PUB Machine. Não existe produto, arquitetura ou repositório independente chamado PUB Server. O nome canônico, presente e futuro, é **PUB MACHINE**.*

O **PUB Machine** é o motor de inteligência operacional, prospecção e geração de negócios da holding PUB, unificando a captura de sinais, enriquecimento de audiência, qualificação de leads, previsão preditiva de conversão e automação de fechamento comercial em regime de **Closed Loop**.

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

1. **Signal / Capture Intelligence:** Captura de sinais do mundo físico (geolocalização/geofencing - *Arquitetura-Alvo*) e digital (navegação, intenção, interações - *Implementado*).
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
│   └── ARCHITECTURE_UNIFICATION.md         # Documento canônico completo da unificação
├── src/
│   ├── autonomous/                         # Engines de execução e processamento autônomo (PDL)
│   │   ├── architectEngine.ts
│   │   └── machine-saas-automation-tech-leadEngine.ts
│   └── prospecting/                        # Camada de inteligência e qualificação de oportunidades
│       ├── deal-probability-forecasting.service.ts  # ML-inspired win-probability & deal value
│       ├── lead-conversion-velocity.service.ts      # Multi-signal velocity & time-to-opportunity
│       ├── lead-enrichment.service.ts               # Multi-provider enrichment & cache
│       ├── lead-intent-signals.service.ts           # Cross-channel signals & temporal decay
│       ├── lead-prioritization-orchestrator.service.ts # Ensemble scoring & SLA routing
│       ├── lead-scoring.service.ts                  # Interaction event scoring
│       └── predictive-deal-velocity.service.ts      # Close probability & expected days
├── MASTER_CONTEXT.md                       # Governança canônica, status e matriz de auditoria
├── PUB_GIT_CLOSURE_RULE.md                 # Regra mandatória de fechamento de estágios Git
└── README.md                               # Visão geral do produto e arquitetura
```

---

## 🔍 Matriz de Status e Auditoria (Resumo)

| Camada / Serviço | Status Real | Evidência no Repositório |
| :--- | :--- | :--- |
| **Sinais Digitais & Intenção** | `IMPLEMENTADO` | `src/prospecting/lead-intent-signals.service.ts` |
| **Enriquecimento B2B** | `IMPLEMENTADO` | `src/prospecting/lead-enrichment.service.ts` |
| **Scoring de Leads** | `IMPLEMENTADO` | `src/prospecting/lead-scoring.service.ts` |
| **Velocidade de Conversão** | `IMPLEMENTADO` | `src/prospecting/lead-conversion-velocity.service.ts` & `predictive-deal-velocity.service.ts` |
| **Orquestração & Priorização** | `IMPLEMENTADO` | `src/prospecting/lead-prioritization-orchestrator.service.ts` |
| **Forecasting de Probabilidade de Fechamento** | `IMPLEMENTADO` | `src/prospecting/deal-probability-forecasting.service.ts` |
| **Sinais Físicos / Geolocalização / Geofencing** | `ARQUITETURA-ALVO (GAP)` | Não há código no histórico. Definido na especificação arquitetural. |
| **Disparo Automatizado Multicanal** | `ARQUITETURA-ALVO (GAP)` | Modelado em interfaces; integradores de canal em pipeline. |

---

## 📖 Documentação Completa

Para a matriz analítica exaustiva e especificação técnica das 6 camadas, consulte:
- [MASTER_CONTEXT.md](./MASTER_CONTEXT.md)
- [docs/ARCHITECTURE_UNIFICATION.md](./docs/ARCHITECTURE_UNIFICATION.md)
- [PUB_GIT_CLOSURE_RULE.md](./PUB_GIT_CLOSURE_RULE.md)
