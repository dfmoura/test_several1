# Lightsail Free Tier + recomendações de futuro

Documento de engenharia para o ERP RLP em `trigger/39`. Alinha `ARQUITETURA_ENGENHARIA`, `ESTIMATIVA_CUSTO_AWS_MENSAL` (Cenário D) e a proposta comercial (5 fases).

## Por que Lightsail (e não EKS/Fargate no dia 1)

Volume oficial: **≤10 usuários**, **~200 NF/mês**. Prioridade = correção operacional e custo previsível, não elasticidade de marketplace.

Lightsail (ou EC2 t4g.small equivalente) com **um** Docker Compose:

```
[ Internet ] → 443 (Caddy/Nginx TLS) → nginx (SPA) → app:8000 (Laravel)
                                              ↘ mysql (volume local)
```

Teto de memória alvo no host: **1 GB** (plano Lightsail ~USD 5). Free trial / créditos novos clientes AWS cobrem o início; depois o custo fica previsível.

### O que NÃO colocar no free tier

| Evitar no dia 1 | Motivo |
|-----------------|--------|
| NAT Gateway | ~USD 68/mês fixo |
| ALB + Fargate | overkill e caro para 10 users |
| RDS Multi-AZ | migrar só se backup/HA exigir |
| Redis gerenciado | fila/cache no MySQL basta até Fase H |
| Porta 22 aberta | preferir SSM / painel Lightsail |

## Layout de pastas (já no repo)

Igual ao guia B.1, enxuto:

- `apps/api` + `apps/web`
- `docker-compose.yml` único (dev ≈ prod-like)
- Branding fora do build sensível (`branding/`)

## Evolução sem reescrever (roadmap técnico)

| Horizonte | O quê | Como |
|-----------|--------|------|
| Fase 1.e | Orçamento + aceite | Novo bounded context M02; mesmo monólito |
| Fase 2–3 | Estoque / OP / PED | MOV com Decimal; PED agregado-raiz |
| Fiscal | Focus NFe adapter | Port interno estável; homolog ≠ prod |
| Financeiro | TIT/COB/BX | Idempotência + outbox |
| Escala 2 | MySQL → RDS; SQS | Trocar connection/queue sem mudar domínio |
| Escala 3 | Separar worker | Segundo container `php artisan queue:work` |
| Branding white-label | Já preparado | `logo_path` empresa + pasta `branding/cliente` |

## Identidade TRIGGER × cliente

Contrato comercial: **IP da TRIGGER**; RLP com **licença de uso**.

Norma completa: [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md) (alinhada ao modelo ecossistema × nós de `trigger/12`).

Na UI:

1. **Licenciado para** = logo RLP (herói do ambiente do cliente)
2. **Desenvolvido por TRIGGER** (login + sidebar) = atribuição clicável da plataforma
3. **Powered by TRIGGER** (PDF / ficha impressa) = rodapé de documento
4. Favicon TRIGGER (marca da plataforma — não o SVG roxo do Vite)

Troca de cliente futuro: substituir `branding/cliente/*` e seed da empresa — sem fork do código; **não** remover a camada TRIGGER.

## Segurança mínima Lightsail

1. Só 80/443 públicos  
2. MySQL **sem** publish para internet (em prod: remover `ports` do mysql no compose)  
3. `APP_DEBUG=false`, `APP_KEY` estável, senhas fortes  
4. Certificado A1 e tokens Focus/banco só em secrets  
5. Usuários individuais = colaboradores; ADMIN separado do login operacional  

## Checklist go-live fase 1 (aceite comercial)

- [ ] Login + perfis demonstrados (ADMIN / COMERCIAL / FINANCEIRO)  
- [ ] EMP-00001 cadastrada; EMP-00002 visível com venda off  
- [ ] Parceiro cliente com limite de crédito  
- [ ] Produto PA/MP/REV/SVC cadastrável  
- [ ] Logos TRIGGER + RLP corretos na tela de login  

## Host 1 GB — memória e Relatórios IA

Base: `docs/relatorios-ia-impacto-computacional-trigger39.txt`.

### Pré-requisito: swap 2 GB (R1)

O Compose declara ~1.008 MB de `mem_limit` num host de 1.024 MB. Sem swap, um pico de DomPDF pode OOM-killar o MySQL.

```bash
sudo bash scripts/lightsail-setup-swap.sh
```

### mem_limit atuais (R7)

| Serviço | mem_limit | Papel |
|---------|-----------|--------|
| mysql   | 384m      | buffer_pool 128M |
| app     | 192m      | API (`artisan serve`) — planejar vai na fila |
| queue   | 384m      | DomPDF + SVG |
| web     | 48m       | nginx + SPA |
| **Σ**   | **~1.008 MB** | cabe no host; swap é rede de segurança |

Sob pressão, o container que deve estourar é o `queue` (job falha → usuário reprocessa), não o `mysql`.

### Retenção (R6)

```bash
# No container app (ou cron do host apontando para ele):
php artisan relatorios:purgar           # PDFs > 180d; execuções > 90d
php artisan relatorios:purgar --dry-run
```

Agendado em `routes/console.php` (03:30). No host, cron:

```
* * * * * cd /path/to/apps/api && php artisan schedule:run >> /dev/null 2>&1
```

### Gatilhos para subir para 2 GB (~USD 10–12/mês) — R8

Suba a instância quando **qualquer** um ocorrer:

- ≥ 3 OOM kills/mês (`dmesg -T | grep -i 'killed process'`)
- p95 do tempo de fila > 60 s
- decisão de migrar para php-fpm
- export XLSX em produção
- > 30 relatórios/dia de forma sustentada

### Medição (M1–M5)

- `docker stats` a cada 5 min (linha de base)
- Pico real do job: coluna `relatorio_execucoes.memory_peak_mb` (etapa `render`)
- Pior caso: mapa de facas com desenho, 60 linhas, paisagem
- Fila: `SELECT COUNT(*) FROM jobs` — se ficar em 0–2, não otimize

## Nota Composer

O skeleton Laravel 11 pode reportar advisories até patch upstream. Em CI/prod: acompanhar `composer audit` e subir para versão corrigida assim que disponível — domínio e migrations permanecem estáveis.
