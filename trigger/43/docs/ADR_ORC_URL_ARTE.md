# ADR — URL pública da arte no orçamento (prova para aprovação)

**Status:** Aceito · **Data:** 2026-09-02  
**Norma relacionada:** `ADR_ORC_LINK_APROVACAO.md` · `ADR_ORC_MODELOS_COMPOSICAO.md`

## Contexto

O cliente precisa conferir o **formato final da arte** antes de aprovar a proposta. A arte costuma viver fora do ERP (Drive, Dropbox, Figma, PDF hospedado, imagem etc.). Upload/R2 privado permanece BL futuro (`ADR_ORC_LINK_APROVACAO`).

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Campo único `url_arte` no `input_snapshot`** | Um link da prova final por ORC — não por item de `modelos_composicao` (composição = nome/%; prova = arte fechada). Sem coluna SQL. |
| **Opcional** | ORC sem arte cadastrada continua válido. |
| **Só `http://` / `https://`** | Bloqueia `javascript:`, `data:`, etc. Validação Laravel + normalização em persistência e DTO público. |
| **Apresentar como link externo** | PDF, PNG, JPG, Drive, Figma — formatos diferentes. Embutir (iframe/img) quebraria layout, CSP e segurança. Abre em nova aba (`noopener noreferrer`). |
| **Mesma casca comercial** | `OrcamentoPropostaView` (link `/p/{token}` + ficha-cliente/prévia) e ficha interna / detalhe. Posição: **após Condições**, antes de “Sua decisão”. |

## Fora de escopo

- Upload de arquivo / R2
- Proxy ou thumbnail no ERP
- URL por arte em `modelos_composicao[]` (evolução possível se a operação exigir N provas)

## Consequências

- Comercial cola a URL pública no formulário do ORC.
- Cliente e staff veem o mesmo bloco “Arte para aprovação”.
- Impressão da ficha-cliente inclui a URL em texto (além do CTA).
