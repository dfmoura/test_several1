# ADR-006 — Consultas dinâmicas de cadastro (BFF)

## Status

Aceito — 2026-08-27

## Contexto

Cadastros de parceiro/produto/emitente ficavam estáticos (selects fixos, endereço hardcoded). Os projetos 39/32 já usam APIs públicas (BrasilAPI, ViaCEP) com cadência humana + cache.

## Decisão

1. **BFF only** — browser nunca chama BrasilAPI/ViaCEP; tudo passa por `GET /v1/consulta/*`.
2. **Evento humano** — botões CNPJ/CEP e digitação no combobox; cache em memória (CNPJ 30d, CEP 90d).
3. **Fill-empty** — consulta só preenche campos vazios; operador confirma.
4. **FiscalCombobox** — NCM (local + BrasilAPI), CEST filtrado por NCM, CFOP entrada/saída, CST/CSOSN/cClassTrib.
5. **IE → indIEDest** — campo indIEDest somente leitura na UI.

## Consequências

Cadastros deixam de ser estáticos e permanecem alinhados à legislação (IBGE, NCM, reforma). Emissão XML PL_009 inalterada.
