COMPOSE = docker compose

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

test:
	$(COMPOSE) run --rm --no-deps api pytest -q

logs:
	$(COMPOSE) logs -f --tail=100

health:
	curl -fsS http://127.0.0.1:8051/health
