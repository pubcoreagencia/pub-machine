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

O PUB Machine não é concebido meramente como um CRM passivo ou um script de pontuação de leads. Trata-se de um **sistema de inteligência operacional contínua** desenhado em regime de **Closed Loop**:

```
CAPTURE ──► UNDERSTAND ──► QUALIFY ──► PRIORITIZE ──► CONVERT ──► MEASURE ──► LEARN ──► CAPTURE
```

O projeto integra a esteira de desenvolvimento autônomo da holding (**PUB DEV LOOP / PDL**), com atuação contínua dos agentes de arquitetura, desenvolvimento, QA e produto.

---

## 3. Arquitetura-Alvo (6 Camadas Operacionais)

1. **SIGNAL / CAPTURE INTELLIGENCE**
   - Captura de sinais do mundo físico e digital.
   - Localização/geolocalização quando tecnicamente e legalmente disponível (latitude, longitude, precisão).
   - Zonas de interesse e geofencing (entrada, permanência e saída).
   - Frequência, recorrência e eventos comportamentais.
   - Identificação pseudonimizada na borda e proveniência/confiança do sinal.
   - Consentimento explícito e controles estritos de privacidade (LGPD).

2. **AUDIENCE INTELLIGENCE**
   - Enriquecimento de dados (firmographics, tecnologias, decisores, porte, faturamento).
   - Perfil, comportamento, interesses e afinidades contextuais.
   - Segmentação dinâmica e estágio de awareness/funil.
   - Sinais de intenção, score consolidado e confiança.

3. **LEAD INTELLIGENCE**
   - Enriquecimento contínuo de leads com cache e tolerância a falhas.
   - Lead scoring multi-evento com normalização logística.
   - Agregação de sinais de intenção cross-channel com decaimento temporal exponencial (half-life).
   - Priorização preditiva com modelos de ensemble.

4. **CONVERSION INTELLIGENCE**
   - Prospecção e qualificação algorítmica.
   - Previsão de velocidade de conversão (tempo estimado até oportunidade em horas/dias).
   - Deal probability forecasting (probabilidade de ganho, expected value, mitigação de risco e concorrência).
   - Roteamento inteligente de esteiras por SLA (`P0_CRITICAL` a `P4_COLD`).

5. **EXECUTION INTELLIGENCE**
   - Orquestração de ações comerciais e automações multicanal (WhatsApp, e-mail, telefone, LinkedIn).
   - Geração de copy e abordagem personalizada (integração com PUB Neural).
   - Handoff para agentes autônomos ou operadores humanos com playbooks dinâmicos.
   - Registro estruturado de interações e touchpoints.

6. **CLOSED LOOP & CONTINUOUS LEARNING**
   - Retroalimentação automática de resultados (deals ganhos/perdidos).
   - Calibração bayesiana e dinâmica de pesos de intenção e probabilidade.
   - Ciclos contínuos de otimização autônoma.

---

## 4. Matriz de Auditoria: Legacy Concept vs. Estado Real no PUB Machine

| Legacy Concept (PUB Server) | PUB Machine Component | Status Real no Repo | Evidência / Arquivos | Gap / Ação Futura |
| :--- | :--- | :--- | :--- | :--- |
| **Sinais de Localização / Presença Física** | `SignalCaptureService` | **ARQUITETURA-ALVO (GAP)** | Nenhuma linha de código ou commit histórico no repositório. | Ingestão de GPS, cálculo de geofence/polígonos, métricas de permanência e gestão de consentimento LGPD. |
| **Sinais de Intenção Digital** | `LeadIntentSignalsService` | **IMPLEMENTADO** | `src/prospecting/lead-intent-signals.service.ts` | Persistir buffer in-memory em banco relacional/Redis; conectar webhooks em tempo real. |
| **Enriquecimento B2B / Audiência** | `LeadEnrichmentService` | **IMPLEMENTADO** | `src/prospecting/lead-enrichment.service.ts` | Implementar provedores externos reais (Clearbit, Apollo, CNPJ) além da interface. |
| **Scoring de Interações** | `LeadScoringService` | **IMPLEMENTADO** | `src/prospecting/lead-scoring.service.ts` | Adicionar pesos dinâmicos por tenant/campanha. |
| **Previsão de Velocidade de Conversão** | `LeadConversionVelocityService` & `PredictiveDealVelocityService` | **IMPLEMENTADO** | `src/prospecting/lead-conversion-velocity.service.ts` e `predictive-deal-velocity.service.ts` | Conectar histórico real de deals fechados para ajuste fino de parâmetros. |
| **Orquestração e Priorização** | `LeadPrioritizationOrchestrator` | **IMPLEMENTADO** | `src/prospecting/lead-prioritization-orchestrator.service.ts` | Conectar filas de despacho assíncrono (BullMQ/RabbitMQ). |
| **Forecasting de Deal / Win Probability** | `DealProbabilityForecasting` | **IMPLEMENTADO** | `src/prospecting/deal-probability-forecasting.service.ts` | Conectar telemetria direta do CRM para auto-calibração. |
| **Execução Autônoma** | `AutonomousExecutionEngines` | **IMPLEMENTADO (ESTRUTURAL)** | `src/autonomous/architectEngine.ts`, `machine-saas-automation-tech-leadEngine.ts` | Expandir rotinas de orquestração multicanal e integração com PUB Neural. |

---

## 5. Diretrizes de Governança & Engenharia
1. **Zero Fake Work:** Somente o código comprovado é declarado IMPLEMENTADO. Sinais físicos de GPS e geolocalização permanecem categorizados como ARQUITETURA-ALVO / GAP até desenvolvimento e homologação completos com testes.
2. **Sem Forks Conceituais:** Nenhuma menção ou iniciativa de repositório autônomo `pub-server`.
3. **PUB Git Closure Rule:** Qualquer avanço deve seguir: `IMPLEMENT → TEST → COMMIT → PUSH → VERIFY REMOTE → DECLARE CLOSED`.
4. **Documento Arquitetural Completo:** Consulte [docs/ARCHITECTURE_UNIFICATION.md](./docs/ARCHITECTURE_UNIFICATION.md).
