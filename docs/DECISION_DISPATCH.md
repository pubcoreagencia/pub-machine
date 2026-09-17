# Decision & Dispatch V0 — Especificação Técnica & Governança

**Módulos Envolvidos:** `src/decision/` & `src/prospecting/`  
**Status:** IMPLEMENTADO (V0 — Contratos, Decisão Auditável, Recomendação de Canais e Despacho Idempotente)  
**Data:** 2026-09-16  
**Repositório Canônico:** `pubcoreagencia/pub-machine`  

---

## 1. Visão Geral & Princípios Fundamentais

```
[RAW SIGNAL] ──► [AUDIENCE] ──► [INTENT BRIDGE] ──► [LEAD INTENT] ──► [LEAD SCORING] ──► [DECISION ENGINE] ──► [CHANNEL ENGINE] ──► [DISPATCH CONTRACT]
```

> **REGRA VINCULANTE:**  
> O PUB Machine **não é um disparador de mensagens**.  
> Ele é primeiramente um **MOTOR DE INTELIGÊNCIA OPERACIONAL E DECISÃO**.  
> `INTELLIGENCE → DECISION → DISPATCH CONTRACT → EXECUTION ADAPTER`.  
> Nesta fase V0, **nenhum envio real** de WhatsApp, e-mail, LinkedIn, telefone ou outro canal é realizado. Toda a execução opera através de contratos em memória (`MemoryActionDispatcher`) com garantias estritas de auditabilidade, idempotência, cálculo de SLA e governança.

---

## 2. Contratos Canônicos

