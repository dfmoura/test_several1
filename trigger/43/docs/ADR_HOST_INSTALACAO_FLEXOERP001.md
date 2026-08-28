# ADR — Host da instalação FLEXOERP (`flexoerp001`)

**Status:** Aceito · **Data:** 2026-08-28  
**Norma:** `DEPLOY_LOCAL_AWS.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md` · `ADR_TRANSICAO_FLEXORC_FLEXOERP.md` · `ADR_CERTIFICADO_A1_EMPRESA.md`  
**Escopo:** DNS/TLS e URLs públicas desta instalação (43).  
**Fora:** Multi-tenant SaaS por subdomínio dinâmico; segundo licenciado na mesma Lightsail.

## Contexto

O lab usou `https://flexorc.triggerti.com` via Cloudflare Tunnel → notebook (`:8043`) para link de ORC e webhook ASAAS. Homologação e produção passam a ficar **online na Lightsail**. O host oficial desta instalação é:

**`https://flexoerp001.triggerti.com`**

Misturar tunnel (notebook) com o domínio do cliente gera 502, porta errada e perda de confiança no envio da proposta.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Host oficial = `flexoerp001.triggerti.com`** | Um nome estável para login, link `/p/{token}`, webhooks e TLS |
| **Homolog e produção na Lightsail** com esse host (ou o mesmo IP até a virada de `ERP_STAGE`) | Mesmo artefato Compose; só `.env.aws` + DNS |
| **`flexorc.triggerti.com` = lab/ensaio** (tunnel → localhost) | Continua útil no notebook; **não** é origem de homolog/prod |
| **Preservar `APP_KEY` + banco** na AWS | A1, Focus e tokens cifrados dependem da chave — não regenerar |
| **`ORCAMENTO_PUBLIC_BASE_URL` = host oficial na AWS** | Link da proposta e callbacks batem no mesmo app |

```
[ notebook ]  make up (:8043)
     │  ensaio opcional: tunnel flexorc → :8043
     │  UI: localhost · ORCAMENTO no ensaio: flexorc
     ▼
[ Lightsail ]  make up-aws + .env.aws
     │  APP_URL = FRONTEND_URL = ORCAMENTO_PUBLIC_BASE_URL
     │           = https://flexoerp001.triggerti.com
     ▼
[ cliente ]  login + /p/{token} + webhooks no host oficial
```

## Configuração canônica (AWS)

No `.env.aws` (nunca no git):

```bash
APP_URL=https://flexoerp001.triggerti.com
FRONTEND_URL=https://flexoerp001.triggerti.com
ORCAMENTO_PUBLIC_BASE_URL=https://flexoerp001.triggerti.com
SANCTUM_STATEFUL_DOMAINS=flexoerp001.triggerti.com
ERP_STAGE=homolog   # ou production na virada
SEED_ON_BOOT=false
APP_DEBUG=false
# APP_KEY=…  ← a mesma já em uso se o banco/A1 já existem
```

Mais: `MAIL_*` + `VIAZAP_*` (envio da proposta) — `DEPLOY_LOCAL_AWS.md`.

## Lab (não confundir)

| Item | Lab | Homolog/prod |
|------|-----|----------------|
| Host público | `flexorc.triggerti.com` (tunnel) | `flexoerp001.triggerti.com` (Lightsail) |
| Ativar | `make ensaio-asaas-ativar` | DNS + TLS no host |
| Desativar tunnel | `make ensaio-asaas-desativar` | — |
| Porta tunnel | **8043** (esta instalação) | — |

## Não perder A1 / dados

1. Snapshot Lightsail + dump **antes** de mudar DNS ou `.env.aws`.  
2. **Não** gerar nova `APP_KEY` se o MySQL já tem A1/Focus cifrados.  
3. **Não** `SEED_ON_BOOT=true` em homolog/prod.  
4. Virada homolog → prod: preferir só `ERP_STAGE=production` + debug false, mesmo host e mesma chave.

## Consequências

- Docs e `.env.aws.*.example` desta pasta usam `flexoerp001` como oficial.  
- `aws-ready-check` recusa `flexorc` como base pública em **production**.  
- IDs billing `FLEXORC-CONTA-*` permanecem (ADR de transição) — host ≠ prefixo de cobrança.  
- `viazap.triggerti.com` continua gateway TRIGGER (instalação); não é o host do ERP.

## Checklist cutover

- [ ] DNS `flexoerp001.triggerti.com` → Lightsail  
- [ ] TLS 443 → `127.0.0.1:80` (web)  
- [ ] `.env.aws` com URLs oficiais + `APP_KEY` preservada  
- [ ] `make aws-check` + `make up-aws`  
- [ ] `GET /api/v1/health` → stage + `envio_proposta`  
- [ ] Login + EMP com A1 ainda apto  
- [ ] ORC → link em `https://flexoerp001.triggerti.com/p/...`  
- [ ] Webhooks ASAAS/Inter apontando para o host oficial (não flexorc)  
- [ ] Tunnel `flexorc` só no notebook, se ainda precisar de ensaio  
