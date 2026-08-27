# NF-e MG — Emissor Integrado SEFAZ-MG

Sistema containerizado **multi-tenant** para emissão, consulta, cancelamento, carta de correção e inutilização de **NF-e modelo 55**, integrando **direto nos Web Services da SEFAZ-MG** (autorizadora própria — sem SVRS).

Cada cliente vendedor (emitente) cadastra **IE MG + certificado A1 e-CNPJ** dele. A softhouse não assina NF-e de produto de terceiro.

## Arquitetura

```
Clientes (ERP/CRM) → Traefik → nfe-api
                                   ↓
         Domínio (@nfe/domain + @nfe/application)
                                   ↓
      nfe-sefaz-client (SOAP MG) + nfe-xml + MinIO
```

**Serviços:** `nfe-api`, `nfe-worker`, `nfe-danfe`, `nfe-web` (console)  
**Infra:** PostgreSQL, Redis, RabbitMQ, MinIO, Prometheus/Grafana

---

## Passo a passo — usar o sistema (desenvolvimento)

### Pré-requisitos

- **Docker** e **Docker Compose**
- `curl` (para testar a API)

### 1. Entrar no projeto

```bash
cd nfe-mg
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Portas na faixa **19xxx** para não colidir com o NFS-e Nacional (18xxx).

| Serviço | Variável | Porta padrão (host) |
|---------|----------|---------------------|
| API REST | `NFE_HOST_PORT_API` | **19100** |
| DANFE (PDF) | `NFE_HOST_PORT_DANFE` | **19101** |
| **Console web** | `NFE_HOST_PORT_WEB` | **19102** |
| Traefik (proxy) | `NFE_HOST_PORT_TRAEFIK` | **19180** |
| PostgreSQL | `NFE_HOST_PORT_POSTGRES` | **16432** |
| Redis | `NFE_HOST_PORT_REDIS` | **17379** |
| RabbitMQ (UI) | `NFE_HOST_PORT_RABBITMQ_UI` | **19672** |
| MinIO (console) | `NFE_HOST_PORT_MINIO_CONSOLE` | **19111** |

### 3. Subir tudo com Docker

```bash
docker compose --profile dev up -d --build
```

Ou:

```bash
bash scripts/subir-sistema.sh dev
```

### 4. Testar a API

```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:19100/health/ready
```

### 4.1 Console Web

**http://localhost:19102**

| Campo | Valor padrão (dev) |
|-------|-------------------|
| Senha | `admin` |

O console permite:

- **Dashboard** — operação fiscal e saúde SEFAZ
- **NF-e** — listar, consultar, cancelar, CC-e, XML/DANFE
- **Emitir** — formulário de emissão (produtos)
- **Emitentes** — tenants, wizard A1, StatusServico, checklist SIARE
- **Parceiros** e **Produtos** — cadastros fiscais do emitente (ICMS + IBS/CBS/IS)
- **Inutilização** — furos de numeração
- **Lotes / Outbox / Auditoria**

Em **dev**, a SEFAZ é simulada (`NFE_SEFAZ_MOCK=true`). Dá para emitir, cancelar e gerar DANFE **sem certificado de cliente**.

### 5. Emitir uma NF-e de teste (API)

```bash
# 1. Listar emitentes e copiar o id
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:19100/v1/emitentes

# 2. Emitir (substitua EMITENTE_ID)
curl -X POST http://localhost:19100/v1/nfe \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "X-Emitente-Id: EMITENTE_ID" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "naturezaOperacao": "VENDA DE MERCADORIA",
    "destinatario": {
      "tipo": "PJ",
      "cpfCnpj": "98765432000100",
      "razaoSocial": "DESTINATARIO HOMOLOGACAO LTDA",
      "indIEDest": "9",
      "endereco": {
        "logradouro": "RUA EXEMPLO",
        "numero": "100",
        "bairro": "CENTRO",
        "codigoMunicipio": "3106200",
        "municipio": "BELO HORIZONTE",
        "uf": "MG",
        "cep": "30120000"
      }
    },
    "itens": [{
      "codigo": "SKU-001",
      "descricao": "Produto de teste",
      "ncm": "84713012",
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 1,
      "valorUnitario": 1500.00
    }]
  }'
```

### 6. Parar o ambiente

```bash
docker compose --profile dev down
```

---

## Autenticação

Rotas de negócio exigem:

```
X-API-Key: dev-api-key-change-in-production
```

Operações fiscais exigem também `X-Emitente-Id` (UUID do tenant), salvo quando há emitente padrão configurado.

`/health/*` não exige autenticação.

---

## Estrutura do monorepo

| Pacote | Responsabilidade |
|--------|------------------|
| `@nfe/domain` | Entidades, VOs, chave de acesso, state machine, ICMS |
| `@nfe/application` | Casos de uso, DB, storage, vault de certificado |
| `@nfe/sefaz-client` | Adapters SOAP SEFAZ-MG + mock |
| `@nfe/xml` | Builder infNFe 4.00, XMLDSig, lote, eventos |
| `@nfe/shared` | Config, errors, logger |
| `@nfe/api` | REST API (Fastify) |
| `@nfe/worker` | Polling RetAutorizacao + outbox |
| `@nfe/danfe` | Geração PDF DANFE local |

## Ambientes

| Variável | dev | homolog | prod |
|----------|-----|---------|------|
| `NFE_AMBIENTE` | dev | homolog | prod |
| `NFE_SEFAZ_MOCK` | true | false | false |
| `tpAmb` no XML | 2 | 2 | 1 |
| Endpoint | mock | `hnfe.fazenda.mg.gov.br` | `nfe.fazenda.mg.gov.br` |
| Certificado | mock | A1 do emitente piloto | A1 produção do emitente |

## Homologação real (SEFAZ-MG)

O emitente (seu cliente) precisa:

1. IE MG ativa
2. Credenciar NF-e homologação no [SIARE](https://www2.fazenda.mg.gov.br/sol/) apontando este software
3. Upload do A1 e-CNPJ no console (wizard)
4. StatusServico OK
5. Primeira nota com destinatário fictício (cStat 100)

A softhouse **não** assina XML com o próprio A1. Sem A1 do emitente o sistema cobre ~70% (XML, XSD, DANFE, mock, filas).

## Documentação

- [Especificação completa](./PROJETO-NFE-MG.md)
- [ADRs](./docs/adr/)
- [Runbooks](./docs/runbooks/)
- Estudo de origem: `../ESTUDO-NFE-MG-SOFTHOUSE-HOMOLOGACAO.txt`

## Versão normativa

- Modelo: **55**
- Layout: **NF-e 4.00 / PL_009**
- MOC: **7.0**
- Autorizadora: **SEFAZ-MG**

## Licença

Uso interno — integração fiscal Brasil.
