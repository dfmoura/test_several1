# ADR — Item de revenda no ORC (SKU REV, sem OP)

**Status:** Aceito  
**Data:** 2026-09-23  
**Contexto 43:** comercial · ORC → PED → FAT → ENT  
**Norma:** `ADR_OPERACOES_SAIDA.md` · `ADR_ORC_ITENS.md` · `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `MAPA_FLUXO_POS_ORC.md` · `MAPA_FATURAMENTO.md`  
**Preserva:** motor R1–R20 · isolamento `empresa_id` · um escritor de saldo · NF dona da `SAIDA_VENDA`

---

## Contexto

O mapa já prevê `REVENDA → separação (sem OP)`. O PED já tem `necessidade=REVENDA`, a OP já recusa o que não é `PRODUCAO`, o FAT já classifica `1.01.02` e a NF já baixa REV.

O ORC, porém, só cotava etiqueta (motor) ou serviço. Sem item de revenda no wizard, o trilho não nascia. Faltar um gesto de **separação** no PED deixava o item eterno em `PENDENTE` — o FAT não abre.

---

## Decisão

Revenda é **posição do ORC**, não quarto `tipo_operacao`. Cabeçalho permanece **Venda de Produto** (`INDUSTRIALIZACAO`). Cada item escolhe:

| Item | Origem | Preço | PED | Chão | Pronto para FAT |
|------|--------|-------|-----|------|-----------------|
| Etiqueta | catálogo ORC + R1–R20 | motor | `PRODUCAO` · `PA-ETQ` | OP | concluir OP |
| Revenda | SKU família `REV` da EMP | comercial explícito (`preco_tabela` sugere) | `REVENDA` · grupo do SKU | **proibido OP/OS** | **Confirmar separação** no PED |

```
só REV:   ORC → PED LIBERADO → separar → PRODUZIDO → FAT → ENT
misto:    linhas PRODUCAO → OP; linhas REVENDA → separar
          PED PRODUZIDO só quando todas as linhas prontas
```

### Regras

1. SKU obrigatório, `familia=REV`, `ATIVO`, mesma EMP. MP/EMB/MUC/PA-ETQ **não** entram como revenda.  
2. Fora do motor R1–R20. Sem faca, geometria, artes, saída da bobina, guia de produção.  
3. `valor_etiqueta` da faixa = total comercial (qtde × unitário + comissão). Sem teto de R$ 10 (isso é do serviço).  
4. `qtde_faturavel` = `qtde_pedida`. Sem tolerância de ±20%.  
5. Baixa de estoque **só** na NF-e autorizada (`SAIDA_VENDA`) — já era.  
6. Comissão: base continua **etiqueta**. REV fora do COM- nesta fatia.  
7. Sem status novo de PED. Sem `OP-REV`. Sem segundo PED.  
8. Etiqueta-only N>1 **não muda** (PED ainda espelha o item 1 — BL-106 fase 3). Se houver **qualquer** item REV, o PED nasce com **N linhas** (uma por posição).

### UX

- No item: **Etiqueta sob medida** | **Produto de revenda**.  
- N=1 só-REV: zero chrome de fábrica (sem faca/escada de artes).  
- PED: CTA **Confirmar separação**; andamento já diz “Revenda — sem OP”.

## Proibido

1. Quarto `tipo_operacao=REVENDA` no cabeçalho.  
2. Empurrar REV no motor R1–R20.  
3. Abrir OP/OS para revenda.  
4. Inventar PA-ETQ por ribbon/cliente.  
5. Baixar saldo no PED, no separar ou no commit do FAT.  
6. Dois PEDs (um desenho, um de revenda).  
7. Misturar com fase PA+SVC (dois DFS) — REV é a mesma NF-e.

## Rastreio

- `OrcamentoRevendaPrecificador` · `PedidoService::separarRevenda`  
- `POST /pedidos/{pedido}/separar-revenda`  
- Testes: `OrcamentoRevendaPrecificadorTest` · `RevendaOrcAteFaturamentoTest`
