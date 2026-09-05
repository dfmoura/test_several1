# Deploy canônico: local → Lightsail (homolog) → produção

Caminho fechado do projeto `trigger/39`. Ajuste sempre **local**, valide, depois suba o **mesmo** Docker Compose na AWS. Homologação usa o artefato de produção; a “virada de chave” é só configuração (`.env.aws`) + DNS/TLS.

**Isto é só a camada de infra/ambientes.** Multi-empresa (N CNPJs na mesma instalação), papéis e checklist de aceite de produto: [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md).

## Diagrama

```
[ notebook ]  make up          → compose base + local.yml   (portas 8039/8000/33069)
      │
      │  git / rsync / scp do repo
      v
[ Lightsail Ubuntu 2GB ]  make up-aws  → compose base + aws.yml  (só :80 no host)
      │
      │  período de homologação (ERP_STAGE=homolog)
      v
[ virada ]  make promote-prod + .env.aws.production  → ERP_STAGE=production
```

## Pré-requisitos host AWS (uma vez)

1. Ubuntu + Docker + Compose plugin  
2. `sudo bash scripts/lightsail-setup-swap.sh` (swap 2 GB)  
3. Firewall Lightsail: **só 80/443** (e console/SSM; sem 22 aberto se possível)  
4. Caddy ou Nginx no host: `443 → 127.0.0.1:80` (container `web`)  
5. Snapshot automático diário do disco  

Instância alvo alinhada: **2 GB RAM · 2 vCPU · 60 GB SSD · 3 TB transfer**.

## Local (todos os dias)

```bash
cp -n .env.example .env
# APP_KEY: no 1º boot o entrypoint gera; preserve o .env
make up
# → http://localhost:8039
curl -sS http://localhost:8039/api/v1/health
# espera: "stage":"local"
# se browser der ERR_CONNECTION_REFUSED:
make doctor   # ou de novo: make up
```

**Causa clássica de `ERR_CONNECTION_REFUSED` em localhost:** containers no ar **sem** `docker-compose.local.yml` (compose base **não** publica `:8039`/`:8000` — proposital para AWS). Sempre `make up` (ou `.env` com `COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml`). Nunca `docker compose -f docker-compose.yml up` sozinho no notebook.

Arquivos:

| Arquivo | Papel |
|---------|--------|
| `docker-compose.yml` | Base segura (MySQL/API **sem** porta no host) |
| `docker-compose.local.yml` | Portas de conveniência (dev) — **obrigatório** no notebook |
| `.env` / `.env.example` | `ERP_STAGE=local`, `SEED_ON_BOOT=true`, `COMPOSE_FILE=…local.yml` |

## Homologação na AWS

```bash
cp .env.aws.homolog.example .env.aws
# Edite: APP_KEY, senhas, APP_URL, SANCTUM_*, ORCAMENTO_PUBLIC_BASE_URL
# Obrigatório para Zap/e-mail da proposta: MAIL_* (smtp) + VIAZAP_* (token)
# — git NÃO leva apps/api/.env; copie do motor local para .env.aws
./scripts/aws-ready-check.sh .env.aws
make up-aws
curl -sS https://homolog.seudominio.com.br/api/v1/health
# espera: "stage":"homolog", "debug":false
# espera: envio_proposta.mail_smtp_pronto=true e viazap_configurado=true
```

Regras do entrypoint em `homolog` / `production`:

- `SEED_ON_BOOT` é **forçado a false** (não reseeda no reboot)  
- Seed inicial (banco vazio): seed **manual** uma vez  
- `APP_DEBUG=true` + `ERP_STAGE=production` → **boot recusado**

### Por que Zap/e-mail funcionam no notebook e “morrem” na AWS

O código do envio (link + dual-canal) é o mesmo. O que **não** viaja no `git pull` / rsync do repo:

| Onde | Papel |
|------|--------|
| `apps/api/.env` (local, gitignored) | SMTP + `VIAZAP_TOKEN` que você configurou no lab |
| `.env.aws` (Lightsail, gitignored) | Fonte canônica na AWS — Compose injeta no container |

