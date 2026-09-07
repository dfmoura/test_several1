# ADR — OC rascunho → envio ao fornecedor

**Status:** Aceito · **Data:** 2026-09-06  
**Norma:** `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_ESTOQUE_REPOSICAO_AJUSTE.md` · espelho `ADR_ORC_LINK_APROVACAO.md` / `ADR_ORC_EMAIL_PROPOSTA.md`  
**Escopo:** ciclo comercial da OC antes do recebimento (editar/excluir até enviar; e-mail detalhado ao fornecedor).  
**Fora:** NEC/COT no menu; WhatsApp Business; SMTP por EMP; PDF anexo obrigatório; auto-receber.

## Contexto

A OC nascia já em `ABERTA` (“Emitir”), sem edição/exclusão na UI e sem canal formal ao fornecedor. O operacional precisa ajustar qtde/preço/condição **antes** de comprometer trânsito e o pedido ao PAR.

## Decisão

Espelhar o ORC: documento editável só enquanto rascunho; envio formaliza e trava o bloco comercial.

```
criar (DIRETA | A repor | COT)
  → RASCUNHO   (editável · excluível · NÃO conta em trânsito)
       │
       ├─ PUT atualizar / DELETE soft-delete
       ├─ POST cancelar → CANCELADA
       └─ POST enviar → ABERTA + enviado_em
              │         (+ e-mail fail-soft ao fornecedor)
              ├─ receber → PARCIAL | RECEBIDA
              └─ cancelar (sem recebimento) → CANCELADA
```

| Escolha | Motivo |
|---------|--------|
| Status `RASCUNHO` | Separar preparação de compromisso; trânsito / receber só em `ABERTA\|PARCIAL`. |
| `enviado_em` | Auditoria do momento em que a OC foi formalizada. |
| E-mail = canal do envio | Mesmo motor `MAIL_*` da instalação; Reply-To = `empresas.email`; destino = `parceiros.email` (cadastro). |
| Fail-soft | Falha de SMTP **não** desfaz `ABERTA` / `enviado_em` — resposta expõe `email_enviado`. |
| Soft-delete só em rascunho | Histórico: OC enviada cancela por status (não apaga). |
| Ficha + e-mail detalhados | EMP + fornecedor (CNPJ, contato, endereço) + itens + condição + previsão + obs. |

## Reposição

Em trânsito continua **apenas** `ABERTA|PARCIAL`. Rascunho **não** reduz faltante em “A repor” (ainda pode ajustar antes de enviar).

## RBAC

Sem permissão nova: `compras.escrever` para criar/editar/excluir/enviar/cancelar; `estoque.escrever` para receber (inalterado).

## Proibido

1. Editar itens/fornecedor/valores após `ABERTA`.  
2. Receber OC em `RASCUNHO`.  
3. Contar `RASCUNHO` como trânsito.  
4. SMTP self-service por EMP.  
5. Auto-enviar e-mail sem ação humana de “Enviar”.  
6. Reabrir NEC/COT no menu nesta fatia.
