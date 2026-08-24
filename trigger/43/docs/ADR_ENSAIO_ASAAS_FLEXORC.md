# ADR — Ensaio ASAAS ≈ produção (flexorc + tunnel)

**Status:** Aceito · **Data:** 2026-08-21  
**Norma:** `ADR_ATIVACAO_EMPRESA.md` · deploy: `DEPLOY_LOCAL_AWS.md`  
**Instrumento:** `scripts/ensaio-asaas-ready.sh` · `make ensaio-asaas`

## Contexto

A mensalidade FLEXORC usa Checkout ASAAS **recorrente (cartão)**. A confirmação depende de **webhook HTTPS**. `localhost` não recebe o ASAAS. O subdomínio `https://flexorc.triggerti.com` já serve o link público do ORC via Cloudflare Tunnel no notebook — o mesmo canal cobre o ensaio de billing antes da AWS.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Ensaio = stack **local** + URL pública **flexorc** | Mesmo banco/sessão que o dev vê; webhook e retorno do cartão batem na mesma instalação |
| `ORCAMENTO_PUBLIC_BASE_URL=https://flexorc.triggerti.com` no ensaio | Checkout callback + link ORC + webhook usam a mesma base (`AsaasBillingGateway::frontBase`) |
| `APP_URL` / `FRONTEND_URL` permanecem `http://localhost:8043` | Operador continua no browser local; não força cookie/Sanctum no tunnel |
| ASAAS **sandbox** no ensaio | Sem risco de cobrança real; chave e webhook separados da produção |
| Checkout só **CREDIT_CARD** + `RECURRENT` | Regra do provedor; PIX do sinal continua na camada EMP |
| Script `ensaio-asaas-ready` (check / ativar / desativar) | Liga/desliga a base pública sem editar código; gera token de webhook se faltar |
| Não injetar `ASAAS_*=` vazio no Compose | Evita sobrescrever `apps/api/.env` com string vazia |

```
Browser → localhost:8043 (UI)
ASAAS Checkout (cartão) → cliente
ASAAS webhook → https://flexorc.triggerti.com/api/v1/webhooks/bancarios/asaas
                      ↓ Cloudflare Tunnel
                 localhost:8043 → erp43_app (mesmo MySQL)
Retorno Checkout → flexorc…/conta/mensalidade?retorno=asaas
```

## Fora de escopo

- Apontar webhook de **produção** ASAAS para o notebook  
- Misturar chave sandbox com conta ASAAS production  
- Substituir o tunnel por deploy AWS neste ADR (AWS = `make up-aws` + DNS definitivo)

## Consequências

- Ativar: `make ensaio-asaas-ativar` → reiniciar stack → conferir `make ensaio-asaas`  
- No painel ASAAS (sandbox): URL do webhook = `https://flexorc.triggerti.com/api/v1/webhooks/bancarios/asaas` + token  
- Tunnel: `flexorc.triggerti.com` → `http://localhost:8043` (porta desta instalação 43)  
- Desativar ensaio quando não testar: `make ensaio-asaas-desativar` (volta ORCAMENTO para localhost)  
- Produção AWS: mesmo path de webhook no domínio definitivo; `ASAAS_ENV=production` só na virada

## Aceite

- [ ] `make ensaio-asaas` → health local + público OK, token e chave presentes  
- [ ] Checkout cartão abre; webhook marca `conta_ativacoes` ATIVA  
- [ ] ORC link público continua em `https://flexorc.triggerti.com/p/...` durante o ensaio  
- [ ] `make ensaio-asaas-desativar` restaura localhost sem quebrar `make up`
