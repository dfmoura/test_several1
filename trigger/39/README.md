# FLEXOERP — licenciado RLP (Fase 1)

Sistema operacional **Laravel 11 + MySQL 8 + React**: produto **FLEXOERP** da **TRIGGER**, licenciado à **RLP Etiquetas**.

Hierarquia canônica (não misturar):

```
TRIGGER → FLEXOERP (produto) → RLP (licenciado) → 1 instalação → EMP-00001 / EMP-00002 / …
```

O mesmo esqueleto vale para outro contrato (outro licenciado → EMPs X/Y/Z). Norma: [`docs/MODELO_INSTALACAO_MULTI_EMPRESA.md`](docs/MODELO_INSTALACAO_MULTI_EMPRESA.md).

Base normativa: `../32` (domínio, cadastros, RBAC, Lightsail/AWS Cenário D) · Proposta comercial v3: [`proposta/`](proposta/) (pacote R$ 25.000 · 20/80 · licença bonificada) · Histórico: `../37`.

## Escopo desta fase

| Item | Entrega |
|------|---------|
| **1.a** | Login Sanctum, usuários = colaboradores (PAR papel COLABORADOR), perfis RBAC/SoD |
| **1.b** | Empresas EMP-00001 / EMP-00002 + parâmetros versionados |
| **1.c** | Cadastro único de parceiros (papéis, crédito, CNPJ/CEP via BrasilAPI/ViaCEP, posição lat/lng do CEP) |
| **1.d** | Produtos por família MP · EMB · REV · PA · SVC · FAC + **grupos canônicos** (MP-PAP, PA-ETQ, REV-RIB…) |

**Fora desta entrega:** orçamento (1.e), compras, OP, NF, financeiro operacional.

## Identidade visual

Padrão canônico: [`docs/IDENTIDADE_TRIGGER.md`](docs/IDENTIDADE_TRIGGER.md) (modelo ecossistema × produto de `../12`).

| Camada | O que | Onde |
|--------|-------|------|
| Produto | `FLEXOERP` | Título de tela, sidebar, login |
| Licenciado | Logo RLP + “Licenciado para” | Herói do login e da sidebar |
| Fornecedor | Byline **por Trigger Data Intelligence**; rodapé com marca + nome completo em tipografia contida; docs **Powered by TRIGGER** | Permanente — nunca herói, nunca gritante |
| Empresa (EMP) | EMP ativa no header | Contexto operacional — **não** é marca |
| Plataforma | Favicon + título `FLEXOERP · TRIGGER` | Aba do browser |

Fonte front: `apps/web/src/lib/brand.ts` · back: `config('erp.brand')`.

Troca white-label: substituir `branding/cliente/*` + `productName` — a camada TRIGGER permanece; outro contrato = nova instalação.

## Subir (Docker — mesmo artefato para Lightsail)

Caminho canônico **local → homolog AWS → produção**: [`docs/DEPLOY_LOCAL_AWS.md`](docs/DEPLOY_LOCAL_AWS.md).  
Modelo **1 instalação × N empresas** (não confundir EMP com stage/VM): [`docs/MODELO_INSTALACAO_MULTI_EMPRESA.md`](docs/MODELO_INSTALACAO_MULTI_EMPRESA.md).

```bash
cp -n .env.example .env
make up
```

- App (SPA + API via nginx): http://localhost:8039  
- API direta: http://localhost:8000/api/v1/health  → `"stage":"local"`  
- Login: `admin@rlp.com.br` / `Admin@123`
- Demos: `comercial@rlp.com.br` … (perfis) / `Demo@123`
- Se `ERR_CONNECTION_REFUSED`: `make doctor` (quase sempre stack sem overlay local → rode `make up`)

Na AWS (homolog): `cp .env.aws.homolog.example .env.aws` → `make aws-check` → `make up-aws`.  
Virada produção: `make promote-prod`.

O Compose sobe também o worker `queue` (fila `database`) para jobs assíncronos futuros.

Frontend com HMR (opcional):

```bash
cd apps/web && npm run dev   # proxy /api → :8000
```

Parar:

```bash
make down
```

Higiene do banco **local/homolog** (documentos de teste → cadastro canônico + saldo de virada; plataforma e `audit_log` intactos):

```bash
make limpar-sistema
```

## Estrutura

```
apps/api/     Laravel 11 (API /api/v1, Sanctum, Spatie Permission, fila database)
apps/web/     React + TypeScript (Vite)
branding/     Logos TRIGGER + cliente RLP
docker/       PHP, Nginx, MySQL (memória enxuta) + worker queue
docs/         Deploy local→AWS, Lightsail, ADRs
```

