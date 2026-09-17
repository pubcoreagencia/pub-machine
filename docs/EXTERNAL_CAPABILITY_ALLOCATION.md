# PUB Machine | External Capability Allocation

**Status:** Canonical direction
**Date:** 2026-09-16

## Purpose

Registrar as capacidades operacionais extraídas do research externo que pertencem ao PUB Machine.

**Princípio:** não importar projetos inteiros; incorporar capacidades quando houver necessidade operacional e contrato claro.

## Primary capabilities

### Coolify
Source: https://github.com/coollabsio/coolify

Referência para o substrato de infraestrutura e operação:

`Infrastructure Registry → Servers → Applications → Databases → Services → Deployments → Health → Logs → Rollback → Backup`

PUB Machine deve tratar infraestrutura como capacidade operacional, evitando que cada produto invente seu próprio deployment/runtime.

### Maxun
Source: https://github.com/getmaxun/maxun

Referência para:

- web extraction;
- structured data;
- crawling;
- search/extraction jobs;
- scheduling;
- APIs/SDK/CLI;
- OCR quando necessário;
- MCP como interface futura.

Uso prioritário: aquisição de dados, pesquisa de mercado, inteligência competitiva, monitoramento e geração de sinais para PUB Leads/Growth AI.

### Crawl4AI
Source: https://github.com/unclecode/crawl4AI

Referência para crawler/scraper LLM-friendly:

- Markdown limpo para RAG;
- structured extraction;
- LLM extraction;
- chunking;
- BM25/cosine similarity;
- browser integration;
- sessions/profiles;
- cache;
- screenshots;
- deep crawling;
- API/remote execution.

### Browser Use
Source: https://github.com/browser-use/browser-use

Referência para browser runtime orientado a agente:

- navigate;
- click;
- type;
- extract;
- screenshot;
- persistent session/profile;
- browser state;
- local/cloud browser.

Browser Use é uma capacidade de execução do Machine, não o cérebro do sistema.

## Canonical execution flow

`PDL/ACP request → PUB Machine capability → browser/crawler/infrastructure runtime → normalized result → consumer`

Quando o resultado possuir valor cognitivo:

`PUB Machine → PUB Neural`

Neural recebe evidências, observações, entidades e relações. Não recebe responsabilidade pelo runtime de captura.

## Operational priorities

### P0
- Definir capability contracts para browser e web capture.
- Isolar sessões, credenciais, profiles, cache e network policies.
- Normalizar resultados de captura.
- Segurança/allowlists/timeouts/logs para execução externa.

### P1
- Browser runtime baseado em capacidades compatíveis com Browser Use.
- Crawler/extraction runtime baseado em Crawl4AI.
- Structured extraction/scheduled collection inspirados em Maxun.
- Infra registry e deployment primitives inspirados em Coolify.

### P2
- Unified job scheduler.
- OCR/deep crawling avançado.
- Remote browser workers.
- MCP interfaces quando justificadas.

## Ownership boundaries

- **PUB Machine:** execução física/técnica.
- **PUB Neural:** memória, conhecimento, evidência e relações.
- **PDL:** decisão e planejamento de engenharia.
- **ACP:** controle/execução governada.
- **Control Room:** operação e observabilidade.
- **PUB Leads/Growth AI:** uso comercial dos dados coletados.

## Non-duplication rules

1. Não transformar PUB Machine em PUB Neural.
2. Não criar crawler dentro de PUB Neural.
3. Não criar browser runtime dentro de PDL.
4. Não transformar Control Room em infraestrutura.
5. Não copiar Coolify, Maxun, Browser Use ou Crawl4AI como aplicações inteiras.
6. Preferir adapters, workers e contracts sobre forks internos sem necessidade.
