# Orçamento Flexo — etiquetas flexográficas

Sistema web de geração de orçamentos que digitaliza a planilha `ORÇAMENTO OFICIAL … .xlsm`,
preservando a lógica de cálculo e as tabelas de custo.

## Stack

| Camada | Tecnologia |
|---|---|
| UI + API | Next.js 15 (App Router) + TypeScript |
| Motor | `@orcamento/pricing-engine` (puro, testável) |
| DB | PostgreSQL 16 |
| Auth | JWT httpOnly + bcrypt + papéis (ADMIN / VENDEDOR / ORCAMENTISTA) |
| Runtime | Docker Compose |

## Subir local (Docker)

Porta da aplicação: **3847** (verificada como livre no host).  
PostgreSQL exposto em **5433** (evita conflito com 5432).

```bash
docker compose up --build -d
```

Aguarde o healthcheck do Postgres e o seed. Depois:

- App: http://localhost:3847  
- Login: `admin@flexo.local` / `Admin@123`  
- Vendedor: `vendedor@flexo.local` / `Vendedor@123`

Healthcheck: http://localhost:3847/api/health

```bash
docker compose logs -f web
docker compose down
```

## Testes do motor (golden)

```bash
npm install
npm test
```

O caso **BANCA DO DINEI** compara cada componente com a planilha (tolerância &lt; R$ 0,01).

## Arquitetura (expansível)

```
packages/pricing-engine/   # domínio puro — sem I/O
apps/web/                  # HTTP, auth, Prisma, UI
data/catalogs/             # JSON extraído do XLSM (fonte do seed)
scripts/extract_xlsm.py    # re-importação da planilha
docs/                      # domínio + modelo de dados
```

Próximas fases possíveis sem reescrever o núcleo: fila de PDF, multi-tenant,
portal do cliente, integração ERP — o motor permanece isolado.

## Segurança (fase 1)

- Senhas com bcrypt (custo 12)
- Sessão JWT em cookie httpOnly / SameSite=Lax
- Papéis nas rotas admin
- Audit log em alteração de preços
- Secrets via env (`AUTH_SECRET` ≥ 32 chars)
- Breakdown de custo oculto na visão comercial do cliente

## Re-extrair planilha

```bash
python3 scripts/extract_xlsm.py
```

## Documentação

- [Glossário / domínio](docs/DOMAIN.md)
- [Modelo de dados](docs/DATA_MODEL.md)
