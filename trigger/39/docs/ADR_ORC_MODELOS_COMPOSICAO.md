# ADR-039-ORC-003 — Composição operacional dos modelos (nome + % quantidade)

**Status:** Aceito  
**Data:** 2026-08-12  
**Contexto 39:** comercial · ORC → PED/OP  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §3.2 / §7.4 · `GERACAO_PEDIDO.txt` · `PRODUCAO_OPERACIONAL_GERENCIAL.txt`

---

## Contexto

No Excel/estudo 32, **QDADE MODELOS** é escalar de custo (troca de arte + perda). Não há lista de nomes nem percentual de quantidade.

Na operação real, o mesmo serviço com N artes precisa dizer **qual arte** e **quanto de cada** (ex.: 30% maçã verde + 70% abacate). Produção e pedido futuros devem seguir esse rateio.

---

## Decisão

Separar **custo** de **composição operacional** no mesmo ORC:

| Campo | Onde | Papel |
|-------|------|--------|
| `modelos` (int ≥ 1) | input do motor | Setup `(N−1)×troca` e perda × N — **inalterado** |
| `modelos_composicao[]` | `input_snapshot` | `{ ordem, nome, percentual }` · Σ% = 100 · **não** entra nas fórmulas R1–R20 |

```
modelos (preço)  ←→  len(modelos_composicao)  (validado)
% por arte       →   PED/OP: q_i = floor(Q×pct_i/100); resto no último
```

- Sem tabela SQL nova na fase 1 (JSON no snapshot, auditável com o ORC).
- Um item de serviço / PED (não N linhas fiscais por arte no dia 1 — alinhado a `CADASTRO_PRODUTOS_VENDA.txt`).
- Proposta pública ao cliente **exibe** a composição (nome + %): o cliente precisa ver o rateio das artes no serviço.

### Regras

1. `count(composicao) === modelos`.
2. Cada `nome` obrigatório quando a composição é enviada explicitamente (máx. 120).
3. Cada `percentual` ∈ (0, 100]; soma = 100 (±0,01).
4. Ausência de `modelos_composicao` na API → equal-split legado (compatibilidade / testes); UI comercial sempre envia e exige nomes.
5. Helper `ModelosComposicao::alocarQuantidades` pronto para PED/OP.

### UX

- Campo **Modelos** continua na especificação técnica.
- Bloco **Composição dos modelos** logo abaixo: N linhas (nome + %), soma ao vivo, % travado em 100% se N=1.
- Detalhe, ficha interna, aba **Proposta comercial** e **link público** (`/p/…`) mostram a tabela (nome + % + quantidade inteira por faixa).
- Quantidade inteira = mesmo rateio canônico (`floor(Q×%/100)`, resto no último) — **só apresentação**; não altera o motor.
- API pública: `descricao.modelos` + `descricao.modelos_composicao` em `dtoComercial` (só linhas com nome; sem custos internos).

---

## Consequências

**Agora:** snapshot enriquecido; motor e preço estáveis; testes de regressão ORC intactos (equal-split se omitido).

**Futuro (PED/OP):** copiar `modelos_composicao` no snapshot do pedido; OP aloca quantidade por arte; opcional BOM/chave por `nome`.

## Proibido

1. Alterar o motor para precificar por %.
2. Guardar composição só em `observacao` livre.
3. SKU-por-arte no dia 1 sem ADR.
4. Confundir EMP / stage com “modelo”.

---

## Rastreio

- `App\Support\ModelosComposicao` · `OrcamentoService::buildMotorInput` · `OrcamentoValidationRules` · `OrcamentoAprovacaoService::dtoComercial`
- UI: `orcamentoForm.ts` · `ModelosComposicaoTable` · `OrcamentoFormPage` · `OrcamentoDetailPage` · `OrcamentoFichaSheet` · `OrcamentoResultado` · `OrcamentoPropostaView` · `OrcamentoPublicoPage`
- Testes: `ModelosComposicaoTest` · `OrcamentoTest` · `OrcamentoAprovacaoTest` (proposta pública)