Sem `MAIL_MAILER=smtp` + credenciais e sem `VIAZAP_BASE_URL` + `VIAZAP_TOKEN` no `.env.aws`, o motor responde fail-soft (`email_motivo` / `zap_motivo`: `desligado` ou só `log`) — o link e o clipboard continuam, mas o disparo automático não sai.

Checklist após editar `.env.aws`:

```bash
# No notebook (gera arquivo com MAIL_*/VIAZAP_* a partir do lab):
make export-envio-proposta
# Copie /tmp/flexoerp-envio-proposta.env para a Lightsail e mescle no .env.aws

./scripts/aws-ready-check.sh .env.aws   # FAIL se production sem SMTP/ViaZap
make up-aws
curl -sS https://SEU_HOST/api/v1/health   # bloco envio_proposta
```

Normas: [`ADR_ORC_EMAIL_PROPOSTA.md`](ADR_ORC_EMAIL_PROPOSTA.md) · [`ADR_ORC_WHATSAPP_VIAZAP.md`](ADR_ORC_WHATSAPP_VIAZAP.md).

## Virada para produção

```bash
./scripts/promote-homolog-to-production.sh
# snapshot + dump + editar .env.aws (ERP_STAGE=production; PRESERVE APP_KEY)
./scripts/aws-ready-check.sh .env.aws
make up-aws
curl -sS https://flexoerp001.triggerti.com/api/v1/health
# espera: "stage":"production", "debug":false
```

Piloto DF-e (NF-e destinadas) após a virada: checklist em [`PILOTO_DFE_NFE_DESTINADAS.md`](PILOTO_DFE_NFE_DESTINADAS.md) · norma [`ADR_CAIXA_DFE_NFE_DESTINADAS.md`](ADR_CAIXA_DFE_NFE_DESTINADAS.md).

### Paridade código local × Lightsail (DF-e)

**Fonte da verdade:** git no notebook. A nuvem deve refletir o **mesmo commit/artefato** — não o contrário.

| Onde | O que fica igual | O que é só da nuvem (exceção legítima) |
|------|------------------|----------------------------------------|
| **Notebook** (`ERP_STAGE=local`) | UI caixa, API, amarrar, Baixar XML, jobs/testes, cofre A1 (código) | Sync SEFAZ desligado; use upload na OC, `php artisan dfe:amostra-local` ou `php artisan dfe:importar-xml-pasta /caminho` (XMLs reais → caixa) |
| **Lightsail** (`homolog`/`production`) | Mesmo código DF-e/A1 | A1 **apto** no cofre + `APP_KEY` + sync AN |

1. Após hotfix de emergência (SCP), **commitar no local no mesmo dia**.  
2. Conferir (só leitura, não mexe em `.env`/banco):

```bash
SSH_KEY=~/Downloads/LightsailDefaultKey-sa-east-1.pem \
  ./scripts/check-dfe-code-parity.sh
```

3. Se houver `DIFF`/`FALTA`: alinhar arquivos a partir do local → rebuild `web` se front mudou → rodar o check de novo.  
4. **Não** trocar `APP_KEY`, não restaurar dump, não misturar stage neste passo.  
5. Não exigir `dfe:amostra-local` / `dfe:importar-xml-pasta` na AWS — comandos só de ensaio no notebook.

**APP_KEY:** se mantiver o mesmo banco/dados cifrados (A1 / tokens IA/Focus), **preserve a chave**. Só gere chave nova com banco novo consciente. Norma: [`ADR_HOST_INSTALACAO_FLEXOERP001.md`](ADR_HOST_INSTALACAO_FLEXOERP001.md) · [`ADR_CERTIFICADO_A1_EMPRESA.md`](ADR_CERTIFICADO_A1_EMPRESA.md).

## Host oficial × lab (tunnel)

| Papel | Host | Onde |
|-------|------|------|
| **Oficial (homolog/prod)** | `https://flexoerp001.triggerti.com` | Lightsail — login, `/p/{token}`, webhooks |
| **Lab / ensaio** | `https://flexorc.triggerti.com` | Cloudflare Tunnel → notebook `:8043` |

Norma fechada: [`ADR_HOST_INSTALACAO_FLEXOERP001.md`](ADR_HOST_INSTALACAO_FLEXOERP001.md).

### Homolog / produção (Lightsail)

