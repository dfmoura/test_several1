# Observatório Social Brasil — plataforma multiunidade

Monitoramento de compras públicas (Compras.gov / PNCP) para organização → matriz → filiais.

| Campo | Valor |
|-------|-------|
| Pasta | `trigger/50` |
| Fase atual | **9 — Estabilização v1.0** |
| Spec | `DOCUMENTO-OFICIAL-PROJETO.md` |
| Execução / infra | `PLANO-MESTRE-EXECUCAO-E-INFRAESTRUTURA.md` |
| Referência | `trigger/23` (stack/coleta/auth; **Power BI fora do produto**) |

## Stack (v1)

FastAPI · SQLAlchemy · SQLite (WAL) · Docker Compose · Caddy (HTTPS) · auth por sessão

**Fora do escopo v1:** Power BI, embeds BI, CSVs/portais derivados do Power BI do `trigger/23`. Analytics são nativos (`/api/consultas`).

## Executar com Docker (caminho recomendado)

```bash
# na pasta do projeto (trigger/50)
chmod +x scripts/docker-up.sh
./scripts/docker-up.sh
# equivalente: docker compose up --build -d
```

Acesse: **http://localhost:8097/** — health: `GET /api/health`

| | |
|---|---|
| Usuário | `admin` |
| Senha | `admin123` |

Porta no host: `APP_HOST_PORT` (padrão **8097**; o container escuta **8096** por dentro).  
Dados persistidos em `./data` (SQLite). Código em `./app` é montado ao vivo (sem rebuild para UI/API).

```bash
docker compose logs -f app   # logs
docker compose down          # parar (dados em ./data permanecem)

# Catálogo oficial de filiais (mapa OSB — idempotente por CNPJ)
./scripts/import_unidades_osb.sh
# simulação: ./scripts/import_unidades_osb.sh --dry-run
```

Fonte: `unidades-osb.txt` (71 unidades com CNPJ validado). Não remove filiais extras (ex.: Maringá).

### Produção com HTTPS (Lightsail)

```bash
export DOMAIN=observatorio.exemplo.org
# DNS A → IP estático; firewall 22/80/443
APP_HOST_PORT= docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile https up -d --build
curl -sI "https://${DOMAIN}/api/health"
```

## Desenvolvimento local (sem Docker)

```bash
chmod +x setup.sh run.sh scripts/*.sh
./setup.sh
./run.sh   # usa APP_PORT do .env (8097)
```

## Operação

```bash
./scripts/verify.sh
./scripts/backup_data.sh manual 14
./scripts/restore_data.sh data/backups/<pasta>
./scripts/install_backup_cron.sh   # na VM
```

## Aceite da Fase 0

- [x] Layout `app/` + módulos stub (org, territorial, coleta, …)
- [x] Health com check de DB
- [x] Auth (bootstrap, login, sessão única, papéis admin/consulta)
- [x] UI estática (login + shell)
- [x] Backup / restore / verify
- [x] Docker Compose + Caddyfile

## Aceite da Fase 1

- [x] `ORGANIZACAO` / `UNIDADE` (matriz|filial) / `USUARIO_UNIDADE`
- [x] Isolamento por escopo (testes)
- [x] Escopo pelo login (vínculos + hierarquia matriz→filial); filtro de visão opcional
- [x] UI no padrão de layout UX do `trigger/23` (sidebar teal OSB, Source Serif 4 + IBM Plex, auth card)

## Aceite da Fase 2

- [x] `MUNICIPIO` / `FILIAL_MUNICIPIO` / `ORGAO` / `UASG` / `FILIAL_UASG`
- [x] Sync módulo 05 (catálogo central; mockável nos testes)
- [x] Desativar monitoramento preserva histórico
- [x] UI Território no padrão `trigger/23` (seletor de filial na página)

## Aceite da Fase 3

- [x] Catálogo `PARAMETRO_COLETA` + configs por escopo + histórico
- [x] Herança em runtime (matriz altera → filial sem exceção reflete)
- [x] Filial só sobrescreve se autorizada **e** parâmetro permitir
- [x] UI Configuração no padrão `trigger/23`

## Aceite da Fase 4

- [x] Modelos `CONTRATACAO` / `ITEM` / `RESULTADO` / `FORNECEDOR` (chaves oficiais)
- [x] Sync 07 por UASG (mockável nos testes; HTTP real via `POST /api/compras/sync`)
- [x] Consultas com escopo do login (UASGs monitoradas das filiais do ACL)
- [x] UI Compras no padrão `trigger/23`

## Aceite da Fase 5

- [x] Planejador central: 2 filiais × mesma UASG → **1** sequência HTTP
- [x] `EXECUCAO_COLETA` / `TAREFA_COLETA` com falha parcial recuperável
- [x] Agendamento (config + tick; scheduler in-process via `COLETA_SCHEDULER=1`; catch-up diário)
- [x] UI Coleta no padrão `trigger/23`

## Aceite da Fase 6

- [x] Cadeia CNPJ: BrasilAPI → Minha Receita → CNPJá → Pública (fonte 1 cai → fonte 2)
- [x] Cadeia CEP: BrasilAPI → ViaCEP → AwesomeAPI → OpenCEP
- [x] Cache + `fonte_*` + job de pendentes; falha **não** aborta coleta 07
- [x] UI Enriquecimento no padrão `trigger/23`

## Aceite da Fase 7

- [x] Indicadores e listagens por escopo (matriz/filial) batendo com o banco
- [x] Status operacional + onboarding (APIs; UI em Coleta/Operação — Início = dashboard)
- [x] UI Início (= indicadores) no padrão `trigger/23`
- [x] Power BI ausente do runtime e das APIs de consulta

## Aceite da Fase 8

- [x] Health com `power_bi: false`, `analytics: "nativo"` + ops/prontidão
- [x] `RUNBOOK.md` · `docker-compose.prod.yml` · `scripts/go_live_check.sh`
- [ ] Na VM: DNS + HTTPS + cron + snapshot Lightsail + restore ensaiado (checklist manual)

## Aceite da Fase 9 (v1.0 estável)

- [x] Alertas configuráveis (seed + avaliação por escopo)
- [x] Comparativos nativos (UASG / modalidade) — **sem** módulos 03/04 ainda
- [x] Roadmap em `/api/ops/roadmap` (Power BI = `rejeitado`)
- [x] Fence: `ENABLE_POWER_BI=1` aborta o boot
- [x] UI Alertas + comparativos + roadmap (padrão 23)

**Decisão de produto:** pesquisa de preço (03), PGC (04) e Postgres ficam **adiados** até carga real estável na VM. Extensões CSV/portais só sob demanda — nunca via Power BI.

## Variáveis essenciais

Ver `.env.example`. Segredos nunca vão para o Git (`.env` está no `.gitignore`).
