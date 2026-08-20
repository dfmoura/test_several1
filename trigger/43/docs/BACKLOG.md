# Backlog — FLEXORC (instalação 43)

Fila desta fatia comercial. **Não** é lido pelo app em runtime.  
Itens do FLEXOERP completo (PED, estoque, NF, compras) ficam no backlog de `../39`.

## Como usar no Cursor

| Modo | Frase | Efeito |
|------|--------|--------|
| Registrar | `Só coloca no backlog, não altere código.` | Adiciona/atualiza um item `BL-XXX` neste arquivo |
| Executar | `Execute somente a BL-XXX. Não expandir escopo.` | Implementa só aquele item |

Prioridade: **P0** bloqueante → **P1** importante → **P2** desejável → **P3** ideia  
Status: `Backlog` · `Pronto para executar` · `Em andamento` · `Feito`

## Próximo ID

`BL-070`

---

## Itens

### BL-068 · [plataforma/ux] Ativação profissional (você → empresa → ASAAS → cadastros → ORC)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-19 — sistema pronto para usar ainda parecia setup; ramificação de cliente novo; ASAAS autentica o meio; empresa nova começa do zero
- **Depende de:** ADR_FATIA_COMERCIAL_SAAS · ADR_ORC_ADIANTAMENTO_PIX
- **Referência:** `docs/ADR_ATIVACAO_EMPRESA.md`
- **Decisão (fechada):**
  1. Alta: você + CNPJ. Pagamento da conta FLEXORC no ASAAS (PCI no provedor; mock no local).
  2. Operação: PIX CFIN, conferir catálogo modelo, primeiro cliente, primeiro ORC.
  3. EMP sem `empresa_ativacoes` = legado (seed/teste) — envio livre.
  4. Enviar proposta exige pagamento só no self-service. Motor ORC intacto. BANK_PROVIDER asaas no mesmo contrato.
- **Aceite:**
  - [x] Cadastro em etapas; empresa nova sem clientes/ORC
  - [x] Demo/webhook autenticam billing; PIX do sinal separado
  - [x] Cockpit de primeiros passos; empty states; sem jargão estoque/venda no painel
  - [x] Testes EmpresaAtivacaoTest + onboarding isolado
- **Entregue em:** 2026-08-19

### BL-069 · [plataforma/ux] Mensalidade FLEXORC visível (fatura + ASAAS)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-19 — cliente novo não via como paga a plataforma
- **Depende de:** BL-068 · ADR_ATIVACAO_EMPRESA
- **Decisão (fechada):**
  1. Tela 3 da alta é fatura: pagador (EMP), recebedor (TRIGGER), valor, ciclo, meios (cartão/PIX no ASAAS).
  2. Duas camadas explícitas: mensalidade ≠ sinal do ORC.
  3. Checkout ASAAS `RECURRENT` MONTHLY; local mock confirma a mesma fatura.
  4. Banner no app se pendente. `plataforma:repor-demo` limpa EMP/contas fora do seed.
- **Aceite:**
  - [x] GET /ativacao.conta com produto/pagador/valor
  - [x] UI fatura + redirect ASAAS
  - [x] Teste fatura + repor-demo
- **Entregue em:** 2026-08-19
