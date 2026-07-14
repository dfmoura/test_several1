# Baseline · Disciplina operacional (refatorar sem quebrar)

Congelado e **concluído** em 2026-07-13. Suíte verde (**66 passed**, 4 skipped).
Objetivo: estrutura profissional no Free Tier **sem** RabbitMQ/MinIO/Traefik/Grafana/Prometheus.

## O que não muda (contrato)

- Portas e paths: `8096`, `/api/health`, `/api/coleta*`, `/api/compras/*`, `/api/powerbi/*`
- Persistência: SQLite em `data/licitacoes.db` + CSVs em `data/powerbi/`
- Auth: papéis, tetos e cookie de sessão
- Features de Setup (agendamento, IA, limpeza)

## Fatias aplicadas

1. Backup de `data/` → `data/backups/baseline-*`
2. Módulos: `health`, `coleta_api`, `observadores`, `backup_ops`, `compras/api`
3. `main.py` só compõe routers + lifespan + static
4. Testes de proteção: `test_ops_saude_coleta_backup.py`, `test_compras_api.py` (mocks HTTP)
5. Deploy: healthcheck no Compose + `scripts/backup_data.sh` / `restore_data.sh` / `verify.sh`
6. Health com `checks.database` (503 se o banco falhar)
7. Cron opcional: `./scripts/install_backup_cron.sh` (03:15, retenção 7)

## Layout atual

| Peça | Onde |
|------|------|
| Composição app | `app/main.py` |
| Health | `app/health.py` |
| Coleta unificada | `app/coleta_api.py` + `app/coleta_hub.py` |
| Compras.gov API | `app/compras/api.py` |
| Observadores | `app/observadores.py` |
| Backup | `app/backup_ops.py` + `scripts/*` |
| Auth / Setup / IA | `app/auth/*`, `app/sistema.py`, `app/agendamento.py`, `app/ia_*` |

## Operação diária (VM)

```bash
./scripts/verify.sh
./scripts/backup_data.sh cron 7
# ou uma vez:
./scripts/install_backup_cron.sh
```

## Regra (mantida)

Uma mudança por passo → `./scripts/verify.sh` → só então a próxima.
