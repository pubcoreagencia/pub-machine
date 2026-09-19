# PUB MACHINE OS — Convergência V1

Status: BOOTSTRAP / READINESS
Destination architecture: novo repositório consolidado
Staging branch: consolidation/bootstrap-pub-machine-os

## Fontes

- `pubcoreagencia/audience-engine` @ 46fa989ac238ce459dd4de3283b42042ca446c4b
- `pubcoreagencia/pub-machine` @ e314f7366eb96a054abfef30e9718a2f4dfee247

## Regra de consolidação

Os dois repositórios são fontes de capacidades do mesmo produto. Nenhum dos dois deve ser tratado como fonte total de verdade.

O novo PUB MACHINE OS terá um único domínio canônico e uma única cadeia causal:

RAW SIGNAL -> AUDIENCE PROFILE -> INTENT -> LEAD INTENT -> LEAD -> DECISION -> DISPATCH -> CONVERSION -> FEEDBACK

Regra estrutural:

RAW SIGNAL != AUDIENCE PROFILE != INTENT != LEAD

## Capacidades preservadas

### Provenientes do audience-engine

- Supabase/Postgres persistente.
- Modelo de eventos comportamentais e comerciais.
- Campanhas e campaign events.
- Conversões, pagamentos e recovery.
- RPCs de dashboard/funnel/segmentos/geo/acquisition.
- Realtime via Supabase.
- Produto visual iniciado pelo Lovable.
- Taxonomia digital e e-commerce.
- Simuladores e seed operacional.

### Provenientes do pub-machine

- Geofence determinístico.
- Haversine.
- Círculo e polígono.
- ENTER / INSIDE / DWELL_THRESHOLD / EXIT.
- Presence Intelligence.
- Behavioral Feature Extraction.
- Segmentation Engine declarativo.
- IntentBridge.
- PhysicalIntentAdapter.
- LeadIntent cross-channel com decay.
- Lead scoring.
- Prioritization.
- Decision Engine auditável.
- Evidence / provenance.
- SLA / expiration / cooldown / idempotency.
- Human handoff.
- Suíte de 32 testes históricos.

## Componentes que não serão duplicados

### Runtime

A implementação inline em `functions/api/[[path]].js` é tratada como legado de deployment/demo e não como segundo cérebro.

A API consolidada deve chamar os serviços canônicos.

### Scoring

Não importar o `SCORE_TABLE` do audience-engine como Lead Score final.

O novo sistema deve manter uma separação entre:

1. pontos/eventos comportamentais;
2. sinais de intenção;
3. score do lead;
4. prioridade operacional.

### Geo

O motor geométrico canônico será o GeofenceEngine do pub-machine.

As tabelas e metadados de máquinas do audience-engine serão absorvidos como persistência/configuração.

## Nova divisão de módulos

- `signal`: sinais digitais/físicos, geofence, presença e qualidade.
- `audience`: features, segmentos e profiles.
- `intent`: composição, decay e provenance.
- `lead`: scoring, enrichment, velocity e prioritization.
- `decision`: decisão, canal, execução e dispatch.
- `conversion`: checkout, order, payment, recovery e feedback.
- `persistence`: contratos de repository + adapters Postgres/Supabase.
- `events`: Event Bus e contratos de eventos.
- `apps/control-room`: frontend operacional das três máquinas.
- `tests`: unit, integration e E2E.

## Frontend canônico

### Machine 1 — Signal Capture

Deve mostrar, em tempo real:

- latitude/longitude da máquina;
- raio de alcance;
- geofence e sub-zonas;
- pessoas detectadas;
- pessoas dentro;
- entradas/saídas;
- dwell;
- accuracy/confidence;
- stream de sinais;
- estado da máquina.

A visualização principal deverá usar um gráfico isométrico de cena espacial. A terceira dimensão representa densidade/volume visual de presença, não altitude geográfica.

### Machine 2 — Audience Qualification

Deve ilustrar a hierarquia completa:

RAW SIGNAL
-> OBSERVATION
-> BEHAVIOR
-> PATTERN
-> AUDIENCE
-> SEGMENT
-> INTENT
-> LEAD INTENT

Deve permitir filtros por tipo de comportamento, origem do sinal, zona, recência, frequência, dwell, afinidade e nível de intenção.

Toda qualificação relevante deve expor evidências e provenance.

### Machine 3 — Omnichannel Conversion

Deve representar inbound + outbound e seus caminhos de aquisição/conversão.

Famílias:

- Social: Instagram, Facebook, TikTok, YouTube, LinkedIn, X.
- Comunicação: WhatsApp, Email, SMS, Push, Phone.
- Acquisition: Google, Meta, TikTok, Organic, SEO, Referral, Direct, Partner.
- Prospecting: SDR, outbound email, outbound WhatsApp, LinkedIn prospecting, CRM, ABM.
- Physical: GPS, BLE, Beacon, WiFi, Events, Stores, Commercial Hubs.
- Commerce: Website, Product, Cart, Checkout, PIX, Boleto, Card, Order, Purchase.

A UI deverá representar aquisição -> qualification -> intent -> decision -> action -> conversion -> recovery -> feedback em uma cadeia navegável.

## Critérios de convergência

O novo repositório somente poderá declarar uma capacidade como integrada quando:

- existir no código canônico;
- existir contrato tipado;
- existir teste relevante;
- a UI consumir o runtime canônico;
- não existir segunda implementação funcional para o mesmo domínio;
- a persistência não depender de memória para o caminho de produção;
- eventos possuírem provenance suficiente para auditoria.

## Regra de migração

Os repositórios fonte permanecem intocados durante a consolidação.

A fusão deve ocorrer no novo repositório, com commits pequenos por domínio e validação a cada bloco.

