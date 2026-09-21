# ADR-039-ORC-003 — Composição operacional dos modelos (nome + % quantidade + valor da arte)

**Status:** Aceito  
**Data:** 2026-08-12 · emenda 2026-09-10 (valor_arte)  
**Contexto 39:** comercial · ORC → PED/OP  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §3.2 / §7.4 · `GERACAO_PEDIDO.txt` · `PRODUCAO_OPERACIONAL_GERENCIAL.txt`  
**Agregação da proposta (N jobs):** [`ADR_ORC_ITENS.md`](ADR_ORC_ITENS.md) — esta composição permanece **dentro de cada item/job**

---

## Contexto

No Excel/estudo 32, **QDADE MODELOS** é escalar de custo (troca de arte + perda). Não há lista de nomes nem percentual de quantidade.

Na operação real, o mesmo serviço com N artes precisa dizer **qual arte**, **quanto de cada** (ex.: 30% maçã verde + 70% abacate) e, comercialmente, o **valor cotado de desenvolvimento de cada arte**. Produção e pedido futuros devem seguir o rateio de quantidade; o total da proposta deve incluir a soma dos valores de arte.

---

## Decisão

Separar **custo de produção**, **composição operacional** e **add-on comercial de arte** no mesmo ORC:

| Campo | Onde | Papel |
|-------|------|--------|
| `modelos` (int ≥ 1) | input do motor | Setup `(N−1)×troca` e perda × N — **inalterado** |
| `modelos_composicao[]` | `input_snapshot` | `{ ordem, nome, percentual, valor_arte }` · Σ% = 100 · **% não** entra nas fórmulas R1–R20 |
| `valor_arte` (R$ ≥ 0 por linha) | em cada item da composição | Cotação comercial da arte; opcional (default 0) |
| `valor_artes` (= Σ `valor_arte`) | `result_snapshot` (enrich) | Add-on pós-motor — mesmo padrão de faca nova |

```
modelos (preço produção)  ←→  len(modelos_composicao)  (validado)
% por arte                →   PED/OP: q_i = floor(Q×pct_i/100); resto no último
Σ valor_arte              →   valor_total_com_faca = valor_total + faca + artes
                              → valor_total_proposta (frete nunca soma)
```

- Sem tabela SQL nova (JSON no snapshot, auditável com o ORC).
- Um item de serviço / PED (não N linhas fiscais por arte no dia 1 — alinhado a `CADASTRO_PRODUTOS_VENDA.txt`).
- FAT: uma linha por arte com `valor_arte > 0` (`Arte — {nome}`), fixo do job — como faca/matriz.
- Comissão: base continua só em etiquetas — artes **fora** da base (como faca/matriz/frete).
- Proposta pública ao cliente **exibe** a composição (nome + % + valor da arte quando > 0).

### Regras

1. `count(composicao) === modelos`.
2. Cada `nome` obrigatório quando a composição é enviada explicitamente (máx. 120).
3. Cada `percentual` ∈ (0, 100]; soma = 100 (±0,01).
4. Cada `valor_arte` ≥ 0 (nullable → 0). Ausência em ORCs legados = 0.
5. Ausência de `modelos_composicao` na API → equal-split legado (compatibilidade / testes); UI comercial sempre envia e exige nomes.
6. Helper `ModelosComposicao::alocarQuantidades` / `somaValorArte` prontos para PED/OP/FAT.

### UX

- Campo **Modelos** continua na especificação técnica (custo / setup).
- No formulário comercial, **faixas (escada)** e **composição dos modelos** formam **uma seção** (“Quantidades — escada e artes”), com colunas: # · Modelo (arte) · **Valor da arte** · Qtd por faixa.
- Soma ao vivo das artes no rodapé; % travado em 100% se N=1.
- Detalhe, ficha interna, aba **Proposta comercial** e **link público** mostram a tabela (valor da arte só se algum > 0).
- Resultado do cálculo: linha **Artes** nos totais quando `valor_artes > 0`.

---

## Consequências

**Agora:** snapshot enriquecido; motor R1–R20 intacto; artes somam no total comercial pós-motor; testes de regressão ORC intactos quando `valor_arte = 0`.

**Futuro (PED/OP):** copiar `modelos_composicao` (incl. `valor_arte`) no snapshot do pedido; OP aloca quantidade por arte.

## Proibido

1. Alterar o motor para precificar por % ou diluir `valor_arte` em papel/hora-máquina.
2. Guardar composição só em `observacao` livre.
3. SKU-por-arte no dia 1 sem ADR.
4. Incluir artes na base de comissão do vendedor.
5. Confundir EMP / stage com “modelo”.

---

## Rastreio

- `App\Support\ModelosComposicao` · `OrcamentoService::enrichResult` · `OrcamentoValidationRules` · `OrcamentoAprovacaoService::dtoComercial` · `FaturamentoService::itensArte`
- UI: `orcamentoForm.ts` · `ModelosComposicaoEditor` · `ModelosComposicaoTable` · `OrcamentoFormPage` · `OrcamentoResultado` · `OrcamentoFichaSheet` · `OrcamentoPropostaView`
- Testes: `ModelosComposicaoTest` · `OrcamentoTest` · `OrcamentoAprovacaoTest`
