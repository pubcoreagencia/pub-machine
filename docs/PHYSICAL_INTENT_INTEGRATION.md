# Physical → Lead Intent Integration V0 — Especificação Técnica

**Módulos Envolvidos:** `src/audience/` & `src/prospecting/`  
**Status:** IMPLEMENTADO (V0 - Adapter, Taxonomia, Composição Multi-Sinal e Causalidade End-to-End)  
**Data:** 2026-09-16  
**Repositório Canônico:** `pubcoreagencia/pub-machine`  

---

## 1. Visão Geral & Princípios Fundamentais

```
RAW SIGNAL ──► AUDIENCE INTELLIGENCE ──► INTENT BRIDGE ──► PHYSICAL INTENT ADAPTER ──► LeadIntentSignalsService ──► LeadScoringService ──► LeadPrioritization
```

> **PRINCÍPIO CANÔNICO INVIOLÁVEL:**  
> **Não duplicar o motor de inteligência e scoring.**  
> O PUB Machine **não cria** um `PhysicalLeadScoringService` nem um motor paralelo de pontuação. A presença física qualificada entra como um canal de primeira classe (`channel: 'physical'`) no serviço existente [`LeadIntentSignalsService`](../src/prospecting/lead-intent-signals.service.ts), compartilhando deterministicamente as mesmas leis matemáticas de decaimento temporal, saturação logística e composição cross-channel.

---

## 2. Taxonomia Canônica de Sinais Físicos

A integração separa com precisão matemática:

| Nível Hierárquico | Conceito | Exemplo | Papel no Pipeline |
| :--- | :--- | :--- | :--- |
| **Nível 1: EVENT** | Transição de telemetria bruta | `ENTER`, `INSIDE`, `EXIT` | Registrado em `ISignalStore`. Não possui conotação comercial. |
| **Nível 2: FEATURE** | Característica agregada de audiência | `high_dwell`, `recurring_visit`, `zone_affinity` | Registrado em `IAudienceProfileStore`. Representa padrão de comportamento. |
| **Nível 3: INTENT** | Sinal qualificado de propensão | `physical.commercial_hub_high_dwell`, `physical.frequent_engagement` | Emitido pela `IntentBridge` e adaptado para `LeadIntentSignalsService`. |

Taxonomia formalizada em [`src/audience/physical-intent.types.ts`](../src/audience/physical-intent.types.ts):
* `physical.zone_presence`
* `physical.high_dwell`
* `physical.recurring_visit`
* `physical.zone_affinity`
* `physical.recent_visit`
* `physical.commercial_hub_high_dwell`
* `physical.frequent_engagement`

---

## 3. O Adaptador: PhysicalIntentAdapter

O [`PhysicalIntentAdapter`](../src/audience/physical-intent.adapter.ts) atua como tradutor puro entre a `IntentBridge` e o `LeadIntentSignalsService`:

1. **Ponderação Efetiva (`weight`):**
   $$\text{weight} = \min(1.0, \text{round}(\text{strength} \times \text{confidence}))$$
2. **Decaimento Temporal Unificado (`decayHalfLifeHours`):**
   * Canal `physical`: Half-life canônico calibrado em **72 horas** (3 dias).
   * Utiliza exatamente a função de decaimento exponencial nativa do `LeadIntentSignalsService`:
     $$\text{decay} = 0.5^{\frac{\text{ageHours}}{\text{halfLife}}}$$
3. **Trilha de Auditoria Exaustiva (`metadata.audit`):**
   * Regra originadora (`evidenceRule`).
   * Zonas observadas e permanência acumulada em segundos (`detectedDwellSeconds`).
   * Contagem de visitas (`detectedVisits`).
   * Grau de confiança e fonte de proveniência.

---

## 4. Composição Multi-Sinal (Physical + Digital)

No `LeadIntentSignalsService`, a presença física convive organicamente com canais digitais (`pricing_page_view`, `demo_request`, `email_click`):
* O peso relativo do canal `physical` é parametrizado em **0.75** (no mesmo nível de sinais corporativos fortes).
* A saturação logística:
  $$\text{Score} = (1 - e^{-\sum \text{contribuições}}) \times 100$$
  impede que uma única visita física inflacione artificialmente o score do lead sem outras evidências complementares.

---

## 5. Trilha de Causalidade End-to-End (Auditada nos Testes)

O teste automatizado [`tests/physical-intent-integration.test.ts`](../tests/physical-intent-integration.test.ts) valida a passagem determinística pelo fluxo completo:

1. **Consentimento:** Sujeito cadastra consentimento explícito LGPD (`GRANTED`).
2. **Telemetria:** Ingestão de `ENTER` (t0) → `DWELL_THRESHOLD` (t0 + 350s) → `EXIT` (t0 + 500s).
3. **Audiência:** `AudienceSignalAggregator` computa `totalDwellSeconds = 500s` e afinidade positiva.
4. **Bridge:** `IntentBridge` detecta que a regra `rule_vip_hub_immersion` (exige dwell $\ge$ 400s) foi atingida e emite `BridgeIntentSignal`.
5. **Adapter:** `PhysicalIntentAdapter` gera `AdaptedLeadIntentSignal` com canal `physical` e trilha de auditoria.
6. **Lead Intent:** `LeadIntentSignalsService.capture()` ingere o sinal e eleva o score de intenção do lead com saturação logística.
7. **Lead Scoring:** `LeadScoringService` pontua interações transacionais com thresholds validados.