### 2.1 LeadActionDecision
Representa a decisão operacional completa e auditável, contendo:
- `decisionId`: Identificador único determinístico.
- `leadId` e `subjectId`: Relação entre a entidade de negócio e o perfil de audiência pseudonimizado.
- `deduplicationKey`: Chave de idempotência no formato `${leadId}:${recommendedAction}:${YYYY-MM-DD}`.
- `priority`: Nível de criticidade (`P0_CRITICAL`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`, `P4_COLD`).
- `urgency`: Urgência de atendimento (`IMMEDIATE`, `SAME_DAY`, `NEXT_DAY`, `SCHEDULED`, `PASSIVE`).
- `slaHours`: Janela máxima de resposta (1h para P0, 4h para P1, 24h para P2, 72h para P3, 168h para P4).
- `recommendedAction`: Descrição operacional clara do que deve ser feito.
- `recommendedChannel`: Canal selecionado com base nas regras do canal engine.
- `executionMode`: Modo de governança (`AUTONOMOUS`, `HUMAN_APPROVAL`, `HUMAN_ONLY`).
- `score`: Score composto (40% lead score + 60% intent score).
- `intentStrength`: Intensidade do sinal de intenção.
- `confidence`: Confiança consolidada das evidências coletadas.
- `conversionVelocityHours`: Estimativa de velocidade de fechamento quando disponível.
- `evidence`: Array exaustivo de `ActionEvidence` preservando rastreabilidade de ponta a ponta.
- `reasons`: Justificativas em linguagem natural baseadas em evidências empíricas.
- `generatedAt`, `expiresAt`, `cooldownUntil`: Controles de ciclo de vida e recência temporal.
- `provenance`: Metadados da versão do motor e do conjunto de regras.

### 2.2 ActionEvidence (Evidence Chain)
Preserva a causalidade e origem de cada sinal:
- `source`: Origem (`physical`, `digital`, `crm`, `enrichment`, `model`).
- `signalType`: Identificador taxonômico do sinal.
- `strength`: Intensidade empírica `[0.0..1.0]`.
- `confidence`: Nível de confiança da medição `[0.0..1.0]`.
- `decay`: Fator de recência no momento da decisão `[0.0..1.0]`.
- `timestamp`: Momento exato da ocorrência.
- `provenance`: Detalhes rastreáveis (`zoneId`, `evidenceRule`, `url`, detalhes extras).

### 2.3 ChannelRecommendationEngine
Separação estrita de responsabilidades:
- **Prioridade e Urgência:** Respondem **QUANDO** agir.
- **Canal Recomendado:** Responde **COMO** agir.

Regras determinísticas:
- **P0_CRITICAL:** Direciona para `whatsapp` (se houver presença física qualificada ou pedido de demo) ou `phone` (para contas corporativas sem contato direto prévio). Ambos exigem revisão humana (`requiresHumanReview: true`).
- **P1_HIGH:** Direciona para `sdr_queue` (convergência física + visita a preços) ou `linkedin` (se houver engajamento comprovado na rede).
- **P2_MEDIUM / P3_LOW:** Direciona para `email` em cadência automatizada (`requiresHumanReview: false`).
- **P4_COLD:** Direciona para `email` passivo com reavaliação periódica.

### 2.4 Dispatcher & Governança
O `MemoryActionDispatcher` atua como contrato agnóstico:
- **Expiração:** Decisões cujo `expiresAt` já tenha passado são bloqueadas com status `EXPIRED`.
- **Idempotência & Cooldown:** Tentativas repetidas na mesma janela de cooldown retornam `IGNORED_DUPLICATE`.
- **Human Handoff:** Decisões com `HUMAN_APPROVAL` ou `HUMAN_ONLY` recebem status `PENDING_APPROVAL`, assegurando que automações P0 não disparem de forma autônoma sem validação prévia.
- **Autônomo:** Decisões aprovadas para automação recebem status `QUEUED`.

---

## 3. Suíte de Testes & Gate Oficial

A suíte [`tests/decision-dispatch.test.ts`](../tests/decision-dispatch.test.ts) valida 7 cenários críticos e é parte integrante do gate oficial via `npm test`:
1. `LeadActionDecision`: Geração determinística com auditoria e SLA calculados.
2. Separação Prioridade vs Canal: P0 corporativo sem demo solicita telefone/sdr.
3. Idempotência e Cooldown: Mesma oportunidade na mesma janela não duplica ação.
4. Expiração da Decisão: Sinais envelhecidos geram decisão que expira e é bloqueada.
5. Human Handoff: Decisões P0 nunca disparam autonomamente na V0 (exigem aprovação).
6. Isolamento Causal: Tentativa de decisão sem evidências rastreáveis retorna `null`.
7. **Causalidade Completa E2E:** `Signal -> Geofence -> Audience -> Intent -> Lead -> Decision -> Dispatch`.

---

## 4. Nota Arquitetural & Registro de Dívida Técnica: Convergência Operacional

> ### Dívida Arquitetural Identificada: Sobreposição entre Orchestrator e Decision Engine
> 
> Durante a auditoria da Phase 4, identificou-se uma sobreposição de responsabilidade entre:
> 1. `LeadPrioritizationOrchestrator` (`src/prospecting/`): Componente legado que contém métodos internos próprios de prescrição (`recommendAction`, `assignChannel`).
> 2. `LeadActionDecisionEngine` (`src/decision/`): O **novo ponto canônico e unificado** de decisão operacional do PUB Machine, responsável por construir o contrato estruturado `LeadActionDecision` com evidências, proveniência, SLA, validade e modo de governança.
> 
> **Diretrizes para Convergência Futura:**
> - O `LeadPrioritizationOrchestrator` deve atuar prioritariamente como calculador/consolidador analítico de scores (`fitScore`, `intentScore`, `velocityScore`, `enrichmentBoost`).
> - O `LeadActionDecisionEngine` é o único responsável canônico por formular a decisão operacional final (`WHAT`, `WHEN`, `CHANNEL`, `SLA`, `EXECUTION_MODE`).
> - Em etapas futuras, o fluxo de priorização deverá convergir para delegar a decisão operacional exclusivamente ao `LeadActionDecisionEngine`.
> - **Regra:** É terminantemente proibido criar um terceiro motor de decisão. A sobreposição será unificada sem quebra dos contratos existentes.
