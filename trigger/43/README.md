# FLEXORC — fatia comercial (estudo 32 + motor do 39)

Produto **FLEXORC** da **TRIGGER**: orçamento profissional até o **envio ao cliente** (link de aprovação + **sinal/PIX**), com **cadastro de clientes/prospects**. Outras empresas entram sozinhas e operam isoladas.

Norma de domínio: `../32` (GERACAO_ORCAMENTO, APROVACAO_ORCAMENTO_CLIENTE, ORCAMENTO_PROSPECT, CADASTRO_PARCEIROS).  
Motor e fluxo: extraídos do FLEXOERP em `../39` — **sem redesenhar o cálculo**.  
Identidade: logo **FLEXORC** (navy `#1a3568` · verde `#7cb518`); atribuição discreta TRIGGER; EMP só contexto — `docs/IDENTIDADE_TRIGGER.md`.

## O que esta instalação entrega

| Inclui | Fora (continua no FLEXOERP / 39) |
|--------|----------------------------------|
| Auto-cadastro da empresa | Pedido, OP, estoque, compras |
| Clientes e prospects (PAR) | NF-e/NFS-e, faturamento de saída |
| Catálogo ORC e mapa de facas **por empresa** | Cadastro de SKU (Produtos), produção, expedição, comissão |
| Calcular, gravar, enviar proposta | Conversão ORC→PED |
| Link público, aceite, **sinal 50% / PIX** | |

## Arquitetura (decisão)

Uma instalação SaaS da TRIGGER × **N empresas**. Isolamento pelo `empresa_id` que o 39 já usava internamente, agora com **self-service** e **catálogo próprio** (preços de papel/hora-máquina não se misturam).

Não são três sistemas separados (estudo 32: monólito modular). Esta pasta é a **fatia verde comercial** do mesmo esqueleto.

```
TRIGGER → FLEXORC
  └── empresa A (cadastro) → clientes + ORC + envio/sinal
  └── empresa B (cadastro) → o mesmo, dados isolados
```

## Subir

```bash
cp -n .env.example .env
make up
```

- App: http://localhost:8043  
- Cadastro: http://localhost:8043/cadastro  
- Demo RLP (seed): `admin@rlp.com.br` / `Admin@123`

## Fluxo feliz

1. Você cria a conta (nome, e-mail, senha) e vê a mensalidade FLEXORC no ASAAS (pode pular; o **envio** da proposta espera isto).
2. Entra no sistema. O administrador cadastra até **3 empresas** (CNPJ) no menu Empresas. Cada uma nasce **vazia**: sem clientes e sem orçamentos.
3. Informa o PIX da empresa para receber o sinal, confere o catálogo de preços e cadastra o primeiro cliente (ou prospect mínimo).
4. Gera o orçamento (motor parametrizado do 39).
5. Envia o link. Cliente vê só a proposta comercial.
6. Se limite 0 / parâmetro de sinal: após o aceite o sistema emite cobrança PIX e fica **aguardando adiantamento**.

Detalhe: `docs/ADR_FATIA_COMERCIAL_SAAS.md` · `docs/ADR_ATIVACAO_EMPRESA.md`.