## Lightsail (recomendação)

Ver `docs/LIGHTSAIL_E_FUTURO.md` e `docs/DEPLOY_LOCAL_AWS.md`. Resumo:

| Recurso | Escolha |
|---------|---------|
| Instância | **2 GB · 2 vCPU · 60 GB** (Ubuntu) |
| Compose | `docker-compose.yml` + `docker-compose.aws.yml` |
| TLS | Caddy/Nginx no host → `web:80` |
| Estágios | `ERP_STAGE=homolog` depois `production` |
| Secrets | `.env.aws` no host — nunca no git |
| Não usar no dia 1 | ALB, NAT, RDS, ElastiCache; MySQL/API publicados |

Após o 1º boot estável na AWS: `SEED_ON_BOOT=false` (já forçado pelo entrypoint em homolog/production).

## Domínio (invariants que o código respeita)

- Identidade dupla: `id` BIGINT + `codigo` legível  
- Usuário nasce de **colaborador** (PAR)  
- Soft-delete / inativar — sem apagar histórico  
- Multi-empresa por `empresa_id` + header `X-Empresa-Id` (**TRIGGER → produto → licenciado → 1 instalação → N EMPs** — [`docs/MODELO_INSTALACAO_MULTI_EMPRESA.md`](docs/MODELO_INSTALACAO_MULTI_EMPRESA.md))  
- EMP-00002 com venda/estoque **desligados** até homologação  
- LAI / grupo 9.xx **proibido**  
- **BEM ≠ G10:** patrimônio (`BEM-`) é ativo físico; `orc_catalogo_maquinas` é só tarifa ORC — ver [`docs/ADR_BEM_VS_ORC_MAQUINA.md`](docs/ADR_BEM_VS_ORC_MAQUINA.md)
- **Unidades do SKU:** dual canônico (`unidade_comercial` ↔ `unidade_interna` + `fator_conversao`); largura/comprimento/gramatura são insumos em `atributos` — **não** unidades alternativas Sankhya — ver [`docs/ADR_UNIDADES_PRODUTO.md`](docs/ADR_UNIDADES_PRODUTO.md)
- **Matriz ORC (R$/cm²):** parâmetro escalar `matriz_cm2` no Catálogo ORC (overlay híbrido); ORCs antigos mantêm snapshot — ver [`docs/ADR_ORC_PARAMETROS_ESCALARES.md`](docs/ADR_ORC_PARAMETROS_ESCALARES.md)
- **Frete estimado ORC:** faixas de kg no Catálogo (aba Frete) + Retirar/Entregar no fechamento; **não** no motor R1–R20 — ver [`docs/ADR_ORC_FRETE_ESTIMADO.md`](docs/ADR_ORC_FRETE_ESTIMADO.md)

## Licença e propriedade intelectual

**Proteção total da TRIGGER.** Este repositório **NÃO** é open source. Público ≠ permissão para usar, clonar o produto ou comercializar.

| | |
|--|--|
| Regime | Proprietário — reserva máxima — [`LICENSE`](LICENSE) (`LicenseRef-TRIGGER-Proprietary`) |
| Titular | TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA (TRIGGER Data Intelligence) |
| Objeto protegido | **Materiais TRIGGER**: código, docs, ADRs, schemas, domínio, motores, prompts, UX, marca, metodologias expressas e obras derivadas |
| Sem contrato | Só estudo / lab não comercial / citação com atribuição |
| Vedado | Uso comercial, SaaS, white-label não autorizado, clone/reimplementação substancial, blueprint para terceiros, treino de IA para fins comerciais |
| Licenciados | Qualquer cliente com **contrato escrito** — só no escopo desse contrato |
| MIT / Apache / GPL / CC | **Não** se aplicam aos Materiais TRIGGER |
| Norma | [`docs/ADR_LICENCIAMENTO_E_IP.md`](docs/ADR_LICENCIAMENTO_E_IP.md) |

Vale para **todos** os repositórios públicos e **todos** os licenciados. White-label do cliente na UI não altera a PI da TRIGGER.

Dependências (Laravel, React, etc.) seguem **suas** licenças — isso não abre os Materiais TRIGGER.

Pedidos comerciais / autorização: [https://www.triggerti.com](https://www.triggerti.com).

## Próximo (1.e+)

Orçamento ORC → **envio + link de aceite** (feito — ver `docs/ADR_ORC_LINK_APROVACAO.md`) → PED/NF (ainda não).

Link público: `{ORCAMENTO_PUBLIC_BASE_URL}/p/{token}` — em produção `https://flexorc.triggerti.com/p/...`.
