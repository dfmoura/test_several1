# ADR — Fatia comercial SaaS (FLEXORC)

**Status:** Aceito · **Data:** 2026-08-19  
**Norma:** `../32` GERACAO_ORCAMENTO · APROVACAO_ORCAMENTO_CLIENTE · ORCAMENTO_PROSPECT · CADASTRO_PARCEIROS · ANALISE_ESTRATEGIA_MONOLITO_VS_TRES_SISTEMAS  
**Base de código:** `../39` (não fork do motor)

## Contexto

O 39 é 1 licenciado × N EMP, superfície ERP completa. Esta entrega precisa: (1) só ORC até o envio, inclusive sinal; (2) cadastro de cliente; (3) outras empresas se cadastrarem.

O estudo 32 **proíbe três sistemas distribuídos**. O caminho correto é a **mesma fatia verde** no monólito, com onboarding.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Reusar o 39, esconder o resto na UX | Motor, link, PIX/sinal e PAR já estão homologados |
| SaaS = 1 instalação × N empresas self-service | Isolamento já existia (`empresa_id` + `empresa_user`) |
| Catálogo ORC e mapa de facas **por EMP** | Senão uma gráfica altera preço da outra |
| Prospect mínimo para orçar | Estudo: orçar não exige cadastro fiscal completo |
| Sinal no aceite (não no envio) | Estudo §5.1: APROVOU → COBROU → RECEBEU. Envio leva a condição; o PIX nasce no aceite |
| Sem PED nesta pasta | Pedido/produção/NF ficam no FLEXOERP |

## Consequências

- Menu (fatia inicial): clientes/parceiros, ORC, catálogo, facas, parâmetros, sinal/a receber. Preço comercial da etiqueta sob medida vive no **catálogo ORC**, não na ficha de item.
- **Emenda 2026-09-02 (BL-088):** na superfície FLEXOERP completa desta instalação, o cadastro **Produtos (SKU)** entra no menu Cadastros com gate `F5_PRODUTOS` — MP/EMB/REV operacionais para compra/estoque/OP; PA sob encomenda permanece família + spec (anti-explosão). Ver `docs/MAPA_FLUXO_POS_ORC.md` · `.cursor/rules/flexorc-superficie.mdc`.
- `POST /api/v1/auth/registrar-empresa` provisiona EMP + admin + catálogo + facas + `orc.adiantamento_*`.
- API de PED/estoque/SKU **permanece no código** (não estragar o motor/FK); a superfície promove módulos por onda/implantação.
- Jornada do cliente novo: você → mensalidade ASAAS → (logado) até 3 EMP → A1 apto da EMP → cadastros da norma → ORC. Detalhe: `docs/ADR_ATIVACAO_EMPRESA.md`.
- Identidade: o **FLEXORC** é o herói da UI (logo própria, paleta navy/verde da TRIGGER); a TRIGGER permanece na atribuição; a EMP é só contexto. Norma: `docs/IDENTIDADE_TRIGGER.md`. Transição para marca única **FLEXOERP**: `docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md` (gate: menu onda 2+ antes do rebrand).
