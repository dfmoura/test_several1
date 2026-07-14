# Sistema NFS-e Nacional (Docker)

Emissor local integrado ao **Padrão Nacional NFS-e** ([gov.br/nfse](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica)) com certificado A1 e-CNPJ (mTLS).

## O que faz

| Função | Como |
|--------|------|
| **Emitir NFS-e** | Painel web ou API REST → SEFIN Nacional |
| **Cancelar NFS-e** | Evento e101101 via SEFIN |
| **Notas recebidas** | Sincronização ADN — NFS-e emitidas por **outras empresas** contra o CNPJ do certificado (você como tomador) |

## Início rápido (homologação)

```bash
cd nfse-nacional
cp .env.example .env
# Edite .env: NFSE_AMBIENTE=homolog, NFSE_GOV_MOCK=false, IM, senhas
# Coloque certificado.pfx e certificado.senha em secrets/

docker compose --profile homolog up -d --build
```

| Serviço | URL |
|---------|-----|
| **Painel web** | http://localhost:18102 |
| **API** | http://localhost:18100 |

Senha do painel: `NFSE_WEB_PASSWORD` no `.env`  
API: header `X-API-Key` = `NFSE_API_KEY`

## Testar saúde

```bash
curl -H "X-API-Key: SUA_API_KEY" http://localhost:18100/health/ready
```

## Documentação

- `nfse-nacional/README.md` — guia técnico completo
- `nfse-nacional/MANUAL-PRODUCAO.txt` — passo a passo para leigos
- `nfse-nacional/docs/api-producao*.txt` — referência das APIs gov.br

## Produção

Após testar em homologação, altere no `.env`:

```
NFSE_AMBIENTE=prod
NFSE_GOV_MOCK=false
NFSE_CERT_REQUIRED=true
```

```bash
docker compose --profile prod up -d --build
```
