# ADR — Emissão NF-e direta (SEFAZ + A1) — sem Focus

**Status:** Aceito  
**Data:** 2026-09-18  
**Contexto:** BL-100…105  
**Relacionada:** `ADR_EMISSAO_NFE_NFSE.md` (legado Focus) · `ADR_CERTIFICADO_A1_EMPRESA.md` · `ADR_CAIXA_DFE_NFE_DESTINADAS.md` · `ADR_NFE_TRANSPORTE_SAIDA.md` · `MAPA_FATURAMENTO.md` · `ADR_FATURAMENTO_COBRANCA.md`

---

## Contexto

A caixa DF-e de entrada já opera com **A1 do cofre + SEFAZ AN**, sem Focus. A saída NF-e ainda dependia do hub Focus (token + A1 no portal do provedor). Cancelamento e carta de correção estavam fora de escopo.

Decisão do produto: **emissão, cancelamento e CC-e de NF-e (mod. 55) direto na SEFAZ**, autenticados com o mesmo A1 do cofre. Focus deixa de ser pré-requisito de saída NF-e (código do hub permanece como esqueleto; não é apagado).

## Decisão

```
PED PRODUZIDO → FAT + TIT/COB + DFS PLANEJADO   (inalterado)
  → local/testing + FISCAL_EMISSOR=stub → AUTORIZADO origem STUB
  → homolog/prod + A1 apto → monta/assina XML → NFeAutorizacao → RetAutorizacao
       → AUTORIZADO origem SEFAZ → SAIDA_VENDA (NFE)
  → cancelamento (evento 110111) → DFS CANCELADO → estorna SAIDA_VENDA
  → CC-e (evento 110110) → protocolo no DFS; sem mexer estoque/FAT
```

| Escolha | Motivo |
|---------|--------|
| **Só NF-e nesta fatia** | NFS-e Nacional fica `PLANEJADO` sem POST até ADR própria. |
| **SOAP próprio (sem NFePHP)** | Mesmo padrão DF-e; PI proprietária; sem LGPL. |
| **Numeração no ERP** | Sem Focus, série/nNF são obrigação do emitente. Contador atômico por `empresa_id` + série. |
| **A1 do cofre** | Um certificado: identidade + DF-e + emissão/eventos de saída. |
| **Focus desligado, não apagado** | Superfície: hubs fiscais continuam no código/menu gated; não entram no caminho NF-e. |
| **FAT não espera SEFAZ** | Invariante do mapa: cobrança do saldo não trava em instabilidade fiscal. |
| **oficial = origem SEFAZ** | Stub nunca é oficial; Focus legado deixa de gravar `oficial` em novas emissões. |
| **NF-e = PA/REV** | Matriz/clichê, faca e arte ficam no FAT. `ItensFiscaisNfe` incorpora o setup no unitário do acabado (`ADR_FATURAMENTO_COBRANCA.md`). |

### Ambientes

| Stage | Emissão NF-e |
|-------|----------------|
| `local` / testing | Stub se `FISCAL_EMISSOR=stub`; sem chamada SEFAZ |
| `homolog` | SEFAZ homolog (`tpAmb=2`) + A1 apto |
| `production` | SEFAZ produção (`tpAmb=1`) + A1 apto |

Driver: `NFE_DRIVER=sefaz|fake` (fake = testes, espelha `DFE_DRIVER`).

### Numeração

Tabela `nfe_series_controle` (`empresa_id`, `serie`, `ultimo_numero`).  
`NfeNumeracaoService::reservar` com lock pessimista **só** na emissão real (homolog/prod). Stub **não** consome sequência oficial. Seed do `ultimo_numero` obrigatório se o CNPJ já emitiu fora do ERP.

### Status DFS (inalterados semanticamente)

`PLANEJADO` · `PROCESSANDO` · `AUTORIZADO` · `REJEITADO` · `ERRO` · `CANCELADO`

Origens: `STUB` · `SEFAZ` · `FOCUS` (legado somente).

### Cancelamento e CC-e

| Evento | tpEvento | Efeito |
|--------|----------|--------|
| Cancelamento | 110111 | Justificativa ≥15 chars; prazo legal SEFAZ; DFS `CANCELADO`; estorna `SAIDA_VENDA` |
| Carta de correção | 110110 | Texto + seq; grava protocolo/XML evento; **não** mexe estoque nem FAT |

Após cancel SEFAZ autorizado, o estorno **comercial** do FAT volta a ser permitido (NF deixa de ser oficial vigente).

### Superfície

- FAT/PED: Emitir · Consultar · Cancelar NF-e · Carta de correção.
- Sem depender de `/fiscal-hubs` para testar na nuvem.
- UX: “via certificado A1 da empresa” — sem Focus.

## Proibido

1. Inventar chave/`nfeProc` **como se fossem do fisco** (stub = `STUB`, selo sem valor fiscal).  
2. Desfazer FAT/TIT/COB porque a NF falhou/rejeitou.  
3. Consumir numeração oficial no stub local.  
4. Emitir NFS-e via Focus “de passagem” nesta fatia.  
5. Segundo escritor de saldo (só `EstoqueSaldoWriter` via `SAIDA_VENDA` / estorno).  
6. Misturar URLs do DF-e (AN) com autorizador estadual de saída.  
7. Apagar motor Focus/hubs sem ADR de limpeza.  
8. Emitir em homolog/prod sem A1 apto (CNPJ idêntico + vigente).

## Fora de escopo

- NFS-e Nacional / municipal  
- Inutilização de numeração  
- Contingência FS/EPEC  
- Remoção física de Focus  
- DANFE PDF servidor (HTML a partir do XML = evolução)

## Aceite (BL-100…105)

- [x] Norma + backlog + emendas  
- [x] Numeração + XML + SOAP + fake  
- [x] Emissão ligada; `SAIDA_VENDA` origem SEFAZ  
- [x] Cancelamento + estorno MOV  
- [x] CC-e  
- [x] UI + piloto homolog
