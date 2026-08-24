# FLEXOERP — SaaS TRIGGER (motor do 39)

Produto **FLEXOERP** da **TRIGGER**: orçamento profissional até **pedido operacional**, com **envio ao cliente** (link + **sinal/PIX**), cadastro de clientes/prospects e self-service multi-empresa.

Norma de domínio: `../32`. Motor: extraído do FLEXOERP em `../39`.  
Identidade: logo **FLEXOERP** · tagline *ERP para gráficas* — `docs/IDENTIDADE_TRIGGER.md`. Transição: `docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md`.

## O que esta instalação entrega

| Inclui | Fora (continua no FLEXOERP / 39) |
|--------|----------------------------------|
| Auto-cadastro da empresa | Pedido, OP, estoque, compras |
| Clientes e prospects (PAR) | NF-e/NFS-e, faturamento de saída |
| Catálogo ORC e mapa de facas **por empresa** | Cadastro de SKU (Produtos), produção, expedição, comissão |
| Calcular, gravar, enviar proposta, **pedidos** | Conversão completa OP/NF/expedição (ondas 3+) |
| Link público, aceite, **sinal 50% / PIX** | |
| Matriz de **Implantação** (aceite dev × cliente) | |

## Arquitetura (decisão)

Uma instalação SaaS da TRIGGER × **N empresas**. Isolamento pelo `empresa_id` que o 39 já usava internamente, agora com **self-service** e **catálogo próprio** (preços de papel/hora-máquina não se misturam).

Não são três sistemas separados (estudo 32: monólito modular). Esta pasta é a **fatia verde comercial** do mesmo esqueleto.

```
TRIGGER → FLEXOERP
  └── empresa A (cadastro) → clientes + ORC + pedidos + envio/sinal
  └── empresa B (cadastro) → o mesmo, dados isolados
```

## Subir

```bash
cp -n .env.example .env
make up
```

- App: http://localhost:8043  
- Login (sem cadastro público): http://localhost:8043/login  
  Uma sessão por usuário; até 6 pessoas conectadas; 30 min sem uso encerra o acesso. 
- Primeira conta master (lab): `docker compose exec api php artisan plataforma:criar-conta email@empresa.com --name="Admin"`  
  (opcional: `--cortesia-dias=30` para período free)  
- Conta lab canônica: `make alinhar-primeiro-cadastro EMAIL=seu@email.com` → vira `USR-00001`  
- Console TRIGGER (lab): com a stack no ar, `make plataforma-pronto` → http://localhost:8043/plataforma  
  (`ops@triggerti.com` / `Ops@Trigger43` — só local; não é o cliente)  
  No console: **Nova conta master** e, no detalhe, **Bonificar (cortesia)**.  
- Mensalidade: cobrança **antecipada** no ASAAS (Checkout recorrente, cartão). Com cortesia, a 1ª cobrança cai no fim da bonificação; aviso na UI e `plataforma:avisar-cortesia-billing`.
- Ensaio ≈ produção (webhook + retorno via `https://flexorc.triggerti.com`): `make ensaio-asaas-ativar` · `docs/ADR_ENSAIO_ASAAS_FLEXORC.md`
- Cortesia acabou no cadastro atual (EMP/clientes/ORC intactos): `make cenario-mensalidade-pos-cortesia` → login cai em **Mensalidade**; **Pagar agora** (cartão ASAAS).

## Fluxo feliz

1. TRIGGER (ou lab) provisiona a conta master; o administrador cria usuários em **Usuários** e entrega e-mail/senha. Login só acessa. Mensalidade FLEXORC no ASAAS (pode autenticar depois; o **envio** da proposta espera isto).
2. Entra no sistema. Em **Administração → Mensalidade** acompanha status, dias até a próxima cobrança e meio (cartão no ASAAS). O administrador cadastra até **3 empresas** (CNPJ) no menu Empresas. Cada uma nasce **vazia**: sem clientes e sem orçamentos.
3. Informa o PIX da empresa para receber o sinal, confere o catálogo de preços e cadastra o primeiro cliente (ou prospect mínimo).
4. Gera o orçamento (motor parametrizado do 39).
5. Envia o link. Cliente vê só a proposta comercial.
6. Se limite 0 / parâmetro de sinal: após o aceite o sistema emite cobrança PIX e fica **aguardando adiantamento**.

Detalhe: `docs/ADR_FATIA_COMERCIAL_SAAS.md` · `docs/ADR_ATIVACAO_EMPRESA.md` · `docs/ADR_IMPLANTACAO_ACEITE.md`.
