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
./scripts/aws-ready-check.sh .env.aws
make up-aws
curl -sS https://homolog.seudominio.com.br/api/v1/health
# espera: "stage":"homolog", "debug":false
```

Regras do entrypoint em `homolog` / `production`:

- `SEED_ON_BOOT` é **forçado a false** (não reseeda no reboot)  
- Seed inicial (banco vazio): seed **manual** uma vez  
- `APP_DEBUG=true` + `ERP_STAGE=production` → **boot recusado**

## Virada para produção

```bash
./scripts/promote-homolog-to-production.sh
# snapshot + dump + editar .env.aws
./scripts/aws-ready-check.sh .env.aws
make up-aws
curl -sS https://erp.seudominio.com.br/api/v1/health
# espera: "stage":"production", "debug":false
```

**APP_KEY:** se mantiver o mesmo banco/dados cifrados (tokens IA/Focus), **preserve a chave da homolog**. Só gere chave nova com banco novo consciente.

## Subdomínio da proposta (`flexorc`)

O link de aprovação do ORC usa `ORCAMENTO_PUBLIC_BASE_URL` (prod: `https://flexorc.triggerti.com`).

1. DNS: CNAME `flexorc.triggerti.com` → **mesmo** alvo do ERP (não é site separado nem R2).
2. TLS + vhost do nginx/Caddy aceitam o host `flexorc.*` e servem o mesmo SPA/API.
3. Em `.env.aws`: `ORCAMENTO_PUBLIC_BASE_URL=https://flexorc.triggerti.com` e inclua o host em `SANCTUM_STATEFUL_DOMAINS` se login no mesmo domínio for necessário (a página `/p/{token}` é pública e não usa Sanctum).
4. Credenciais Cloudflare/R2 ficam só no vault/`.env` — **nunca** no git. R2 não hospeda a página de aprovação.

### Teste local com flexorc via Tunnel

Enquanto o ERP ainda roda no notebook (`make up` → porta **8039**), dá para servir o link do cliente em `https://flexorc.triggerti.com` com o Cloudflare Tunnel já usado pelo painel (`triggerti-painel`):

1. Incluir **antes** do catch-all no config do tunnel (em máquinas com serviço systemd: `/etc/cloudflared/config.yml`; senão `~/.cloudflared/config.yml`):

```yaml
  - hostname: flexorc.triggerti.com
    service: http://localhost:8039
```

2. DNS (uma vez): `cloudflared tunnel route dns --overwrite-dns triggerti-painel flexorc.triggerti.com`
3. Reiniciar o conector: `systemctl restart cloudflared` (ou `cloudflared tunnel run triggerti-painel`).
4. No `.env` local: `ORCAMENTO_PUBLIC_BASE_URL=https://flexorc.triggerti.com` (mantenha `APP_URL`/`FRONTEND_URL` em `http://localhost:8039` para o comercial).
5. Suba o stack (`make up`).
6. Smoke: `curl -sS https://flexorc.triggerti.com/api/v1/health` (espera `"stage":"local"`) e envie um ORC — a mensagem deve trazer `https://flexorc.triggerti.com/p/...`.

**Atenção:** com o tunnel ligado o app local fica público. Pare o conector / desligue a regra quando não estiver testando.

## O que NÃO muda entre estágios

- Mesmo `docker-compose.yml` + overlay aws  
- Mesmos containers: mysql · app · queue · web  
- Domínio de negócio (OC → MOV → TIT, ORC, etc.)  
- Relatórios “livres” fora do host (vibe coding) — não reintroduzir DomPDF no monólito  

## Checklist smoke (homolog e pós-virada)

Infra mínima abaixo. Aceite completo (multi-empresa + key user): [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md) §7.

- [ ] `/api/v1/health` → stage esperado, debug false  
- [ ] Login admin  
- [ ] Cadastro rápido (parceiro ou produto)  
- [ ] ORC + link público `/p/{token}`  
- [ ] OC → receber → TIT (e BX se perfil financeiro)  
- [ ] MySQL **não** responde em IP público:3306  
- [ ] Troca/isolamento EMP (se N empresas) — ver modelo §7.B  

## Make

| Comando | Efeito |
|---------|--------|
| `make up` | Local |
| `make up-aws` | AWS com `.env.aws` |
| `make aws-check` | Valida `.env.aws` |
| `make promote-prod` | Checklist de virada |
| `make down` / `make down-aws` | Para stack |

Ver também: [`LIGHTSAIL_E_FUTURO.md`](LIGHTSAIL_E_FUTURO.md) · [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md).
