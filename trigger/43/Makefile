.PHONY: up down up-aws down-aws aws-check promote-prod build logs migrate seed seed-produtos-cadastro seed-estoque-virada seed-estoque-enderecos limpar-estoque preparar-ensaio-estoque limpar-operacional limpar-sistema promover-conta limpar-livro-conta alinhar-primeiro-cadastro shell health doctor web-build orc-rbac condicao-pagamento-pronto backlog-pronto formulas-orc-pronto plataforma-pronto queue-logs guia-pdf guia-pdf-parceiros guia-pdf-produtos ensaio-asaas ensaio-asaas-ativar ensaio-asaas-desativar ensaio-asaas-tunnel cenario-mensalidade-pos-cortesia ci-flexorc export-envio-proposta

# Caminho canônico: docs/DEPLOY_LOCAL_AWS.md
# Local SEM docker-compose.local.yml = containers up sem :8043 → ERR_CONNECTION_REFUSED
COMPOSE_LOCAL := docker compose -f docker-compose.yml -f docker-compose.local.yml
COMPOSE_AWS   := docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws

up:
	cp -n .env.example .env 2>/dev/null || true
	$(COMPOSE_LOCAL) --env-file .env up -d --build
	@echo ""
	@echo "→ http://localhost:8043  (SPA + API)  [ERP_STAGE=local]"
	@echo "→ http://localhost:8043/api/v1/health"
	@echo "Login: /login  ·  conta master: plataforma:criar-conta  ·  alinhar: make alinhar-primeiro-cadastro EMAIL=…"

down:
	$(COMPOSE_LOCAL) --env-file .env down

# Diagnóstico rápido: Docker + portas publicadas + health (evita chase de ERR_CONNECTION_REFUSED)
doctor:
	@echo "== Docker =="
	@docker info >/dev/null 2>&1 && echo "ok: daemon" || (echo "FAIL: Docker parado — sudo systemctl start docker"; exit 1)
	@echo "== Containers =="
	@$(COMPOSE_LOCAL) --env-file .env ps
	@echo "== Portas no host (precisa 8043) =="
	@docker port erp43_web 80 >/dev/null 2>&1 && docker port erp43_web 80 || (echo "FAIL: web sem publish — rode: make up"; exit 1)
	@echo "== Health =="
	@curl -sfS -m 5 http://localhost:8043/api/v1/health; echo
	@curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 5 http://localhost:8043/

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

# Extrai MAIL_*/VIAZAP_* do apps/api/.env local → arquivo para mesclar no .env.aws (Lightsail).
export-envio-proposta:
	./scripts/export-envio-proposta-env.sh $${OUT:-/tmp/flexoerp-envio-proposta.env}

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

# Gabarito 6×4×4 vãos (ADR_CADASTRO_INSUMO_VOLUME F4). Idempotente.
# Uso: make seed-estoque-enderecos
seed-estoque-enderecos:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:seed-estoque-enderecos $(ARGS)

# Limpa operacional (PAR/PRD/ORC/PED/OP/FAT/OC/estoque/TIT) preservando ADMIN + seu PAR.
# Plataforma (EMP, RBAC, catálogos, naturezas, DEP, BEM, CFIN, hubs) e audit_log permanecem.
# Zera só o ledger de estoque da EMP (saldos/lotes/MOV/AJU/INV/NF-e entrada).
# Preserva produtos, PAR, endereços, DF-e na caixa; reabre OC recebida. Lab only.
# Uso: make limpar-estoque
#      make limpar-estoque ARGS='--dry-run'
#      make limpar-estoque ARGS='--empresa=EMP-00001'
limpar-estoque:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:limpar-estoque --force $(ARGS)

# Monta cenário local: estoque_ativo + OC + DF-e amostra amarrada (saldo continua 0 até você receber).
# Uso: make preparar-ensaio-estoque
#      make preparar-ensaio-estoque ARGS='--sem-amarrar'
preparar-ensaio-estoque:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:preparar-ensaio-estoque $(ARGS)

# Atenção: irreversível nos documentos. Preferir make limpar-sistema (repor cadastro + virada).
# Uso: make limpar-operacional
#      make limpar-operacional ARGS='--dry-run'
limpar-operacional:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:limpar-operacional --force $(ARGS)

# Higiene canônica do lab/homolog (estudo 32: virada por cadastro + saldo, sem histórico de teste).
# 1) documentos/lixo  2) seed idempotente (users, PAR, 89 famílias, BEM)  3) AJU A03 de abertura.
# Não herda ARGS de limpar-operacional (dry-run não deve repor estoque).
limpar-sistema:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:limpar-operacional --force
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan db:seed --force
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan erp:seed-estoque-virada

# Conta FLEXORC canônica: preserva o e-mail + operador TRIGGER; remove demais contas/EMPs.
# O livro da conta (PAR/ORC/catálogo) permanece. Não restaura demo RLP.
# Uso: make promover-conta EMAIL=varandasdorio1@gmail.com
#      make promover-conta EMAIL=… ARGS='--dry-run'
promover-conta:
	@test -n "$(EMAIL)" || (echo "Informe EMAIL=…"; exit 1)
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan plataforma:promover-conta $(EMAIL) --force $(ARGS)

