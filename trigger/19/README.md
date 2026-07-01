# B3 Carteira Previdenciária

Dashboard profissional para análise de carteira B3 a partir do **XLSX oficial** de movimentação da Área do Investidor.

## Stack

| Camada | Tecnologia |
|--------|------------|
| API | Python 3.12 + FastAPI |
| Banco | PostgreSQL 16 |
| Frontend | React 18 + TypeScript + Tailwind + Recharts |
| Infra | Docker Compose |
| Cotações | brapi.dev (gratuito) + fallback Yahoo Finance |

## Arquitetura

```
presentation/   → React dashboard (cards + gráficos)
application/    → PortfolioService (importação, consolidação)
domain/         → Parser B3, classificador, PositionCalculator
infrastructure/ → PostgreSQL, QuoteProvider, B3MovementParser
```

## Subir o sistema

```bash
cd trigger/19
docker compose up --build
```

Acesse: **http://localhost:4819**

## Importar movimentação

1. Baixe o XLSX em **Área do Investidor B3 → Movimentação**
2. Clique em **Importar XLSX** no dashboard
3. O sistema extrai tickers, deduplica movimentações e recalcula a carteira

## API

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/v1/imports` | Upload do XLSX |
| `GET /api/v1/dashboard` | Cards por ticker + KPIs |
| `GET /api/v1/tickers/{ticker}/timeline` | Gráficos de horizonte |

## Porta

- **4819** — frontend (nginx + proxy para API)
- API interna na rede Docker (porta 8000, não exposta)

## Escalabilidade

- Domínio isolado (regras testáveis sem banco)
- PostgreSQL para persistência e índices de deduplicação
- QuoteProvider com adapter plugável
- Pronto para evoluir com workers de sync B3, múltiplos portfólios e autenticação

## Teste local com arquivo de exemplo

```bash
curl -X POST http://localhost:4819/api/v1/imports \
  -F "file=@base13.xlsx"
```
