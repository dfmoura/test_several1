# ADR — Console de plataforma TRIGGER (operação FLEXORC)

**Status:** Aceito · **Data:** 2026-08-19  
**Norma:** `ADR_FATIA_COMERCIAL_SAAS.md` · `ADR_ATIVACAO_EMPRESA.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md` · `IDENTIDADE_TRIGGER.md`

## Contexto

O FLEXORC nesta instalação é **SaaS self-service**: N contas pagam mensalidade à TRIGGER; cada conta tem até 3 EMP. O papel `ADMIN` é o **master da conta que paga** — gestão de usuários e EMP *daquela conta*. Não existe visão transversal de quem está cadastrado e pagando.

A TRIGGER precisa operar a instalação (contas, billing, saúde) **sem que qualquer cliente veja ou herde esse poder**.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Console **no monólito**, prefixo `/plataforma` e `/api/v1/plataforma/*` | Estudo 32: não três sistemas. Reusa Sanctum, Spatie, `conta_ativacoes`, audit |
| Papel Spatie **`PLATAFORMA`** + permissões `plataforma.*` | `ADMIN` já é superusuário da UI do cliente; sobrecarregá-lo vazaria o console |
| Fora de `ROLE_CATALOG` e do onboarding | Self-service nunca atribui o papel. Cadastro de usuários da conta recusa `PLATAFORMA` |
| Provisionar operador **só por CLI** (`plataforma:criar-operador`) | Sem auto-cadastro, sem tela de “criar superadmin” no FLEXORC |
| Operador **sem** `empresa_user` | Não entra no livro de nenhuma EMP; `SetEmpresaContext` não se aplica às rotas da plataforma |
| Unidade de listagem = **conta** (`conta_ativacoes`), não usuário solto | Mensalidade é da conta, não do CNPJ (`ADR_ATIVACAO_EMPRESA`) |
| Fase 1 leitura + **fase 2 escrita controlada** | Ver quem paga; provisionar master; bonificar cortesia — sem impersonação nem suspender ASAAS |
| Cortesia = `cortesia_ate` na conta (não finge ASAAS) | Libera produto; MRR não conta; cliente vê “Período cortesia” em `/conta/mensalidade` |
| UI própria (herói TRIGGER) | Superfície de operação da TRIGGER, não do produto FLEXORC do cliente |

```
TRIGGER (operador PLATAFORMA) → console /plataforma
FLEXORC (cliente ADMIN)       → AppShell /usuarios — só a própria conta
EMP                           → livro operacional isolado
```

### Permissões

| Permissão | Uso |
|-----------|-----|
| `plataforma.operar` | Entra no console |
| `plataforma.contas.ler` | Métricas, listagem e detalhe de contas / EMP / usuários |
| `plataforma.contas.provisionar` | Cria conta master (mesmo motor do CLI) |
| `plataforma.contas.bonificar` | Concede / estende / revoga período cortesia |
| `plataforma.usuarios.ler` | Reserva (mesmo escopo de leitura no detalhe) |
| `plataforma.auditoria.ler` | Log de ações do console |
| `plataforma.integracoes.gerir` | Setup Inter (mensalidade PIX) — credenciais cifradas |
| `plataforma.billing.gerir` | Plano comercial (valor/ciclo/descrição da mensalidade) |

`ADMIN` **não** recebe nenhuma. No frontend, `ADMIN` deixa de ser tratado como superusuário para strings `plataforma.*`.

### Fase 2 — provisionar e bonificar

| Ação | API / CLI | Efeito |
|------|-----------|--------|
| Nova conta master | `POST /plataforma/contas` · `plataforma:criar-conta` | USR + ADMIN + `conta_ativacoes` PENDENTE; senha temporária se omitida |
| Cortesia (N dias ou data) | `POST /plataforma/contas/{id}/cortesia` · `plataforma:bonificar-conta` | `cortesia_ate`; `acessoLiberado()` = pago ASAAS **ou** cortesia vigente |
| Encerrar cortesia | mesmo endpoint com `encerrar: true` · `--encerrar` | `cortesia_ate` no passado; histórico permanece; pagamento ASAAS intacto |
| Revogar cortesia | mesmo endpoint com `revogar: true` | Zera campos de cortesia |
| Lab: pós-cortesia no cadastro atual | `plataforma:abrir-cobranca-pos-cortesia` · `make cenario-mensalidade-pos-cortesia` | Encerra cortesia + reabre cobrança demo; EMP/PAR/ORC intactos |

**Não** marca `billing_metodo_em` na bonificação — evita poluir MRR e o ciclo ASAAS.

### Fora de escopo (ainda)

- Impersonar o cliente / “entrar como”
- Cancelar ou reenviar checkout pelo console (suspensão por inadimplência vem do webhook ASAAS)
- Item de menu no FLEXORC
- Seed de operador (demo RLP não é TRIGGER)

## Consequências

- Rotas autenticadas do console: `auth:sanctum` + `EnsurePlatformOperator` — **sem** `SetEmpresaContext`.
- Cliente `ADMIN` em `/api/v1/plataforma/*` → **403**. URL `/plataforma` na UI → redireciona ao painel FLEXORC.
- Operador entra no login habitual e vai para `/plataforma`; não opera ORC no lugar do cliente.
- Toda consulta de detalhe de conta registra `PLATAFORMA_CONTA_VER` no audit log.
- Isolamento operacional (`empresa_id` + `hasEmpresaAccess`) permanece intacto no restante da API.

## Aceite

- [x] Suite `ConsolePlataformaTest` (admin 403 · operador lista · CLI · provisionar · cortesia)
- [x] Operador CLI consegue listar contas de billing; master self-service não
- [x] Menu FLEXORC sem “Plataforma”
- [x] Nova conta master + cortesia no console; cliente vê período free em Mensalidade
