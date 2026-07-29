# Reta Etiquetas — ERP (homologação)

Sistema web para gráfica flexográfica de etiquetas: orçamento → pedido/OS → estoque/compras → **NF-e de revenda + NFS-e de serviço** (Focus NFe) → **Bolepix** (Banco Inter) → entrega → recebimento.

Reconstrução profissional do protótipo em `trigger/27`, com arquitetura em camadas, identidade visual da marca e faturamento dual explícito.

## Stack

| Camada | Tecnologia |
|---|---|
| UI + API | Next.js 15 (App Router) + TypeScript |
| Motor de preço | `@orcamento/pricing-engine` (puro, testável) |
| Hub fiscal | `@reta/focus-nfe` → [Focus NFe](https://doc.focusnfe.com.br/reference/introducao) |
| Hub financeiro | `@reta/banco-inter` → [Bolepix](https://developers.inter.co/references/cobranca-bolepix) / [Extrato](https://developers.inter.co/references/banking#tag/Extrato) |
| DB | PostgreSQL 16 |
| Auth | JWT httpOnly + bcrypt + papéis |
| Runtime | Docker Compose |

## Ciclo operacional (ordem canônica)

1. **Comprar** — necessidades MRP → pedido de compra → NFe entrada (Focus)  
2. **Estoque** — lançar entrada · saldos físico / reservado / disponível  
3. **Orçamento** — wizard → aprovação → PDF comercial  
4. **Pedido / OS** — confirmar → explosão de materiais → produção  
5. **Notas fiscais** — **NF-e revenda** + **NFS-e serviço** (valores rateados pelos custos do motor)  
6. **Boletos** — Bolepix Inter no mesmo faturamento  
7. **Entrega** — registrar expedição  
8. **Recebimento** — baixar título (webhook / extrato)

## Faturamento dual

| Documento | Natureza | Hub Focus | Fixture |
|---|---|---|---|
| **NF-e** | Revenda de mercadoria (papel, acabamento, tubete, caixa) | `POST /v2/nfe` | `modelos/nfe/` |
| **NFS-e Nacional** | Prestação de serviço (impressão / composição gráfica) | `POST /v2/nfsen` | `modelos/nfse/` |

O rateio usa a proporção dos custos do pricing-engine (sem percentual fixo arbitrário). Em homologação (`simularProducao=true`) os XML/PDF são gerados localmente no formato dos modelos — sem POST externo.

## Subir local (Docker)

Porta da aplicação: **3848**. PostgreSQL: **5434**.

```bash
docker compose up --build -d
```

- App: http://localhost:3848  
- Login: `admin@flexo.local` / `Admin@123`  
- Health: http://localhost:3848/api/health

## Desenvolvimento sem Docker (app)

```bash
npm install
# Postgres em 5434 (compose só do db) ou ajuste DATABASE_URL
cp .env.example apps/web/.env
npm run db:migrate -w web
npm run db:seed -w web
npm run dev
```

## Arquitetura

```
packages/
  pricing-engine/   # domínio puro de cálculo (XLSM)
  focus-nfe/        # adaptador Focus (NFe / NFS-e / recebidas)
  banco-inter/      # adaptador Inter (Bolepix / extrato)
apps/web/
  src/domain/       # regras de negócio (ciclo, split dual)
  src/lib/          # orquestração (pedido, estoque, faturamento…)
  src/infra/        # (reservado) bridges HTTP
  src/app/          # UI App Router + API routes
modelos/            # fixtures XML/PDF oficiais (entrada, nfe, nfse)
docs/               # domínio + ciclo operacional
```

## Reset homologação (mantém cadastros)

```bash
npm run db:reset-ops
```

Ou em **Cadastros** (ADMIN): *Resetar dados operacionais*.

## Documentação

- [Ciclo operacional](docs/CICLO_OPERACIONAL.md)
- [Modelo de dados](docs/DATA_MODEL.md)
- [Arquitetura v2](docs/ARQUITETURA.md)
- [Glossário](docs/DOMAIN.md)





O Docker daemon não está rodando nesta máquina. Aqui estão os comandos para você executar no terminal:

# Rebuild e restart dos containers
docker compose down
docker compose up --build -d
# Acompanhar os logs
docker compose logs -f web
Ou se quiser rebuild sem cache (forçar atualização completa):


docker compose build --no-cache
docker compose up -d