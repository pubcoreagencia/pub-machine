# PUB MACHINE OS — Source Merge Manifest V1

## Source snapshots

| Source | Revision | Role |
|---|---|---|
| `pubcoreagencia/audience-engine` | `46fa989ac238ce459dd4de3283b42042ca446c4b` | Lovable product/UI/persistence source |
| `pubcoreagencia/pub-machine` | `e314f7366eb96a054abfef30e9718a2f4dfee247` | OpenClaw domain/test source |

## Priority A — canonical domain

| Source | Target | Action |
|---|---|---|
| pub-machine/src/signal/* | packages/signal-engine | preserve Geofence + Presence |
| pub-machine/src/audience/* | packages/audience-engine | preserve features/segments/IntentBridge |
| pub-machine/src/prospecting/* | packages/lead-engine | preserve intent/score/prioritization |
| pub-machine/src/decision/* | packages/decision-engine | preserve decision/dispatch |
| pub-machine/tests/* | tests/* | preserve and extend |

## Priority B — product persistence

| Source | Target | Action |
|---|---|---|
| audience-engine/drizzle/migrations/0000_pub_machine_schema_and_seed.sql | packages/persistence/migrations | absorb schema, seed and RPCs |
| audience-engine/src/lib/data/queries.ts | apps/control-room/data | adapt queries to canonical API/repositories |
| audience-engine/src/lib/live/LiveStreamProvider.tsx | packages/events + control-room | adapt Realtime/Event Bus UX |

## Priority C — frontend

| Source | Target | Action |
|---|---|---|
| audience-engine/src/components/pub/* | apps/control-room/components | preserve visual language and shell |
| audience-engine/src/routes/* | apps/control-room/routes | rebuild against canonical API |
| audience-engine/src/routes/index.tsx | Machine 1+2+3 overview | preserve metrics/operational orientation |
| audience-engine/src/routes/signals.tsx | Machine 1 | evolve into spatial realtime view |
| audience-engine/src/routes/funnel.tsx | Machine 3 | evolve into omnichannel conversion graph |
| audience-engine/src/routes/events.tsx | shared event explorer | connect to Event Bus |

## Priority D — functionality to import

From audience-engine:
- behavioral event taxonomy;
- campaign model;
- conversion/payment/recovery model;
- dashboard/funnel aggregations;
- geo machine configuration;
- realtime subscriptions;
- simulator scenarios.

From pub-machine:
- physical geometry;
- signal quality;
- consent gate;
- behavioral feature extraction;
- segmentation rules;
- evidence/provenance;
- decay;
- lead scoring;
- priority/SLA;
- decision idempotency;
- human approval.

## Explicit removals

Do not carry forward as an independent runtime:
- audience-engine `src/lib/engine/core.ts` as the canonical Lead/Decision brain;
- pub-machine `functions/api/[[path]].js` inline domain duplication.

The new runtime must have one implementation per domain.

## Frontend acceptance requirements

### Machine 1
Real-time spatial visualization with:
- machine latitude/longitude;
- radius;
- people tracked;
- people currently inside;
- enter/exit;
- dwell;
- signal source;
- accuracy/confidence;
- density visualization;
- isometric operational scene.

### Machine 2
Qualification hierarchy:
`Raw Signal -> Observation -> Behavior -> Pattern -> Audience -> Segment -> Intent -> Lead Intent`

Filters:
- event/source;
- zone;
- frequency;
- dwell;
- recurrence;
- recency;
- affinity;
- confidence;
- lifecycle;
- intent score;
- consent.

### Machine 3
Omnichannel acquisition and conversion:
- inbound and outbound;
- social networks;
- communication channels;
- paid acquisition;
- organic acquisition;
- prospecting;
- CRM;
- physical;
- commerce;
- decision/action;
- checkout/order/payment;
- recovery;
- feedback.

## Verification gates

1. Contracts compile.
2. Existing 32 PUB Machine tests remain green.
3. Persistence integration tests cover imported schema behavior.
4. Machine 1 E2E proves signal -> map/telemetry.
5. Machine 2 E2E proves signal -> audience -> intent.
6. Machine 3 E2E proves intent -> decision -> action -> conversion.
7. Cross-machine selection preserves causal identity.
8. Production API calls canonical services only.
9. No inline duplicate engine remains.
