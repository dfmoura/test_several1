# ADR — Condições comerciais do PAR (defaults → snapshot documental)

**Status:** Aceito (emenda 2026-08-12 — snapshot no ORC)  
**Data:** 2026-08-12  
**Norma:** `../32/CADASTRO_PARCEIROS.txt` §1/§4 · `../32/FATURAMENTO_GERACAO_COBRANCA.txt` §4 · `../32/INCLUSAO_LIBERACAO_LIMITE_CREDITO_CLIENTE.txt` · `../32/GERACAO_PEDIDO.txt`  
**Relacionada:** `ADR_ORC_ADIANTAMENTO_PIX.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`

## Contexto

Parceiros → Financeiro → **Condições comerciais** guarda defaults. Documentos operacionais precisam **travar** a condição efetiva sem motor de parcelas nem CRT.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **PAR = defaults** | Preferência do cadastro; sugere documentos novos. |
| **Documento = snapshot** | OC e ORC travam a condição efetiva; títulos não “relêem” o PAR. |
| **ORC: só `input_snapshot`** | Sem coluna nova em `orcamentos`; mesmo padrão de faca/prazo no JSON. Motor R1–R20 intacto. |
| **Forma canônica curta** | PIX · Boleto · Transferência · Cartão (UI); string no banco; legado preservado. |
| **Condição = texto + sugestões** | Sem catálogo `COND-` até existir gerador de TIT. |
| **Limite continua SoD** | Só `credito.escrever`; default 0 → sinal/à vista (adiantamento). |
| **OC = prefill editável** | Ao escolher fornecedor, copia condição do PAR. |
| **ORC = prefill + snapshot** | Ao escolher parceiro, preenche; salvar grava no `input_snapshot`; proposta pública e ficha exibem. |

```
PAR (defaults)
  → OC / ORC  [snapshot no documento]
    → PED (futuro herda do ORC) → TIT  [parcelas pela condição do documento]
```

## Fora de escopo

- Catálogo `COND-` + engine de parcelas  
- Motor CRT (exposição / atraso / liberação)  
- Tabela de preço / desconto / comissão no PAR  
- Colunas SQL novas em `orcamentos`  
- Conversão ORC→PED (herda snapshot quando PED existir)

## Consequências

- Lib `apps/web/src/lib/condicoesComerciais.ts` compartilhada.  
- Validação API: `condicao_pagamento` / `forma_pagamento` opcionais no payload do ORC.  
- Proposta pública: seção **Condições** inclui pagamento quando informado.  
- Multi-EMP: PAR e ORC já escopados por `empresa_id`.  
- Regressão: `OrcamentoTest` (snapshot comercial + preço BRAHVA).
