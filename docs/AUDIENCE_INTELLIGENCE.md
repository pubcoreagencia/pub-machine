# Audience Intelligence V0 — Especificação Técnica

**Módulo:** `src/audience/`  
**Status:** IMPLEMENTADO (V0 - Core Engine, Features, Segmentação e Bridge)  
**Data:** 2026-09-16  
**Repositório Canônico:** `pubcoreagencia/pub-machine`  

---

## 1. Princípio Arquitetural & Regra de Ouro

```
SIGNAL ──► AUDIENCE INTELLIGENCE ──► INTENT ──► LEAD INTELLIGENCE ──► CONVERSION
```

> **REGRA DE OURO:**  
> **Não transformar qualquer pessoa que apareceu em uma zona em “lead”.**  
> * Uma presença física ou interação é apenas um **sinal (RAW SIGNAL)**.
> * Uma coleção consistente e enriquecida de sinais forma um **perfil de audiência (AUDIENCE PROFILE)** com atributos comportamentais.
> * Múltiplas evidências acumuladas (dwell sustentado, frequência alta, perfil de afinidade) podem acionar um **sinal de intenção (INTENT SIGNAL)** via `IntentBridge`.
> * Somente com sinais de intenção consistentes o sistema alimenta a camada de **Lead Intelligence** para prospecção e scoring.

---

## 2. Separação de Domínios & Stores Desacoplados

O PUB Machine isola completamente os quatro níveis de armazenamento:

1. **`ISignalStore` (`src/signal/signal-store.ts`):** Ingestão bruta de telemetria física (coordenadas, acurácia, timestamp, transições de geofence).
2. **`IAudienceProfileStore` (`src/audience/audience-profile.store.ts`):** Atributos comportamentais agregados, afinidade de zonas e segmentos de audiência pseudonimizados.
3. **`IIntentSignalStore` (`src/audience/intent-signal.store.ts`):** Sinais explícitos de intenção gerados pela `IntentBridge` com força, confiança e decaimento temporal.
4. **`Lead Store / CRM` (`src/prospecting/`):** Oportunidades comerciais qualificadas, previsão de velocidade e cálculo de valor esperado.

---

## 3. Extração Determinística de Features (`BehavioralFeatureExtractor`)

A partir de métricas consolidadas de presença (`PresenceMetrics`), o extrator calcula:
* **Frequência Temporal:** Visitas por dia observado.
* **Intensidade de Dwell:** Permanência total, média por sessão e pico de permanência contínua.
* **Recência:** Intervalo em horas desde a última observação no cluster de zonas.
* **Recorrência:** Booleano determinístico confirmando se houve múltiplas visitas em dias distintos.
* **Afinidade de Zona (`ZoneAffinityMetric`):** Score de 0.0 a 1.0 balanceando número de visitas e tempo útil de permanência na respectiva zona.
* **Metadados de Inferência:** Toda inferência carrega obrigatoriamente `source`, `confidence`, `confidenceBand` ('LOW' | 'MEDIUM' | 'HIGH'), `timestamp`, `provenance` e `methodologyVersion`.

---

## 4. Engine de Segmentação Declarativa (`SegmentationEngine`)

Permite a definição de regras declarativas priorizadas sem hardcodar segmentos comerciais no código:

```typescript
export interface SegmentationRule {
  ruleId: string;
  targetSegmentId: string;
  targetSegmentName: string;
  description: string;
  active: boolean;
  priority: number;
  conditions: {
    minVisits?: number;
    minTotalDwellSeconds?: number;
    maxRecencyHours?: number;
    requiredZones?: string[];
    requiredCategories?: string[];
    minDistinctZones?: number;
    requiresRecurringPresence?: boolean;
    minAffinityScore?: { zoneId: string; minScore: number };
  };
}
```

---

## 5. Ponte de Intenção (`IntentBridge`)

A camada `IntentBridge` avalia o perfil de audiência e gera `BridgeIntentSignal` **exclusivamente sob evidência comprovada**:
* **Critérios de Ativação:** Match de segmentos-alvo, atingimento de limiar de permanência (ex: 10+ minutos em hub comercial), número mínimo de visitas ou score de afinidade com zona específica.
* **Propriedades do Sinal:**
  * `signalType`: Identificador canônico da intenção.
  * `strength`: Intensidade matemática (0.0 .. 1.0).
  * `confidence`: Nível de certeza da evidência.
  * `decayHalfLifeHours`: Taxa de decaimento temporal (ex: 72 horas).
  * `provenance`: Rastreabilidade com regra disparadora e evidências concretas.

---

## 6. Governança e Privacidade (LGPD / Privacy by Design)

1. **Zero PII:** Nomes, números de telefone, e-mails ou dados pessoais nunca constam no `AudienceProfile`. A chave é um identificador pseudonimizado rotativo.
2. **Proibição de Inferências Sensíveis:** Proibida qualquer tentativa de inferir gênero, raça, religião, orientação ou classe social a partir de dados geográficos.
3. **Bloqueio por Consentimento:** Sujeitos sem consentimento gravado com status `GRANTED` têm a agregação de perfil imediatamente recusada.
4. **Purge Atômico em Cascata:** O expurgo de um `subjectId` remove integralmente o histórico de telemetria, o perfil de audiência e todos os sinais de intenção correspondentes.
