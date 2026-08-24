# ADR — Ativação da empresa (self-service FLEXORC)

**Status:** Aceito · **Data:** 2026-08-19  
**Norma:** `ADR_FATIA_COMERCIAL_SAAS.md` · estudo `../32` CADASTRO_PARCEIROS · GERACAO_ORCAMENTO · INTEGRACAO_BANCARIA_MULTI_PROVIDER  
**Identidade:** `IDENTIDADE_TRIGGER.md` · isolamento: `MODELO_INSTALACAO_MULTI_EMPRESA.md`

## Contexto

A fatia comercial já orça, envia e cobra sinal. O cliente novo entra assim: **eu (conta) → mensalidade FLEXORC (ASAAS) → empresas (até 3, logado) → cadastros da norma → orçar**. Empresa nova começa **sem clientes e sem ORC**.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Jornada em dois tempos: **provisionamento da conta** (CLI `plataforma:criar-conta` ou flag lab `FLEXORC_PUBLIC_CONTA_REGISTRATION`) + **mensalidade** + **empresas no menu** (logado, master, até 3) | Login **não** cadastra conta. Mensalidade é da **conta FLEXORC**, não de cada CNPJ. Usuários operacionais: só o ADMIN em `/usuarios`. |
| Cadastro público no login **fechado** por padrão (`erp.flexorc.public_conta_registration=false`) | Evita auto-alta de master. Conta nasce por TRIGGER/admin; o novo usuário só acessa. |
| Pagamento da **conta FLEXORC** = **fatura visível** + Checkout ASAAS **recorrente mensal antecipado** (**cartão**) **ou** PIX Inter por ciclo (`BILLING_PROVIDER=inter`) | ASAAS Checkout `RECURRENT` só aceita `CREDIT_CARD`. Inter: QR + copia-e-cola ([`ADR_INTER_BILLING_MENSALIDADE.md`](ADR_INTER_BILLING_MENSALIDADE.md)). PIX do sinal é outra camada. |
| **Cortesia (bonificação TRIGGER)** = `cortesia_ate` na conta, sem fingir ASAAS | Console `/plataforma` ou CLI. Libera envio; cliente vê “Período cortesia” em `/conta/mensalidade`. MRR não conta. Aviso ≤7 dias; 1ª cobrança ASAAS no fim da cortesia. Encerrar ≠ revogar: encerrar mantém o histórico e abre a cobrança hoje. |
| Inadimplência / cancelamento ASAAS → `SUSPENSA` (webhook) | `PAYMENT_OVERDUE` / cancelamento da assinatura bloqueia envio até nova confirmação. |
| Tela permanente **`/conta/mensalidade`** (menu Administração) + fatura na alta | Depois da alta o pagador precisa ver status, dias até a próxima e meios — sem misturar com sinal do ORC. |
| `MockBankProvider` continua o default de **cobrança operacional** (sinal PIX do cliente da gráfica) | CI/local sem chave. `BANK_PROVIDER=asaas` pluga o mesmo contrato `BankProvider` já usado no adiantamento. |
| EMP sem linha em `empresa_ativacoes` = **legado** (seed/testes) | Não bloqueia RLP nem phpunit. Só o auto-cadastro nasce `PENDENTE`. |
| Enviar proposta exige pagamento autenticado **e** A1 apto **só** na EMP self-service | Calcular e gravar rascunho continuam livres. O ato comercial é o envio. A1 = identidade da EMP (mesmo CNPJ, vigente), não emissão Focus. |
| Catálogo ORC semeado como **modelo estrutural** (não como livro da RLP) | O motor precisa de papel/hora-máquina. Preços são da EMP; ela confere. Zero PAR cliente, zero ORC. |
| Recebimento do sinal = CFIN da EMP (chave PIX), norma já existente | Não inventar tesouraria paralela. ASAAS cobra o sinal quando `BANK_PROVIDER=asaas`. |
| Cockpit de primeiros passos no Painel; empty states com próximo ato | Sem segunda aplicação. Sem Docker/AWS na UI. |

```
TRIGGER → FLEXORC
  └── Conta (USR master — provisionada; sem self-signup no login)
        1. Acesso (login) + usuários criados pelo ADMIN em /usuarios
        2. Mensalidade FLEXORC (fatura + ASAAS Checkout recorrente)
        3. Até 3 EMP no menu Empresas (CNPJ, isoladas)
        4. Certificado A1 da EMP (vigente + CNPJ idêntico) — libera o envio
        5. PIX para receber o sinal (CFIN de cada EMP)
        6. Conferir catálogo ORC (modelo → preços da EMP)
        7. Primeiro cliente / prospect
        8. Primeiro orçamento → envio → aceite → sinal
```

