# ADR — Ativação da empresa (self-service FLEXORC)

**Status:** Aceito · **Data:** 2026-08-19  
**Norma:** `ADR_FATIA_COMERCIAL_SAAS.md` · estudo `../32` CADASTRO_PARCEIROS · GERACAO_ORCAMENTO · INTEGRACAO_BANCARIA_MULTI_PROVIDER  
**Identidade:** `IDENTIDADE_TRIGGER.md` · isolamento: `MODELO_INSTALACAO_MULTI_EMPRESA.md`

## Contexto

A fatia comercial já orça, envia e cobra sinal. O cliente novo entra assim: **eu (conta) → mensalidade FLEXORC (ASAAS) → empresas (até 3, logado) → cadastros da norma → orçar**. Empresa nova começa **sem clientes e sem ORC**.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Jornada em dois tempos: **alta da conta** (público: você + mensalidade) + **empresas no menu** (logado, master, até 3) | A mensalidade é da **conta FLEXORC**, não de cada CNPJ. O CNPJ é livro operacional. Cadastros da norma não cabem num wizard eterno. |
| Pagamento da **conta FLEXORC** = **fatura visível** (quem paga, valor, ciclo) + Checkout ASAAS **recorrente mensal** (cartão ou PIX) | O cliente novo precisa ver a mensalidade. PCI no provedor. Webhook confirma. |
| `MockBankProvider` continua o default de **cobrança operacional** (sinal PIX do cliente da gráfica) | CI/local sem chave. `BANK_PROVIDER=asaas` pluga o mesmo contrato `BankProvider` já usado no adiantamento. |
| EMP sem linha em `empresa_ativacoes` = **legado** (seed/testes) | Não bloqueia RLP nem phpunit. Só o auto-cadastro nasce `PENDENTE`. |
| Enviar proposta exige pagamento autenticado **só** na EMP self-service | Calcular e gravar rascunho continuam livres. O ato comercial é o envio. |
| Catálogo ORC semeado como **modelo estrutural** (não como livro da RLP) | O motor precisa de papel/hora-máquina. Preços são da EMP; ela confere. Zero PAR cliente, zero ORC. |
| Recebimento do sinal = CFIN da EMP (chave PIX), norma já existente | Não inventar tesouraria paralela. ASAAS cobra o sinal quando `BANK_PROVIDER=asaas`. |
| Cockpit de primeiros passos no Painel; empty states com próximo ato | Sem segunda aplicação. Sem Docker/AWS na UI. |

```
TRIGGER → FLEXORC
  └── Conta (USR master)
        1. Você (acesso)
        2. Mensalidade FLEXORC (fatura + ASAAS Checkout recorrente)
        3. Até 3 EMP no menu Empresas (CNPJ, isoladas)
        4. PIX para receber o sinal (CFIN de cada EMP)
        5. Conferir catálogo ORC (modelo → preços da EMP)
        6. Primeiro cliente / prospect
        7. Primeiro orçamento → envio → aceite → sinal
```

Duas camadas de dinheiro (não misturar):

| Camada | Quem paga | Provedor | Onde |
|--------|-----------|----------|------|
| **Conta FLEXORC** | o master da conta → TRIGGER | ASAAS Checkout **recorrente** (cartão ou PIX) | `conta_ativacoes` · tela `/cadastro/pagamento` |
| **Sinal do ORC** | o cliente da gráfica → a EMP | `BankProvider` (mock / asaas / inter) | TIT + COB (ADR_ORC_ADIANTAMENTO_PIX) |

## Fora de escopo

- Subconta ASAAS white-label / split de recebíveis
- Plano comercial com preço de tabela (valor = config; 0 = só autenticar meio em trial)
- PED / NF / estoque nesta superfície
- Pedir cartão no próprio ERP (PCI)

## Consequências

- `POST /auth/registrar-conta` cria USR master (ADMIN) + `conta_ativacoes.billing_status=PENDENTE`. Sem EMP.
- `POST /auth/abrir-empresa` (logado, master) abre EMP + catálogo modelo + CFIN + `empresa_ativacoes`; herda pagamento se a conta já pagou. Teto: 3 EMP por conta.
- `GET /ativacao` funciona sem EMP (fatura da conta) ou com EMP (passos operacionais).
- `GET /ativacao` inclui `conta` (fatura: pagador, valor, ciclo, meios). Checkout ASAAS é `RECURRENT` MONTHLY.
- Webhook `/webhooks/bancarios/asaas` confirma billing **e** baixa COB operacional.
- Saques ASAAS: URL distinta `/webhooks/bancarios/asaas/autorizar-saque` — fail-closed (`docs/ADR_ASAAS_AUTORIZACAO_SAQUE.md`).
- Identidade: TRIGGER fornece; EMP é contexto; não tratar EMP como marca.
