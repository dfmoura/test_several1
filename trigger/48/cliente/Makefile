COMPOSE = docker compose -f docker-compose.yml -f docker-compose.local.yml

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

test:
	$(COMPOSE) run --rm --build app php artisan test

migrate:
	$(COMPOSE) exec app php artisan migrate --force

logs:
	$(COMPOSE) logs -f --tail=100

aws:
	docker compose -f docker-compose.yml -f docker-compose.aws.yml up -d --build
