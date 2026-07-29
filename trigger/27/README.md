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

## Cadastro da empresa (raiz)

Cadastro único da emitente em **Cadastros → Empresa** (`/admin/empresa`):

- Dados fiscais (CNPJ, IE/IM, regime, CNAE, endereço)
- Ambiente `HOMOLOGACAO` / `PRODUCAO` com flag **simular produção** (teste ≈ produção sem emissão real)
- Certificados digitais A1/A3 (metadados + `.pfx` cifrado)

Parceiros, usuários e orçamentos ficam no escopo da empresa matriz.

Ver [modelo de dados](docs/DATA_MODEL.md).

## Cadastro de parceiros

Cadastro unificado em **Cadastros → Parceiros** (`/admin/parceiros`):

- Um registro, vários papéis: cliente / fornecedor / vendedor / usuário do sistema
- Acesso ao sistema (quando papel `USUARIO`) fica em `User`, vinculado ao parceiro
- No wizard, cliente e vendedor podem vir do cadastro ou texto livre

Ver [modelo de dados](docs/DATA_MODEL.md).

## Ciclo operacional (passo a passo na UI)

Ordem do menu e da home:

1. **Comprar** (`/compras`) — necessidades MRP → pedido de compra → NFe entrada → matching  
2. **Gerar estoque** (`/estoque` + lançar entrada) — saldos físico / reservado / disponível  
3. **Orçamento** (`/orcamentos`) — wizard → aprovação → PDF  
4. **Pedido e OS** (`/pedidos/[id]`) — confirmar → explosão de materiais → produção  
5. **Notas fiscais** — faturar NFS-e / NF-e (Focus)  
6. **Boletos** — Bolepix Inter no mesmo faturamento  
7. **Entrega** — registrar expedição  
8. **Recebimento** — baixar título  

Compra reativa por falta de material após confirmar o pedido continua disponível (deep-link `?pedido=`).

### Reset homologação (mantém cadastros)

```bash
npm run db:reset-ops
```

Ou em **Cadastros** (ADMIN): *Resetar dados operacionais*. Apaga orçamentos, pedidos, compras, estoque, NFs e títulos; preserva Empresa, Parceiros, Produtos, papéis/catálogos e usuários.

Ver [modelo de dados](docs/DATA_MODEL.md) e [ciclo operacional](docs/CICLO_OPERACIONAL.md).

## Orçamentos — aprovação e PDF

Na tela do orçamento (`/orcamentos/[id]`):

1. **Rascunho** → editar / excluir / enviar para aprovação / aprovar / reprovar / PDF  
2. **Aguardando aprovação** (`ENVIADO`) → ainda editar / excluir / decidir / PDF  
3. **Aprovado** ou **Reprovado** → somente consulta + PDF (imutável)

PDF comercial: A4 paisagem com logo (`public/brand/logotipo-retaetiquetas.png`), dados da empresa e consolidado sem breakdown de custo.

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
- [Ciclo operacional (pedido → OS → estoque → NF → boleto)](docs/CICLO_OPERACIONAL.md)

## Ciclo operacional (homologação)

Passo a passo na UI (Início → faixa do ciclo):

**Comprar → Estoque → Orçamento → Pedido/OS → Notas fiscais → Boletos → Entrega → Recebimento**

Após orçamento **aprovado**: Gerar pedido → Confirmar (ATP/reservas) → Compras/XML se faltar material → Produção → Faturar NFS-e (Focus) + Bolepix (Inter) → Entregar → Receber.

Em **Compras** (`/compras`):

1. **Necessidades** — faltas MRP (vários pedidos); deep-link `?tab=necessidades&pedido=`
2. **Pedidos de compra** — consolidado (PC #N), enviar ao fornecedor, receber NFe
3. **Entradas** — matching + lançar estoque

XML de exemplo do PC #2: `modelos/nfe-entrada/pedido-compra-2-banca-dinei.xml` (botão **Carregar XML de exemplo** / gerar XML fresco na tela).

Com `simularProducao=true` na Empresa, o fluxo fecha com documentos simulados (mesmo schema).

Reset limpo: `npm run db:reset-ops` (cadastros preservados).

## Fiscal (homologação Focus)

No faturamento o sistema decide **NFS-e**, **NF-e** ou **ambas** conforme `documentoSaidaPadrao` / tipo do produto:

| Caso | Documento |
|---|---|
| Impressões / serviço gráfico (padrão) | NFS-e Nacional (`cTribNac` 130501 / `cNBS` 121012100) |
| Produtos / mercadoria (`NFE` no produto) | NF-e (CFOP 5102, CSOSN 102) |
| Pedido misto | Ambas, com valores separados |

XML e DANFE/DANFSe seguem os modelos em `modelos/nfse` e `modelos/nfe` ([API Focus](https://doc.focusnfe.com.br/reference/introducao)). Pedido e OS têm PDF comercial/produção próprios.

Compras de insumos agregam necessidades de **vários pedidos/orçamentos** (mesmo produto consolida em uma linha).
