# NFS-e Nacional — Emissor Integrado

Sistema containerizado para emissão, consulta, cancelamento e substituição de NFS-e conforme o **Padrão Nacional**, integrando SEFIN Nacional e ADN com autenticação mTLS via certificado A1 e-CNPJ.

## Arquitetura

```
Clientes (ERP/CRM) → Traefik → nfse-api
                                    ↓
              Domínio (@nfse/domain + @nfse/application)
                                    ↓
         nfse-gov-client (SEFIN/ADN) + nfse-xml + MinIO
```

**Serviços:** `nfse-api`, `nfse-worker`, `nfse-sync`, `nfse-danfse`, `nfse-web` (console)  
**Infra:** PostgreSQL, Redis, RabbitMQ, MinIO, Prometheus/Grafana

---

## Passo a passo — usar o sistema (desenvolvimento)

### Pré-requisitos

- **Docker** e **Docker Compose** instalados
- `curl` (para testar a API)
- `pnpm` é **opcional** (só necessário se for rodar a API fora do Docker)

### 1. Entrar no projeto

```bash
cd nfse-nacional
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

O `.env.example` já define portas na faixa **18xxx** para evitar conflito com serviços comuns (3000, 8080, 5432, etc.). Se alguma porta ainda estiver ocupada, altere no `.env` as variáveis `NFSE_HOST_PORT_*`.

| Serviço | Variável | Porta padrão (host) |
|---------|----------|---------------------|
| API REST | `NFSE_HOST_PORT_API` | **18100** |
| DANFSe (PDF) | `NFSE_HOST_PORT_DANFSE` | **18101** |
| Traefik (proxy) | `NFSE_HOST_PORT_TRAEFIK` | **18180** |
| Traefik (dashboard) | `NFSE_HOST_PORT_TRAEFIK_DASHBOARD` | **18181** |
| PostgreSQL | `NFSE_HOST_PORT_POSTGRES` | **15432** |
| Redis | `NFSE_HOST_PORT_REDIS` | **16379** |
| RabbitMQ (UI) | `NFSE_HOST_PORT_RABBITMQ_UI` | **18672** |
| MinIO (console) | `NFSE_HOST_PORT_MINIO_CONSOLE` | **19001** |
| **Console web** | `NFSE_HOST_PORT_WEB` | **18102** |

### 3. Subir tudo com Docker

```bash
docker compose --profile dev up -d --build
```

Aguarde os containers ficarem saudáveis (cerca de 30–60 s na primeira vez).

Verificar status:

```bash
docker compose --profile dev ps
```

Logs da API (se algo falhar):

```bash
docker compose --profile dev logs -f nfse-api
```

### 4. Testar se a API está no ar

```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:18100/health/ready
```

Resposta esperada: JSON com status `ok` (HTTP 200).

### 4.1 Acessar o Console Web (painel administrativo)

Abra no navegador:

**http://localhost:18102**

| Campo | Valor padrão (dev) |
|-------|-------------------|
| Senha | `admin` (variável `NFSE_WEB_PASSWORD`) |

O console permite:

- **Dashboard** — visão geral, métricas e atividade recente
- **NFS-e** — listar, consultar, cancelar, substituir, baixar XML/PDF
- **Emitir** — formulário de emissão
- **DPS** — acompanhar declarações
- **Sincronização** — DF-e do ADN e forçar sync
- **Outbox** — eventos de integração
- **Auditoria** — log de ações
- **Sistema** — configuração, saúde e links de infraestrutura

Também funciona via Traefik:

```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:18180/health/ready
```

### 5. Emitir uma NFS-e de teste (API)

Em **dev**, o gov.br é simulado (`NFSE_GOV_MOCK=true`):

```bash
curl -X POST http://localhost:18100/v1/nfse \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "tomador": { "tipo": "PJ", "cpfCnpj": "98765432000100", "razaoSocial": "Tomador SA" },
    "servico": { "codigoServico": "010701", "descricao": "Desenvolvimento de software", "codigoMunicipioIncidencia": "3550308" },
    "valores": { "valorServico": 1500.00 }
  }'
```

Guarde a `chaveAcesso` retornada (50 dígitos).

### 6. Consultar, listar e baixar documentos

Substitua `{CHAVE}` pela chave de acesso retornada na emissão.

```bash
# Listar notas
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:18100/v1/nfse?limit=20"

# Consultar uma nota
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:18100/v1/nfse/{CHAVE}"

# Baixar XML
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:18100/v1/nfse/{CHAVE}/xml" -o nota.xml

# Baixar PDF (DANFSe)
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:18100/v1/nfse/{CHAVE}/danfse" -o nota.pdf
```

### 7. Cancelar ou substituir

```bash
# Cancelar
curl -X POST "http://localhost:18100/v1/nfse/{CHAVE}/cancelar" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{ "codigoMotivo": "1", "motivo": "Erro na emissão da nota" }'

# Substituir (mesmo payload da emissão + nova idempotency key)
curl -X POST "http://localhost:18100/v1/nfse/{CHAVE}/substituir" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "tomador": { "tipo": "PJ", "cpfCnpj": "98765432000100", "razaoSocial": "Tomador SA" },
    "servico": { "codigoServico": "010701", "descricao": "Desenvolvimento de software", "codigoMunicipioIncidencia": "3550308" },
    "valores": { "valorServico": 1500.00 }
  }'