Duas camadas de dinheiro (não misturar):

| Camada | Quem paga | Provedor | Onde |
|--------|-----------|----------|------|
| **Conta FLEXORC** | o master da conta → TRIGGER | ASAAS Checkout **recorrente** (cartão) **ou** Inter BolePix (PIX por ciclo) | `conta_ativacoes` · `/conta/mensalidade` (app) · `/cadastro/pagamento` (alta) · setup Inter em `/plataforma/integracoes/inter` |
| **Sinal do ORC** | o cliente da gráfica → a EMP | `BankProvider` (mock / asaas / inter) | TIT + COB (ADR_ORC_ADIANTAMENTO_PIX) |

## Fora de escopo

- Subconta ASAAS white-label / split de recebíveis
- Plano comercial com preço de tabela (valor = config; 0 = só autenticar meio em trial)
- PED / NF / estoque nesta superfície
- Pedir cartão no próprio ERP (PCI)
- Console transversal TRIGGER (contas de todos os pagadores) — [`ADR_CONSOLE_PLATAFORMA.md`](ADR_CONSOLE_PLATAFORMA.md)

## Consequências

- Conta master: `plataforma:criar-conta` (canônico) ou `POST /auth/registrar-conta` **somente** se `FLEXORC_PUBLIC_CONTA_REGISTRATION=true` (lab). Cria USR master (ADMIN) + `conta_ativacoes.billing_status=PENDENTE`. Sem EMP.
- Login (`/login`) **não** oferece cadastro; `/cadastro` e `/cadastro/conta` redirecionam para login.
- Usuários da conta: só o ADMIN com `usuarios.gerir` em `POST /usuarios` (credenciais entregues fora do app).
- `POST /auth/abrir-empresa` (logado, master) abre EMP + catálogo modelo + CFIN + `empresa_ativacoes`; herda pagamento se a conta já pagou. Teto: 3 EMP por conta.
- `GET /ativacao` funciona sem EMP (fatura da conta) ou com EMP (passos operacionais).
- `GET /ativacao` inclui `conta` (fatura: pagador, valor, ciclo, meios, `proxima_cobranca_em`, `dias_ate_proxima`, `cobranca_antecipada`, `primeira_cobranca_em`, `alerta_cortesia`). Checkout ASAAS é `RECURRENT` MONTHLY com `nextDueDate` = fim da cortesia vigente (ou hoje).
- UI canônica de mensalidade: `/conta/mensalidade` (status + renovação + aviso de cortesia); `/cadastro/pagamento` permanece para quem já autenticou.
- Webhook `/webhooks/bancarios/asaas` confirma billing **e** baixa COB operacional; eventos de atraso/cancelamento marcam `SUSPENSA`.
- Ops: `plataforma:avisar-cortesia-billing` (diário 08:00) lista contas com cortesia acabando sem meio autenticado.
- Lab ≈ produção no cadastro atual: `plataforma:abrir-cobranca-pos-cortesia` / `make cenario-mensalidade-pos-cortesia` encerra a cortesia, recoloca a mensalidade em aberto (sem apagar EMP/PAR/ORC) e o login cai em `/conta/mensalidade`.
- Ensaio local ≈ produção (tunnel flexorc + webhook ASAAS): `docs/ADR_ENSAIO_ASAAS_FLEXORC.md` · `make ensaio-asaas`.
- Saques ASAAS: URL distinta `/webhooks/bancarios/asaas/autorizar-saque` — fail-closed (`docs/ADR_ASAAS_AUTORIZACAO_SAQUE.md`).
- Enviar proposta na EMP self-service exige mensalidade autenticada **ou** cortesia vigente **e** A1 apto (vigente + CNPJ idêntico). Rascunho livre. Legado sem `empresa_ativacoes` não entra no portão.
- `GET /ativacao` inclui `certificado_a1_pendente`, alerta de vigência (`certificado_a1_alerta`, `certificado_a1_status`, `certificado_a1_dias_para_vencer`) e o passo `certificado_a1` (`/empresas?tab=a1`).
- Identidade: TRIGGER fornece; EMP é contexto; não tratar EMP como marca.
