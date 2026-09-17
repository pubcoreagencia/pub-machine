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

## 2. Visão Executiva & Propósito

O PUB Machine opera como um **sistema de inteligência operacional contínua** desenhado em regime de **Closed Loop**:

```
CAPTURE ──► UNDERSTAND ──► QUALIFY ──► PRIORITIZE ──► CONVERT ──► MEASURE ──► LEARN ──► CAPTURE
```

O projeto integra a esteira de desenvolvimento autônomo da holding (**PUB DEV LOOP / PDL**), com atuação contínua dos agentes de arquitetura, desenvolvimento, QA e produto.

---

## 3. Arquitetura-Alvo (6 Camadas Operacionais)

1. **SIGNAL / CAPTURE INTELLIGENCE (V0 IMPLEMENTADO)**
   - Captura provider-agnostic de sinais (físicos e digitais).
   - Contratos para localização e presença (`latitude`, `longitude`, `accuracyMeters`, `confidence`, `provenance`).
   - Abstração de zonas físicas (círculo via Haversine e polígono via Ray Casting).
   - Engine determinística de transições: `ENTER`, `INSIDE`, `DWELL_THRESHOLD`, `EXIT`.
   - Presence Intelligence: primeira/última entrada, frequência, tempo de permanência, número de visitas e recência.
   - Signal Store desacoplado (`ISignalStore` e `MemorySignalStore`).
   - Privacy by Design & LGPD: pseudonimização mandatória, validação de consentimento e expurgo via `purge(subjectId)`.

2. **AUDIENCE INTELLIGENCE**
   - Enriquecimento de dados B2B (firmographics, tecnologias, decisores, porte, faturamento).
   - Perfil, comportamento, interesses e afinidades contextuais.
   - Segmentação dinâmica e estágio de awareness/funil.

3. **LEAD INTELLIGENCE**
   - Enriquecimento contínuo com tolerância a falhas e cache.
   - Lead scoring com normalização logística.
   - Agregação de intenção cross-channel com decaimento temporal exponencial (half-life).
   - Priorização preditiva com modelos de ensemble.

4. **CONVERSION INTELLIGENCE**
   - Previsão de velocidade de conversão (tempo até oportunidade em horas/dias).
   - Deal probability forecasting (probabilidade de ganho, expected value, risco e concorrência).
   - Roteamento inteligente de esteiras por SLA (`P0_CRITICAL` a `P4_COLD`).

5. **EXECUTION INTELLIGENCE**
   - Orquestração de ações comerciais e automações multicanal (WhatsApp, e-mail, telefone, LinkedIn).
   - Handoff para agentes autônomos ou operadores humanos com playbooks dinâmicos.

6. **CLOSED LOOP & CONTINUOUS LEARNING**
   - Retroalimentação automática de resultados (deals ganhos/perdidos).
   - Calibração bayesiana dinâmica de pesos de intenção e probabilidade.
   - Ciclos contínuos de otimização autônoma.

---

## 4. Matriz de Auditoria: Legacy Concept vs. Estado Real no PUB Machine

| Legacy Concept (PUB Server) | PUB Machine Component | Status Real no Repo | Evidência / Arquivos | Gap / Ação Futura |
| :--- | :--- | :--- | :--- | :--- |
| **Sinais de Localização / Presença Física** | `SignalCaptureService`, `GeofenceEngine` | **IMPLEMENTADO (V0)** | `src/signal/` (testes 100% verdes) | Conectores de hardware físico real e adapters de banco persistente (Postgres/Redis). |
| **Sinais de Intenção Digital** | `LeadIntentSignalsService` | **IMPLEMENTADO** | `src/prospecting/lead-intent-signals.service.ts` | Persistir buffer in-memory em banco relacional/Redis; conectar webhooks em tempo real. |
| **Enriquecimento B2B / Audiência** | `LeadEnrichmentService` | **IMPLEMENTADO** | `src/prospecting/lead-enrichment.service.ts` | Conectar provedores reais (Clearbit, Apollo, CNPJ) além da interface. |
| **Scoring de Interações** | `LeadScoringService` | **IMPLEMENTADO** | `src/prospecting/lead-scoring.service.ts` | Adicionar pesos dinâmicos por tenant/campanha. |
| **Previsão de Velocidade de Conversão** | `LeadConversionVelocityService` & `PredictiveDealVelocityService` | **IMPLEMENTADO** | `src/prospecting/lead-conversion-velocity.service.ts` e `predictive-deal-velocity.service.ts` | Conectar histórico real de deals fechados para ajuste fino de parâmetros. |
| **Orquestração e Priorização** | `LeadPrioritizationOrchestrator` | **IMPLEMENTADO** | `src/prospecting/lead-prioritization-orchestrator.service.ts` | Conectar filas de despacho assíncrono (BullMQ/RabbitMQ). |
| **Forecasting de Deal / Win Probability** | `DealProbabilityForecasting` | **IMPLEMENTADO** | `src/prospecting/deal-probability-forecasting.service.ts` | Conectar telemetria direta do CRM para auto-calibração. |
| **Execução Autônoma** | `AutonomousExecutionEngines` | **IMPLEMENTADO (ESTRUTURAL)** | `src/autonomous/architectEngine.ts`, `machine-saas-automation-tech-leadEngine.ts` | Expandir rotinas de orquestração multicanal e integração com PUB Neural. |

---

## 5. Diretrizes de Governança & Engenharia
1. **Zero Fake Work:** Todas as funcionalidades declaradas possuem código fonte e suíte de testes unitários automatizados.
2. **Sem Forks Conceituais:** Nenhuma menção ou iniciativa de repositório autônomo `pub-server`.
3. **PUB Git Closure Rule:** Ciclo rigoroso `IMPLEMENT → TEST → COMMIT → PUSH → VERIFY REMOTE → DECLARE CLOSED`.
4. **Documentos Arquiteturais Complementares:**
   - [docs/ARCHITECTURE_UNIFICATION.md](./docs/ARCHITECTURE_UNIFICATION.md)
   - [docs/SIGNAL_INTELLIGENCE.md](./docs/SIGNAL_INTELLIGENCE.md)
