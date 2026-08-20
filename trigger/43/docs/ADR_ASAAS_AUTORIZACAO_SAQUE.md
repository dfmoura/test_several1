# ADR — Autorização de saque ASAAS (fail-closed)

**Status:** Aceito · **Data:** 2026-08-19  
**Norma:** `ADR_ATIVACAO_EMPRESA.md` · isolamento: `MODELO_INSTALACAO_MULTI_EMPRESA.md`  
**Provedor:** [Validação de saque via webhooks](https://docs.asaas.com/docs/mecanismo-para-validacao-de-saque-via-webhooks)

## Contexto

A conta ASAAS desta instalação cobra a **conta FLEXORC** (e, se configurado, o PIX do sinal). Não há tesouraria no produto: ninguém pede transferência, pagamento de conta, QR de débito, recarga ou estorno Pix pela API.

Com a chave de API, um terceiro poderia esvaziar o saldo. O painel ASAAS oferece um webhook que **autoriza ou recusa cada saída** antes da execução.

## Decisão

| Escolha | Motivo |
|---------|--------|
| URL **distinta** do webhook de eventos (`/webhooks/bancarios/asaas/autorizar-saque`) | O contrato é outro (`{status: APPROVED\|REFUSED}`). Misturar com BX/billing quebraria saque **e** recebimento. |
| **Fail-closed:** recusar o que a instalação não registrou | Payload bem formado não prova origem. Hoje nada é registrado → toda saída via API é recusada. |
| Token no header `asaas-access-token` (obrigatório neste endpoint) | Recomendação do provedor; comparação `hash_equals`. |
| Estornos Pix no mesmo recusar | FLEXORC não estorna pelo ASAAS. Sem isto, chave vazada devolve dinheiro. |
| **Não** validar saques da interface (ainda) | Sem fluxo de tesouraria, o painel ASAAS + SMS/App continua sendo o caminho legítimo de retirada. |
| Trilha `asaas_autorizacao_saques` (instalação, não EMP) | Conta do licenciado/TRIGGER, não carteira da gráfica. Não entra em `erp:limpar-operacional`. |

```
Chave API pede saída  →  ASAAS POST autorizar-saque  →  FLEXORC recusa
                                                         (salvo registro futuro)
Painel ASAAS (UI)     →  SMS/App do provedor         →  segue (opção desligada)
Recebimento           →  webhook de eventos          →  billing / BX (intacto)
```

## Fora de escopo

- Motor de tesouraria (cadastrar saque, aprovar, limites, favorecidos).
- Subcontas white-label.
- Ligar “Validar também saques via interface” — só depois do motor acima, senão o painel ASAAS também fica recusado.

## Consequências

- Ativar o mecanismo no sandbox **depois** do endpoint no ar, com token e e-mail de erro.
- URL HTTPS pública (o ASAAS não alcança `localhost`).
- Quando existir tesouraria: gravar id+valor **antes** do POST ASAAS e reconhecer em `saqueRegistradoPelaInstalacao`.
