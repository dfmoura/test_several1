# Runbook de incidente — Observatório Social Brasil (1 página)

Produto nativo (Compras.gov + SQLite). **Sem Power BI.**

## Sinais

| Sintoma | Primeiro check |
|---------|----------------|
| Site fora | `curl -sI https://$DOMAIN/api/health` |
| Login falha | logs `docker compose logs --tail=80 app` |
| Coleta travada | UI Coleta / `GET /api/coleta/execucoes` |
| Disco cheio | `df -h` · podar `data/backups` |

## Restart (sem perda de dados)

```bash
cd /caminho/trigger/50
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile https restart app
curl -sf "https://${DOMAIN}/api/health"
```

## Restore SQLite (ensaio ou desastre)

1. **Backup atual** antes de qualquer restore: `./scripts/backup_data.sh pre-restore 14`
2. Parar app: `docker compose stop app`
3. Restore: `./scripts/restore_data.sh data/backups/<pasta>`
4. Subir: `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile https up -d`
5. Validar health + login

## Rollback de imagem

```bash
git log -1 --oneline
git checkout <commit-bom>
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile https up -d --build
curl -sf "https://${DOMAIN}/api/health"
```

Snapshot Lightsail: criar **antes** de upgrade; restaurar snapshot só se disco/VM corrompidos (pior caso).

## Backup diário

```bash
./scripts/install_backup_cron.sh   # 03:15 local, retenção 7
./scripts/backup_data.sh manual 14
```

## Contatos / ordem

1. Restart app → 2. Restore backup → 3. Rollback git/imagem → 4. Snapshot Lightsail
