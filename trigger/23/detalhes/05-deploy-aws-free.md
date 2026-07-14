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

- Usuários acessam `http://IP-PUBLICO:8096` (ou domínio depois)
- Não usam `localhost`
- Telas sensíveis só admin

## Critérios de aceite

- Clone do Git + build + app respondendo na URL pública
- SQLite persiste em volume/disco da VM
- Documentação curta no README: update via `git pull` + recreate
- Backup diário: `./scripts/install_backup_cron.sh` (ou cron equivalente)
- Healthcheck do Compose verde (`/api/health`)

## Nota

Este arquivo é **contexto de operação**. Auth, agendamento, IA e disciplina
operacional (`06-baseline-disciplina.md`) devem existir antes ou junto do go-live público.
