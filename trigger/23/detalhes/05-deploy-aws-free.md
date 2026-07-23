# Prompt · Deploy AWS Free Plan + Git (contexto operacional)

## Contexto

Conta AWS Free Plan com créditos (ex.: US$ 100 / meses restantes). Projeto no GitHub. Stack: Docker Compose + SQLite + app na porta 8096. Usuário iniciante em AWS.

## Objetivo

Deixar o sistema publicável de forma barata/coberta por créditos, puxando código do Git e buildando na nuvem, com acesso por IP/domínio (não localhost) e proteção por login do app.

## Arquitetura alvo (simples)

1. Repositório no **GitHub** (código)
2. **1 VM** (Lightsail ou EC2 micro) na AWS
3. Instalar Docker + Docker Compose
4. `git clone` / `git pull` + `docker compose up --build -d`
5. Firewall liberando HTTP (80/443 ou 8096)
6. Auth do app controla quem entra (ver `01-auth-papeis-limites.md`)

## Evitar (queima crédito)

- NAT Gateway, ALB/NLB sem necessidade, RDS, várias instâncias grandes

## Acesso

- **URL oficial (HTTPS):** `https://licitacoes.osbrasiluberlandia.org/`
- IP em HTTP só como contingência interna — não é o endereço de trabalho
- Auth: **uma sessão ativa por conta** (segundo login bloqueado até sair / Liberar sessão)
- Telas sensíveis só admin

## HTTPS na VM (Caddy + Let's Encrypt)

Pré-requisitos:

1. DNS A do `DOMAIN` → IP público da VM (já usado pelo Observatório)
2. Security group / firewall: **TCP 80** e **TCP 443** abertos (entrada)
3. Nada mais escutando na 80/443 (se o app estava em `80:8096`, pare e suba com o profile)

```bash
cd /caminho/do/projeto   # pasta com docker-compose.yml
git pull                 # se aplicável
export DOMAIN=licitacoes.osbrasiluberlandia.org
# Se a porta 80 estava no container do app:
# docker compose down
docker compose --profile https up -d --build
docker compose --profile https ps
curl -sI "https://${DOMAIN}/api/health"
```

- Certificado: automático via Let's Encrypt (volume `caddy_data`)
- Cookie de sessão: `AUTH_COOKIE_SECURE=auto` — flag `Secure` quando o request chega em HTTPS
- HTTP no domínio redireciona para HTTPS (comportamento padrão do Caddy)

## Critérios de aceite

- Clone do Git + build + app respondendo na URL pública
- SQLite persiste em volume/disco da VM
- Documentação curta no README: update via `git pull` + recreate
- Backup diário: `./scripts/install_backup_cron.sh` (ou cron equivalente)
- Healthcheck do Compose verde (`/api/health`)

## Nota

Este arquivo é **contexto de operação**. Auth, agendamento, IA e disciplina
operacional (`06-baseline-disciplina.md`) devem existir antes ou junto do go-live público.
