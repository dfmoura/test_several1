# Arquitetura do sistema (Docker)

Princípio: **toda regra de negócio fica no Pricing Engine**, desacoplada da UI. Excel deixa de ser runtime.

## Visão de containers

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  web (UI)   │────▶│  api (REST/JSON) │────▶│  postgres       │
│  Nginx+SPA  │     │  FastAPI/Node    │     │  catálogo+orç.  │
└─────────────┘     └────────┬─────────┘     └─────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ pricing-engine   │
                    │ (lib ou serviço) │
                    │ R1–R20           │
                    └──────────────────┘
```

Sugestão mínima Docker Compose:

| Serviço | Imagem / build | Porta | Função |
|---------|----------------|-------|--------|
| `db` | `postgres:16` | 5432 | Persistência |
| `api` | build `./backend` | 8000 | API + validações + orquestra engine |
| `web` | build `./frontend` | 80 | Interface |
| `engine` | (opcional) mesmo processo da API no MVP | — | Cálculo puro |

Volumes: dados Postgres; seed do catálogo oficial a partir do `ORÇAMENTO OFICIAL`.

## Módulos de software

| Módulo | Responsabilidade |
|--------|------------------|
| `catalog` | CRUD versionado de papel, tinta, HM, acabamentos, tubete, caixa, matriz |
| `dies` (facas) | Catálogo MAPA DE FACAS |
| `quotes` | CRUD orçamento + faixas + overrides |
| `pricing_engine` | R1–R20 puro (sem I/O) |
| `validation` | Campos obrigatórios, tubete válido, cores, faixas ≥1 |
| `proposal` | Monta consolidado / PDF |
| `stock` | **Fase 2** — leitura de estoque |

## Camadas

1. **Interface** — coleta entradas; nunca calcula preço.
2. **API** — autenticação futura, DTOs, persistência, chama engine.
3. **Validação** — schema + regras de domínio (ex.: tubete ∈ {1", 3"}).
4. **Cálculo** — funções determinísticas; entrada = snapshot de preços + parâmetros do job.
5. **Geração** — proposta consolidada + export.
6. **Dados** — Postgres (entidades do modelo de domínio).

## APIs (esboço)

```
POST /catalog/versions          # nova versão de preços
GET  /catalog/current
POST /quotes                    # cria orçamento (entradas)
POST /quotes/{id}/calculate     # recalcula com snapshot/overrides
GET  /quotes/{id}
GET  /quotes/{id}/proposal
PATCH /quotes/{id}/overrides    # readequação de preços
```

## Banco (núcleo)

- `clients`, `dies`, `papers`, `finishes`, `machines`, `cores`, `tubes`, `stop_types`
- `price_lists`, `price_list_items` (versão + vigência)
- `quotes`, `quote_lines` (faixas), `quote_price_snapshots`, `quote_results`
- (fase 2) `stock_items`, `stock_movements`

## Testes de regressão (obrigatório)

Fixtures JSON extraídas dos casos reais:
- BANCA DO DINEI (oficial)
- BRAHVA (com overrides de tinta/papel + regra troca produto)
- ART MOVEIS (cores 0, 5 faixas, tubete 1")
- RAREPAN (imposto 18%, tinta 0,6)

Aceite: diferença ≤ R$ 0,01 nos totais **após** aplicar regras validadas (BRAHVA 1ª faixa diverge do Excel em cache por causa da regra 3).

## Docker — requisitos não funcionais

- `docker compose up` sobe stack completa
- Variáveis via `.env` (DB URL, etc.)
- Sem dependência de Excel/LibreOffice em runtime
- Engine testável offline (`pytest` / equivalente no container `api`)