```

### 8. Parar o ambiente

```bash
docker compose --profile dev down
```

Para remover volumes (banco zerado):

```bash
docker compose --profile dev down -v
```

---

## Autenticação

Todas as rotas de negócio exigem o header:

```
X-API-Key: dev-api-key-change-in-production
```

(Valor padrão do `.env`; altere em produção.)

Rotas `/health/*` não exigem autenticação.

---

## Desenvolvimento local (opcional, sem Docker na API)

Requer Node 18+ e pnpm:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
```

Suba só a infraestrutura:

```bash
docker compose --profile dev up -d postgres redis rabbitmq minio migrate
```

Rode migrações e API localmente:

```bash
pnpm db:migrate
pnpm --filter @nfse/api dev
```

A API local usa a porta interna `3000` (não a 18100 do Docker).

---

## Estrutura do monorepo

| Pacote | Responsabilidade |
|--------|------------------|
| `@nfse/domain` | Entidades, VOs, state machine |
| `@nfse/application` | Casos de uso, DB, storage |
| `@nfse/gov-client` | Adapters SEFIN/ADN |
| `@nfse/xml` | DPS builder, XMLDSig, GZip |
| `@nfse/shared` | Config, errors, logger |
| `@nfse/api` | REST API (Fastify) |
| `@nfse/worker` | Filas RabbitMQ + outbox |
| `@nfse/sync` | Polling ADN NSU |
| `@nfse/danfse` | Geração PDF local v2.0 |

## Ambientes

| Variável | dev | homolog | prod |
|----------|-----|---------|------|
| `NFSE_AMBIENTE` | dev | homolog | prod |
| `NFSE_GOV_MOCK` | true | false | false |
| Certificado | mock | A1 real | A1 produção |

## Homologação (Produção Restrita)

1. Definir `NFSE_AMBIENTE=homolog` e `NFSE_GOV_MOCK=false`
2. Colocar certificado A1 em `secrets/certificado.pfx` (montado em `/run/secrets/` no Docker)
3. Configurar senha via `secrets/certificado.senha` ou `NFSE_CERT_PASSWORD`
4. Definir `NFSE_CNPJ` **igual ao CNPJ do certificado** (validação automática do emitente)
5. Executar checklist em `PROJETO-NFSE-NACIONAL.md` §18.2

### Certificado A1 em desenvolvimento (assinatura real)

Para usar o certificado real mesmo com gov mock (`NFSE_GOV_MOCK=true`):

```bash
# secrets/certificado.pfx + secrets/certificado.senha
NFSE_CNPJ=53369941000163          # deve coincidir com o certificado
NFSE_C_MUN_EMISSOR=3170206        # município emissor (IBGE) — não vem no certificado
NFSE_CERT_REQUIRED=true           # ou false em dev (sobe com mock se senha errada)
NFSE_GOV_MOCK=true                 # gov simulado, assinatura XML real
```

Com certificado A1 carregado, **CNPJ e razão social do prestador** são preenchidos automaticamente na DPS/NFS-e (extraídos do certificado). **Município emissor** (`NFSE_C_MUN_EMISSOR`) e **inscrição municipal** (`NFSE_INSCRICAO_MUNICIPAL`) são sempre **manuais** (`.env`) — não constam no certificado nem no cartão CNPJ da Receita. Na emissão, a IM do **tomador** também é somente manual (campo opcional no console ou payload da API); a consulta `/v1/cadastro/cnpj` nunca retorna IM.

O sistema valida na inicialização:

- PFX legível e senha correta
- Certificado não expirado
- CNPJ do certificado = `NFSE_CNPJ`
- EKU Client Authentication (mTLS gov.br)

Consulte `GET /health/ready`, `GET /v1/admin/config` ou **Console → Emitir / Sistema** para ver os dados do emitente.

## Documentação

- [Especificação completa](./PROJETO-NFSE-NACIONAL.md)
- [OpenAPI interna](./docs/openapi/internal-api.yaml)
- [ADRs](./docs/adr/)
- [Runbooks](./docs/runbooks/)
- [Exemplos DANFSe](./docs/example/) — XML real + modelo `NOTA_NACIONAL_V2.jrxml`

### Pré-visualizar DANFSe a partir do XML de exemplo

```bash
pnpm --filter @nfse/danfse preview
# ou com caminhos customizados:
pnpm --filter @nfse/danfse preview docs/example/seu-arquivo.xml saida.pdf
```

## Versão XSD/Manual

- XSD referência: **1.00**
- Manual: Manual Integrado SNNFSe / Contribuintes API v1.2

## Licença

Uso interno — integração fiscal Brasil.



### 
Se acontecer de novo
cd /home/dfmoura/Documents/test_several1/trigger/20/nfse-nacional
docker compose --profile dev ps
docker compose --profile dev up -d nfse-web
Para subir tudo:

docker compose --profile dev up -d --build
Para ver por que o web caiu:

docker compose logs nfse-web --tail 50
Se ainda não abrir, me diga o que aparece em docker compose ps.