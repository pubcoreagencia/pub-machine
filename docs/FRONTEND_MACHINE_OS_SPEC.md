# PUB MACHINE OS — Frontend Machine Experience V1

## Objetivo

O frontend não é apenas dashboard. Ele é a representação visual da cadeia causal do PUB Machine em tempo real.

As três máquinas devem compartilhar:

- Event Bus.
- timeline.
- identidade pseudonimizada.
- seleção de entidade.
- provenance.
- filtros.
- estado live/offline.
- navegação causal entre máquinas.

## Machine 1 — Signal Capture

### Layout

Painel esquerdo:
- cena isométrica;
- centro da máquina;
- raio de alcance;
- sub-zonas;
- pontos de presença;
- densidade;
- vetores de entrada/saída.

Painel direito:
- pessoas rastreadas;
- atualmente dentro;
- ENTER;
- EXIT;
- DWELL;
- accuracy média;
- confidence média;
- sinais por fonte.

Rodapé:
- stream temporal live.

### Spatial model

O frontend deve receber:

`latitude`, `longitude`, `radiusMeters`, `zone geometry`, `presence count`, `signal confidence`.

A cena 3D é uma representação operacional. Não deve sugerir que a terceira dimensão seja altitude medida.

## Machine 2 — Audience Qualification

### Hierarquia visual

1. Raw Signal
2. Observation
3. Behavior
4. Pattern
5. Audience
6. Segment
7. Intent
8. Lead Intent

### Filtros

- source;
- event type;
- zone;
- visit count;
- dwell;
- recurrence;
- recency;
- affinity;
- confidence;
- intent score;
- lifecycle;
- consent state.

### Evidence drawer

Ao selecionar uma classificação, abrir painel com:

- sinais originadores;
- janela temporal;
- regra acionada;
- confidence;
- decay;
- provenance;
- segmentos relacionados;
- next transitions possíveis.

## Machine 3 — Omnichannel Conversion

### Acquisition graph

Nós por família:

- social;
- communication;
- acquisition;
- prospecting;
- physical;
- commerce.

Arestas devem representar volume de passagem, taxa de conversão e valor quando disponível.

### Inbound

- website;
- SEO;
- organic social;
- referral;
- direct;
- lead forms;
- product discovery.

### Outbound

- SDR;
- email;
- WhatsApp;
- phone;
- LinkedIn;
- CRM cadences.

### Conversion path

`ACQUISITION -> AUDIENCE -> INTENT -> DECISION -> ACTION -> CHECKOUT -> ORDER -> PAYMENT -> PURCHASE`

Recovery deve aparecer como ramificação:

`CHECKOUT/ORDER/PAYMENT FAILURE -> RECOVERY -> ACTION -> PURCHASE`

## Cross-machine interaction

Selecionar uma pessoa/sujeito na Machine 1:

`Signal -> Audience -> Intent -> Decision -> Conversion`

Selecionar um segmento na Machine 2:

`Segment -> members -> intent evidence -> active decisions -> conversions`

Selecionar uma conversão na Machine 3:

`Purchase -> order -> previous action -> decision -> lead intent -> audience -> originating signals`

## Realtime

O frontend deverá consumir eventos canônicos. Não deve gerar uma segunda simulação local que pareça ser produção.

Estados mínimos:

- CONNECTING
- LIVE
- DEGRADED
- OFFLINE

