.PHONY: up down build logs migrate seed shell health web-build orc-rbac queue-logs guia-pdf guia-pdf-parceiros guia-pdf-produtos

up:
	cp -n .env.example .env 2>/dev/null || true
	docker compose up -d --build
	@echo ""
	@echo "→ http://localhost:8039  (SPA + API)"
	@echo "→ http://localhost:8000/api/v1/health"
	@echo "Login: admin@rlp.com.br / Admin@123"

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f app web mysql queue

queue-logs:
	docker compose logs -f queue

migrate:
	docker compose exec app php artisan migrate --force

seed:
	docker compose exec app php artisan db:seed --force

orc-rbac:
	docker compose exec app php artisan orcamento:ensure-rbac
	@echo "Saia e entre de novo no browser (Ctrl+Shift+R)."

shell:
	docker compose exec app sh

health:
	curl -sS http://localhost:8039/api/v1/health; echo

web-build:
	cd apps/web && npm ci && npm run build
	docker compose build web && docker compose up -d web

guia-pdf: guia-pdf-parceiros guia-pdf-produtos

guia-pdf-parceiros:
	python3 scripts/gerar_guia_importacao_parceiros.py

guia-pdf-produtos:
	python3 scripts/gerar_guia_importacao_produtos.py
