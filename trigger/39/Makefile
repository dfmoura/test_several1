.PHONY: up down up-aws down-aws aws-check promote-prod build logs migrate seed seed-produtos-cadastro seed-estoque-virada limpar-operacional shell health doctor web-build orc-rbac queue-logs guia-pdf guia-pdf-parceiros guia-pdf-produtos

# Caminho canônico: docs/DEPLOY_LOCAL_AWS.md
# Local SEM docker-compose.local.yml = containers up sem :8039 → ERR_CONNECTION_REFUSED
COMPOSE_LOCAL := docker compose -f docker-compose.yml -f docker-compose.local.yml
COMPOSE_AWS   := docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws

up:
	cp -n .env.example .env 2>/dev/null || true
	$(COMPOSE_LOCAL) --env-file .env up -d --build
	@echo ""
	@echo "→ http://localhost:8039  (SPA + API)  [ERP_STAGE=local]"
	@echo "→ http://localhost:8000/api/v1/health"
	@echo "Login: admin@rlp.com.br / Admin@123"

down:
	$(COMPOSE_LOCAL) --env-file .env down

# Diagnóstico rápido: Docker + portas publicadas + health (evita chase de ERR_CONNECTION_REFUSED)
doctor:
	@echo "== Docker =="
	@docker info >/dev/null 2>&1 && echo "ok: daemon" || (echo "FAIL: Docker parado — sudo systemctl start docker"; exit 1)
	@echo "== Containers =="
	@$(COMPOSE_LOCAL) --env-file .env ps
	@echo "== Portas no host (precisa 8039) =="
	@docker port erp39_web 80 >/dev/null 2>&1 && docker port erp39_web 80 || (echo "FAIL: web sem publish — rode: make up"; exit 1)
	@echo "== Health =="
	@curl -sfS -m 5 http://localhost:8039/api/v1/health; echo
	@curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 5 http://localhost:8039/

up-aws:
	@test -f .env.aws || (echo "Crie .env.aws (cp .env.aws.homolog.example .env.aws) e rode make aws-check"; exit 1)
	./scripts/aws-ready-check.sh .env.aws
	$(COMPOSE_AWS) up -d --build
	@echo ""
	@echo "→ Stack AWS no ar. Health: curl -sS http://127.0.0.1:$${WEB_PORT:-80}/api/v1/health"

down-aws:
	@test -f .env.aws || (echo "Falta .env.aws"; exit 1)
	$(COMPOSE_AWS) down

aws-check:
	./scripts/aws-ready-check.sh $${ERP_ENV_FILE:-.env.aws}

promote-prod:
	./scripts/promote-homolog-to-production.sh

build:
	$(COMPOSE_LOCAL) --env-file .env build

logs:
	$(COMPOSE_LOCAL) --env-file .env logs -f app web mysql queue

queue-logs:
	$(COMPOSE_LOCAL) --env-file .env logs -f queue

migrate:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan migrate --force

seed:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan db:seed --force

# Catálogo Camada A (flags lote/validade). Idempotente; não zera custo_medio existente.
# Uso: make seed-produtos-cadastro
seed-produtos-cadastro:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:seed-produtos-cadastro $(ARGS)

# Virada de estoque (AJU A03 · consolidado 32 + tintas operacionais). Idempotente.
# SKU com saldo e controla_lote sem linhas em estoque_lotes: backfill (não altera qtde/CM).
# Uso: make seed-estoque-virada
#      make seed-estoque-virada ARGS='--dry-run'
#      make seed-estoque-virada ARGS='--incluir-demos --solicitante=diogomou@gmail.com'
seed-estoque-virada:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:seed-estoque-virada $(ARGS)

# Limpa operacional (PAR/PRD/ORC/OC/estoque/TIT) preservando ADMIN + seu PAR.
# Plataforma (EMP, RBAC, catálogos, naturezas, DEP, BEM, CFIN) permanece.
# Atenção: irreversível. Preferir --dry-run antes se duvidar.
limpar-operacional:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:limpar-operacional --force

orc-rbac:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan orcamento:ensure-rbac
	@echo "Saia e entre de novo no browser (Ctrl+Shift+R)."

shell:
	$(COMPOSE_LOCAL) --env-file .env exec app sh

health:
	curl -sS http://localhost:8039/api/v1/health; echo

web-build:
	cd apps/web && npm ci && npm run build
	$(COMPOSE_LOCAL) --env-file .env build web && $(COMPOSE_LOCAL) --env-file .env up -d web

guia-pdf: guia-pdf-parceiros guia-pdf-produtos

guia-pdf-parceiros:
	python3 scripts/gerar_guia_importacao_parceiros.py

guia-pdf-produtos:
	python3 scripts/gerar_guia_importacao_produtos.py