# Zera o livro de UMA conta FLEXORC (EMPs + ORC/TIT/PAR/catálogo). Preserva login + mensalidade.
# Uso: make limpar-livro-conta EMAIL=varandasdorio1@gmail.com
#      make limpar-livro-conta EMAIL=… ARGS='--dry-run'
limpar-livro-conta:
	@test -n "$(EMAIL)" || (echo "Informe EMAIL=…"; exit 1)
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan plataforma:limpar-livro-conta $(EMAIL) --force $(ARGS)

# Primeiro cadastro FLEXORC: conta vira USR-00001; remove legado demo RLP.
# Uso: make alinhar-primeiro-cadastro EMAIL=varandasdorio1@gmail.com
#      make alinhar-primeiro-cadastro EMAIL=… ARGS='--dry-run'
alinhar-primeiro-cadastro:
	@test -n "$(EMAIL)" || (echo "Informe EMAIL=…"; exit 1)
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan plataforma:alinhar-primeiro-cadastro $(EMAIL) --force $(ARGS)

orc-rbac:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan orcamento:ensure-rbac
	@echo "Saia e entre de novo no browser (Ctrl+Shift+R)."

# Fórmulas ORC parametrizadas: seed de parâmetros do motor em todas as EMPs + testes + SPA.
formulas-orc-pronto:
	@chmod +x scripts/formulas-orc-pronto.sh
	./scripts/formulas-orc-pronto.sh

# Condições de pagamento: RBAC + seed canônico + rebuild SPA (menu Cadastros).
condicao-pagamento-pronto:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan migrate --force
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan condicao-pagamento:ensure-rbac
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan condicao-pagamento:ensure-sugestoes
	$(MAKE) web-build
	@echo ""
	@echo "→ http://localhost:8043/condicoes-pagamento"
	@echo "→ Cadastros → Condições de pagamento  ·  hard refresh Ctrl+Shift+R"

# Backlog: RBAC consulta nos papéis + cache + rebuild SPA.
backlog-pronto:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan migrate --force
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan cache:clear
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan permission:cache-reset
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan backlog:ensure-rbac
	$(COMPOSE_LOCAL) --env-file .env exec app php vendor/bin/phpunit --filter BacklogTest
	$(MAKE) web-build
	@echo ""
	@echo "→ http://localhost:8043/backlog"
	@echo "→ Cadastros → Backlog  ·  hard refresh Ctrl+Shift+R  ·  logout/login se a sessão for antiga"

# Console TRIGGER (lab): RBAC + operador + phpunit ConsolePlataformaTest.
# Override: PLATAFORMA_OPS_EMAIL=… PLATAFORMA_OPS_PASSWORD=… make plataforma-pronto
plataforma-pronto:
	@chmod +x scripts/plataforma-pronto.sh
	./scripts/plataforma-pronto.sh

shell:
	$(COMPOSE_LOCAL) --env-file .env exec app sh

health:
	curl -sS http://localhost:8043/api/v1/health; echo

# Regressão FLEXORC: multi-EMP + fatia comercial (norma §7.B + ORC/sinal/onboarding).
ci-flexorc:
	@chmod +x scripts/ci-flexorc.sh
	./scripts/ci-flexorc.sh

# Ensaio ASAAS ≈ produção (tunnel flexorc + webhook). Norma: docs/ADR_ENSAIO_ASAAS_FLEXORC.md
ensaio-asaas:
	@chmod +x scripts/ensaio-asaas-ready.sh
	./scripts/ensaio-asaas-ready.sh

ensaio-asaas-ativar:
	@chmod +x scripts/ensaio-asaas-ready.sh
	./scripts/ensaio-asaas-ready.sh --ativar
	@echo "→ make down && make up   depois: make ensaio-asaas"

ensaio-asaas-desativar:
	@chmod +x scripts/ensaio-asaas-ready.sh
	./scripts/ensaio-asaas-ready.sh --desativar
	@echo "→ make down && make up"

# Requer sudo: aponta flexorc.triggerti.com → :8043 e reinicia cloudflared
ensaio-asaas-tunnel:
	@chmod +x scripts/fix-cloudflared-flexorc-8043.sh
	@echo "Execute: sudo bash scripts/fix-cloudflared-flexorc-8043.sh"
	@echo "Depois:  make ensaio-asaas"

# Cadastro atual ≈ produção: cortesia acabou, 1ª mensalidade vence hoje. Não apaga EMP/PAR/ORC.
# Uso: make cenario-mensalidade-pos-cortesia
#      make cenario-mensalidade-pos-cortesia EMAIL=seu@email.com
#      make cenario-mensalidade-pos-cortesia EMAIL=… ARGS='--dry-run'
cenario-mensalidade-pos-cortesia:
	$(COMPOSE_LOCAL) --env-file .env exec app php artisan plataforma:abrir-cobranca-pos-cortesia $(EMAIL) --force $(ARGS)
	@echo "→ Login: http://localhost:8043/login  ·  cai em /conta/mensalidade"
	@echo "→ Pagar agora (cartão ASAAS sandbox). Webhook: make ensaio-asaas"

web-build:
	cd apps/web && npm ci && npm run build
	$(COMPOSE_LOCAL) --env-file .env build web && $(COMPOSE_LOCAL) --env-file .env up -d web

guia-pdf: guia-pdf-parceiros guia-pdf-produtos

guia-pdf-parceiros:
	python3 scripts/gerar_guia_importacao_parceiros.py

guia-pdf-produtos:
	python3 scripts/gerar_guia_importacao_produtos.py
