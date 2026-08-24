# Lightsail + caminho local → homolog → produção

Documento de engenharia para o FLEXOERP (licenciado RLP) em `trigger/39`.  
**Operação detalhada:** [`DEPLOY_LOCAL_AWS.md`](DEPLOY_LOCAL_AWS.md).  
**Instalação × N empresas × papéis:** [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md) — Lightsail hospeda **uma** instalação do licenciado; EMPs não são VMs.

Alinha Compose único, volume oficial (**≤10 usuários**, **~200 NF/mês**) e instância alvo:

**Ubuntu · 2 GB RAM · 2 vCPUs · 60 GB SSD · 3 TB transfer**

## Por que Lightsail (e não EKS/Fargate no dia 1)

Prioridade = correção operacional e custo previsível. Um Docker Compose:

```
[ Internet ] → 443 (Caddy/Nginx TLS no host) → web:80 (nginx SPA)
                                              → app:8000 (Laravel, rede interna)
                                              → mysql (volume local, sem publish)
                                              → queue (worker database)
```

### O que NÃO colocar no dia 1

| Evitar | Motivo |
|--------|--------|
| NAT Gateway | ~USD 68/mês fixo |
| ALB + Fargate | overkill para 10 users |
| RDS Multi-AZ | migrar só se backup/HA exigir |
| Redis gerenciado | fila/cache no MySQL até Fase H |
| Porta 22 aberta | preferir SSM / painel Lightsail |
| Publish MySQL/API | só `web` no host |

## Layout

- `apps/api` + `apps/web`
- `docker-compose.yml` (base segura) + `docker-compose.local.yml` / `docker-compose.aws.yml`
- Branding: `branding/`

## Evolução sem reescrever

| Horizonte | O quê | Como |
|-----------|--------|------|
| Homolog → prod | Mesmo artefato | Só `.env.aws` + DNS (`ERP_STAGE`) |
| Escala 2 | MySQL → RDS; SQS | Trocar connection/queue sem mudar domínio |
| Escala 3 | Separar worker | Segundo host só para `queue` |
| Relatórios livres | Fora do monólito | Vibe coding + APIs read-only (DomPDF removido) |

## Identidade TRIGGER × produto × licenciado

Norma: [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md) · camadas: [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md).

1. **Produto** = FLEXOERP (nome do sistema)  
2. **Licenciado para** = logo RLP (herói)  
3. **Desenvolvido por TRIGGER** (login + sidebar)  
4. **Powered by TRIGGER** (PDF / ficha)  
5. Favicon TRIGGER  
6. **EMP ativa** = contexto no header — não é marca  

## Segurança mínima Lightsail

1. Só 80/443 públicos  
2. MySQL **sem** publish (`docker-compose.aws.yml`)  
3. `ERP_STAGE=homolog|production`, `APP_DEBUG=false`, `SEED_ON_BOOT=false`  
4. `APP_KEY` estável; secrets só em `.env.aws` (fora do git)  
5. Certificado A1 / tokens Focus só cifrados — cofre A1 por EMP: `ADR_CERTIFICADO_A1_EMPRESA.md`  
6. SoD: COMPRAS ≠ FINANCEIRO  

Antes de `make up-aws`:

```bash
./scripts/aws-ready-check.sh .env.aws
sudo bash scripts/lightsail-setup-swap.sh
```

## Memória (host 2 GB)

| Serviço | mem_limit | Papel |
|---------|-----------|--------|
| mysql   | 384m      | buffer_pool 128M |
| app     | 192m      | API (`artisan serve`) |
| queue   | 384m      | worker (jobs futuros; hoje ocioso) |
| web     | 48m       | nginx + SPA |
| **Σ**   | **~1.008 MB** | folga real em 2 GB + swap |

Swap continua rede de segurança:

```bash
sudo bash scripts/lightsail-setup-swap.sh
```

### Gatilhos para separar banco/worker

- ≥ 3 OOM kills/mês  
- p95 fila > 60 s com jobs reais  
- php-fpm / concorrência de API insuficiente  
- Exigência formal de HA do MySQL  

## Checklist go-live (aceite)

Smoke infra: [`DEPLOY_LOCAL_AWS.md`](DEPLOY_LOCAL_AWS.md).  
Aceite produto (multi-empresa + key user): [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md) §7.

Mínimo comercial:

- [ ] Health `stage` correto  
- [ ] Login + perfis  
- [ ] EMP-00001; EMP-00002 com venda off  
- [ ] Isolamento EMP (usuário sem vínculo → 403; dados não vazam entre EMPs)  
- [ ] Parceiro / produto  
- [ ] ORC + link aceite  
- [ ] OC → estoque → TIT (homolog)  
- [ ] Logos TRIGGER + RLP no login  

## Nota Composer

Em CI/prod: `composer audit` e patch upstream — domínio e migrations permanecem estáveis.
