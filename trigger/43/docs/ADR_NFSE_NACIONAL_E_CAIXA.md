# ADR — NFS-e Nacional (emissão SEFIN) e caixa de serviço tomado (ADN)

**Status:** Aceito  
**Data:** 2026-10-01  
**Relacionada:** `ADR_OPERACOES_SAIDA.md` · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md` · `ADR_EMISSAO_NFE_NFSE.md` · `ADR_CAIXA_DFE_NFE_DESTINADAS.md` · `ADR_CARTEIRA_FINANCEIRA.md` · `ADR_NATUREZAS_GERENCIAIS.md` · `MAPA_FATURAMENTO.md`  
**Protocolo de referência:** `../22/nfse-nacional` (SEFIN + ADN + DPS). Não é um segundo produto ao lado do ERP.

---

## Contexto

O trilho comercial de serviço que a empresa vende já fecha: orçamento do catálogo curto, pedido, ordem de serviço, faturamento e título a receber na natureza `1.01.03`. O documento fiscal de saída `NFSE` nasce no mesmo faturamento e ficava `PLANEJADO`.

A NF-e de mercadoria já sai direto na SEFAZ com o A1 do cofre. A caixa de NF-e já carrega notas destinadas e, depois da ordem de compra, gera estoque e contas a pagar.

Faltavam as duas pontas da NFS-e Nacional: emitir o serviço vendido na SEFIN, e organizar as NFS-e em que a empresa é tomadora até o contas a pagar — sem estoque e sem ordem de compra.

## Decisão

Dois contextos. O faturamento, a ordem de serviço e a caixa de NF-e de mercadoria permanecem.

```
SAÍDA (prestador)
  FAT + TIT RECEBER 1.01.03 + DFS NFSE PLANEJADO
    → NFSE_DRIVER=off fora do stub   permanece PLANEJADO
    → local + FISCAL_EMISSOR=stub   AUTORIZADO origem STUB (sem valor fiscal)
    → NFSE_DRIVER=fake    AUTORIZADO origem SEFIN só em teste
    → homolog/prod + A1 + NFSE_DRIVER=sefin
         DPS assinada → POST SEFIN /nfse → chave 50
         falha fiscal não desfaz FAT/TIT/COB
         sem SAIDA_VENDA

ENTRADA (tomador)
  Compras → Caixa de NFS-e (ADN, NSU, job)
    → humano confere prestador, natureza, vencimento
    → NFS-e vinculadas + TIT PAGAR origem NFSE_TOMADA
    → organização do pagamento na carteira a pagar
    → sem MOV, sem OC, sem receber()
```

| Escolha | Motivo |
|---------|--------|
| **Canal no ERP, por empresa** | O exemplo 22 é um CNPJ só. Aqui o A1 e o `empresa_id` já existem. |
| **SEFIN, não hub** | A norma da NF-e tirou o hub do caminho vivo. NFS-e segue o mesmo critério. |
| **Driver `off` por omissão** | Homologação atual não muda sozinha. Liga com `NFSE_DRIVER=sefin` e A1 apto. |
| **Caixa separada da NF-e** | Chave 50 e ADN. Não mistura com `dfe_documentos` (chave 44). |
| **Título sem estoque** | Serviço tomado não entra saldo. OC e `5.06` protegem mercadoria. |
| **Natureza grupo 2 ou 3** | Custo ou despesa operacional, folha que aceita lançamento. Fora `5.06`, `3.05.06` e `3.01.05`. |
| **Sync fora do GET** | A lista lê o banco. “Atualizar” enfileira. Sem título no pull. |

### Superfície

- Compras → **Caixa de NFS-e** (`/compras/nfse-tomadas`) e **NFS-e vinculadas** (`/compras/nfse-vinculadas`).
- Gate `F5_NFSE_CX` (onda 5), ao lado de `F5_DFE_CX`.
- Conferência exige `financeiro.escrever`. A carteira a pagar já lista o título.
- Desfazer o vínculo só com títulos `ABERTO` e sem baixa: cancela o título (não apaga) e devolve a nota à caixa.

### Ambientes

| Stage | Emissão | Caixa ADN |
|-------|---------|-----------|
| `local` | stub (`FISCAL_EMISSOR=stub`) — origem `STUB`, sem valor fiscal. Caixa: Atualizar coloca 1 nota de ensaio | ensaio local, sem ADN |
| testing | `off` permanece planejado; `fake` no ensaio automático | `fake` no teste |
| `homolog` | `sefin` + A1 | `adn` + A1 |
| `production` | `sefin` + A1 | `adn` + A1 |

URL de produção restrita e de produção não se misturam com o stage do app.

## Proibido

1. Inventar chave de 50 posições como se fosse da SEFIN (fake de teste marca a mensagem; origem `SEFIN` no driver `fake` é só ensaio).  
2. Desfazer FAT/TIT/COB porque a NFS-e falhou.  
3. Baixar estoque na NFS-e de saída ou na tomada.  
4. Chamar `receber()` ou gravar saldo na confirmação da caixa.  
5. Lançar título no sync do ADN.  
6. Usar natureza `5.06`, `3.05.06` ou `3.01.05` neste título.  
7. Emitir NFS-e de comodato.  
8. Apagar o motor do hub.  
9. Misturar empresa.

## Fora desta fatia

- Cancelamento `e101101` e substituição.  
- NFS-e municipal (ABRASF).  
- DANFSe PDF de servidor. A ficha HTML segue as faixas do DANFSe nacional v2 (NT 008): identificação, emitente, tomador, serviço, tributação municipal e federal, valor total.  
- SPED / DAS.

## Aceite

- [x] Norma  
- [x] Emissão no DFS existente; `NFSE_DRIVER=off` preserva o plano atual  
- [x] `NFSE_DRIVER=fake` autoriza sem movimento de estoque  
- [x] Caixa + vinculadas + título a pagar com conferência humana  
- [x] Isolamento por empresa
