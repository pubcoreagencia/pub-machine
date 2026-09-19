# Canonical Contracts

Este diretório define os contratos compartilhados entre engine, API, persistence e frontend.

## Entidades

- RawSignal
- Signal
- PhysicalZone
- GeofenceEvent
- PresenceMetrics
- BehavioralFeatures
- AudienceProfile
- AudienceSegmentAssignment
- IntentSignal
- LeadIntentProfile
- Lead
- LeadActionDecision
- DispatchResult
- Conversion
- RecoveryEvent
- MachineTelemetry
- MachineEvent

## Regras

1. IDs operacionais não expõem PII.
2. Todo sinal relevante deve possuir timestamp.
3. Sinais físicos devem carregar qualidade/provenance.
4. Intent precisa preservar evidência e decay.
5. Decisions precisam preservar evidence, confidence, provenance, expiration e deduplication.
6. Conversion precisa referenciar sua origem causal quando existente.
7. Contratos são independentes de framework.
8. Persistence adapters implementam os contratos sem contaminar a lógica de domínio.

## Cadeia causal

`RawSignal -> Signal -> AudienceProfile -> IntentSignal -> LeadIntent -> Lead -> Decision -> Dispatch -> Conversion -> Feedback`
