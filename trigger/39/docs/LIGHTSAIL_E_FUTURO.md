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

Na UI:

1. **Licenciado para** = logo RLP (herói do ambiente do cliente)
2. **Powered by / Desenvolvido por TRIGGER** = marca do produto (sidebar + login)
3. Favicon TRIGGER (produto da plataforma)

Troca de cliente futuro: substituir `branding/cliente/*` e seed da empresa — sem fork do código.

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

## Nota Composer

O skeleton Laravel 11 pode reportar advisories até patch upstream. Em CI/prod: acompanhar `composer audit` e subir para versão corrigida assim que disponível — domínio e migrations permanecem estáveis.