1. DNS `flexoerp001.triggerti.com` → IP/alvo da Lightsail.  
2. TLS no host (Caddy/Nginx): `443 → 127.0.0.1:80` (container `web`).  
3. Em `.env.aws` (mesmo valor nos três):

```bash
APP_URL=https://flexoerp001.triggerti.com
FRONTEND_URL=https://flexoerp001.triggerti.com
ORCAMENTO_PUBLIC_BASE_URL=https://flexoerp001.triggerti.com
SANCTUM_STATEFUL_DOMAINS=flexoerp001.triggerti.com
```

4. **Não** aponte `ORCAMENTO_PUBLIC_BASE_URL` para `flexorc` na AWS (tunnel de lab).  
5. Credenciais Cloudflare/R2 só no vault/`.env` — **nunca** no git. R2 não hospeda a página de aprovação.

### Lab: flexorc via Tunnel (notebook)

Enquanto o ERP roda no notebook (`make up` → **8043**), o tunnel serve link ORC + webhook ASAAS **só para ensaio**:

1. Em `/etc/cloudflared/config.yml` (antes do catch-all), `flexorc.triggerti.com` → `http://localhost:8043` (não 8039). Script: `sudo bash scripts/fix-cloudflared-flexorc-8043.sh`.  
2. DNS (uma vez): `cloudflared tunnel route dns --overwrite-dns triggerti-painel flexorc.triggerti.com`  
3. Ensaio: `make ensaio-asaas-ativar` → reiniciar stack → `make ensaio-asaas`  
4. ASAAS sandbox: webhook → `https://flexorc.triggerti.com/api/v1/webhooks/bancarios/asaas`  
5. UI pode continuar em `http://localhost:8043`; só `ORCAMENTO_PUBLIC_BASE_URL` usa o flexorc no ensaio.  
6. Desative quando não testar: `make ensaio-asaas-desativar`.

Em homolog/prod online, webhooks e links vão para **flexoerp001**, não para o tunnel.

Norma do ensaio: [`ADR_ENSAIO_ASAAS_FLEXORC.md`](ADR_ENSAIO_ASAAS_FLEXORC.md).

## O que NÃO muda entre estágios

- Mesmo `docker-compose.yml` + overlay aws  
- Mesmos containers: mysql · app · queue · web  
- Domínio de negócio (OC → MOV → TIT, ORC, etc.)  
- Relatórios “livres” fora do host (vibe coding) — não reintroduzir DomPDF no monólito  

## Checklist smoke (homolog e pós-virada)

Infra mínima abaixo. Aceite completo (multi-empresa + key user): [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md) §7.

- [ ] `/api/v1/health` → stage esperado, debug false  
- [ ] `envio_proposta` no health → `mail_smtp_pronto` + `viazap_configurado` (se dual-canal automático)  
- [ ] Login admin  
- [ ] Cadastro rápido (parceiro ou produto)  
- [ ] ORC + link público em `https://flexoerp001.triggerti.com/p/{token}` + smoke envio (e-mail/Zap)  
- [ ] A1 da EMP piloto ainda apto (mesma `APP_KEY`)  
- [ ] OC → receber → TIT (e BX se perfil financeiro)  
- [ ] MySQL **não** responde em IP público:3306  
- [ ] Troca/isolamento EMP (se N empresas) — ver modelo §7.B  

## Make

| Comando | Efeito |
|---------|--------|
| `make up` | Local |
| `make up-aws` | AWS com `.env.aws` |
| `make aws-check` | Valida `.env.aws` |
| `make export-envio-proposta` | Extrai SMTP/ViaZap do `apps/api/.env` local para colar no `.env.aws` |
| `make promote-prod` | Checklist de virada |
| `make ensaio-asaas` | Valida tunnel + ASAAS (webhook/Checkout) |
| `make ensaio-asaas-ativar` / `desativar` | Liga/desliga `ORCAMENTO_PUBLIC_BASE_URL` → flexorc |
| `make down` / `make down-aws` | Para stack |

Ver também: [`LIGHTSAIL_E_FUTURO.md`](LIGHTSAIL_E_FUTURO.md) · [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md) · [`ADR_HOST_INSTALACAO_FLEXOERP001.md`](ADR_HOST_INSTALACAO_FLEXOERP001.md).
