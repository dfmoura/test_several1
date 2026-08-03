# Reta Etiquetas — ERP Homologação

Sistema ERP para gráfica flexográfica de etiquetas, desenvolvido pela **Trigger** para apresentação e homologação com o cliente.

Baseado no estudo operacional completo (`trigger/32`) e reconstruído a partir do protótipo mais avançado (`trigger/28`), com cadastro multi-empresa alinhado à especificação oficial.

## Empresas

| Código | CNPJ | Papel |
|---|---|---|
| **EMP-00001** | **01.423.183/0001-10** | **Operação principal** — RLP ETIQUETAS AUTO ADESIVOS LTDA (marca Reta Etiquetas). Vendas, estoque, Focus, PED. |
| EMP-00002 | 58.820.046/0001-37 | Cadastrada no ERP; **venda desabilitada** até parecer Contador + Direção. |

- Ambiente fiscal: **Homologação** com `simularProducao=true` (XML/PDF locais, sem POST fiscal real).
- LAI / livro paralelo: **fora de escopo** (não implementado).

## Stack

| Camada | Tecnologia |
|---|---|
| UI + API | Next.js 15 (App Router) + TypeScript |
| Motor de preço | `@orcamento/pricing-engine` |
| Hub fiscal | `@reta/focus-nfe` → Focus NFe |
| Hub financeiro | `@reta/banco-inter` → Bolepix (sandbox); produção futura: **Sicoob** |
| DB | PostgreSQL 16 |
| Auth | JWT httpOnly + bcrypt + papéis |
| Runtime | Docker Compose |

## Ciclo operacional

Fluxo feliz comercial (estudo `INDICE_FLUXO_OPERACIONAL`):

1. **Orçamento (ORC)** — formulário → **calcular e salvar** → link de aprovação do cliente → PDF  
2. **Pedido (PED)** — crédito/sinal → liberar → confirmar → explosão  
3. **Produção (OP / OS)** — fila PCP + apontamento + sobra/retalho  
4. **Notas** — **NF-e produção própria** (PA-ETQ, CFOP 5101/6101; FAC na mesma nota) + TIT  
5. **Entrega (ENT)** — expedição  
6. **Recebimento (BX)** — baixa parcial/total  

Suporte (menu): **Estoque** e **Compras** (só quando OP para por falta — estudo §exceções).  

Códigos: `ORC-` / `PED-` / `OP-` / `OS-` / `TIT-` / `BX-` / `ENT-`.  
Detalhe: [docs/ALINHAMENTO_ESTUDO_32.md](docs/ALINHAMENTO_ESTUDO_32.md).

## Subir local (Docker)

Portas isoladas de outros ambientes Trigger:

| Serviço | Porta host |
|---|---|
| App ERP | **3849** |
| PostgreSQL | **5435** |

```bash
cd /home/dfmoura/Documents/test_several1/trigger/33
cp .env.example apps/web/.env   # se for desenvolver fora do compose
docker compose up --build -d
```

- App: http://localhost:3849  
- Login: `admin@reta.local` / `Admin@123`  
- Health: http://localhost:3849/api/health  
- Alias legado: `admin@flexo.local` / `Admin@123`

```bash
docker compose logs -f web
docker compose down
```

## Desenvolvimento sem Docker (app)

```bash
npm install
# Postgres via compose só do db, ou Docker completo
cp .env.example apps/web/.env
npm run db:migrate -w web
npm run db:seed -w web
npm run dev
```

## Identidade visual

- Marca produto: **Reta Etiquetas** (vermelho `#E31E24` · azul `#2E3192`)
- Logo: `apps/web/public/brand/logotipo-retaetiquetas.png`
- Crédito vendor: **Desenvolvido pela Trigger** (login + rodapé) → [triggerti.com](https://www.triggerti.com)

## Roadmap de ambientes

| Fase | Onde | Objetivo |
|---|---|---|
| **1 — Local HML** (agora) | Docker nesta pasta, porta 3849 | Apresentar ao cliente, validar fluxo |
| **2 — AWS Homologação** | EC2 + Compose / RDS (ver `docs/MIGRACAO_AWS.md`) | Homologação contínua acessível ao cliente |
| **3 — Produção** | AWS isolado, Focus/Sicoob reais, `simularProducao=false` | Operação diária após aceite |

## Reset homologação (mantém cadastros)

```bash
npm run db:reset-ops
```

Ou em **Cadastros** (ADMIN): *Resetar dados operacionais*.

## Documentação

- [Migração AWS](docs/MIGRACAO_AWS.md)
- [Ciclo operacional](docs/CICLO_OPERACIONAL.md)
- [Alinhamento ao estudo 32](docs/ALINHAMENTO_ESTUDO_32.md)
- [Modelo de dados](docs/DATA_MODEL.md)
- [Arquitetura](docs/ARQUITETURA.md)
- Estudo de domínio: `../32/` (61 documentos + MANUAL_UNICO)
