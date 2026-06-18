# Licenças & Cobranças Inter (Trigger TI)

Painel local para operar licenças B2B (`mycondominio`, `estsankhya`) no Supabase e emitir cobranças via **API Cobrança Inter** — conta **Trigger TI**, separada do Inter que cada condomínio usa no app Android.

---

## Índice

1. [Como funciona](#como-funciona)
2. [Antes de começar](#antes-de-começar)
3. [Guia rápido (5 minutos)](#guia-rápido-5-minutos)
4. [Passo a passo completo](#passo-a-passo-completo)
   - [Fase A — Supabase (banco + funções)](#fase-a--supabase-banco--funções)
   - [Fase B — Painel local](#fase-b--painel-local)
   - [Fase C — Inter Trigger TI](#fase-c--inter-trigger-ti)
   - [Fase D — Webhook (baixa automática)](#fase-d--webhook-baixa-automática)
   - [Fase E — Primeiro cliente](#fase-e--primeiro-cliente)
   - [Fase F — Mensalidades](#fase-f--mensalidades)
5. [Checklist final](#checklist-final)
6. [Uso do dia a dia](#uso-do-dia-a-dia)
7. [Solução de problemas](#solução-de-problemas)
8. [Referência técnica](#referência-técnica)

---

## Como funciona

```
┌─────────────────┐     emitir cobrança      ┌──────────────┐
│  Painel (8090)  │ ───────────────────────► │  Inter API   │
│  trigger/14     │ ◄──── webhook pagamento ─│  Trigger TI  │
└────────┬────────┘                          └──────────────┘
         │ atualiza licenses + billing_charges
         ▼
┌─────────────────┐     license-status       ┌──────────────┐
│    Supabase     │ ◄─────────────────────── │ myCondominio │
│ licenses +      │     license-activate   │  EstSankhya  │
│ billing_charges │                          └──────────────┘
└─────────────────┘
```

| Quem | O que faz |
|------|-----------|
| **Este painel** | Emite boleto/Pix, registra cobrança, libera/renova licença ao pagar |
| **Apps Android/Flutter** | Só consultam `license-status` / `license-activate` — **não falam com o Inter** |
| **Inter do condomínio (app)** | Outra conta, outra integração — **não misturar** |

**Cobrança inicial** = implantação assistida + 1ª mensalidade (valor único).  
**Mensalidade** = cobrança recorrente manual (job automático ainda não implementado).

---

## Antes de começar

Confirme que você tem tudo isto em mãos:

| # | Item | Onde conseguir |
|---|------|----------------|
| 1 | Projeto Supabase | [supabase.com](https://supabase.com) |
| 2 | Edge Functions publicadas | `myCondominio/license-server` |
| 3 | Conta PJ Inter da **Trigger TI** | Internet Banking Inter Empresas |
| 4 | **Nova integração** Inter (não reutilizar a do app) | [developers.inter.co](https://developers.inter.co) |
| 5 | Client ID, Client Secret, `.crt`, `.key` | Portal Inter → Integrações |
| 6 | Permissões: Emitir cobrança, Consultar cobranças, Webhook | Portal Inter → Integrações |
| 7 | Docker instalado | Máquina local ou VPS |

> **Importante:** use uma integração Inter **nova**, da conta PJ da Trigger TI.  
> **Não** use credenciais do app Gestão Condominial — são contas e integrações diferentes.

---

## Guia rápido (5 minutos)

Se o Supabase e as Edge Functions **já estão prontos**:

```bash
# 1. Subir o painel
cd /home/dfmoura/Documents/test_several1/trigger/14
docker compose up --build

# 2. Abrir no navegador
# http://localhost:8090
```

No painel, nesta ordem:

1. **Credenciais** → URL + Service Role Key → Testar → Salvar  
2. **Inter** → Client ID/Secret + `.crt`/`.key` → Testar → Salvar  
3. Tabela `licenses` → **Carregar** → **Novo** → preencher licença com CNPJ  
4. **Cobrança inicial** → enviar PDF/Pix ao cliente  
5. Após pagamento → **Sync** (ou aguardar webhook) → app libera

---

## Passo a passo completo

### Fase A — Supabase (banco + funções)

#### A1. Criar tabelas

No Supabase → **SQL Editor**, execute **nesta ordem**:

| Ordem | Arquivo | Resultado |
|-------|---------|-----------|
| 1 | `myCondominio/license-server/supabase/migrations/20260601000000_licenses.sql` | Tabela `licenses` |
| 2 | `myCondominio/license-server/supabase/migrations/20260602000000_license_app_id.sql` | Coluna `app_id` |
| 3 | `trigger/14/migrations/20260609000000_billing_charges.sql` | Tabela `billing_charges` |
| 4 | `trigger/14/migrations/20260609100000_license_pagador.sql` | Colunas pagador em `licenses` |

> Já usa licenças no Supabase? Pule os itens 1 e 2 — execute só o item 3.

**Como verificar:** Supabase → **Table Editor** → deve existir `licenses` e `billing_charges`.

---

#### A2. Publicar Edge Functions (apps)

Os apps dependem destas funções. Se ainda não publicou:

```bash
cd /home/dfmoura/StudioProjects/myCondominio/license-server
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy license-status
supabase functions deploy license-activate
```

**Como verificar:**

```bash
curl -s -X POST \
  'https://SEU_PROJECT.supabase.co/functions/v1/license-status' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"license_key":"TESTE-2026-0001","device_id":"test","app_id":"mycondominio"}'
```

Resposta esperada: `"allowed": true` (se a chave de teste existir).

---

### Fase B — Painel local

#### B1. Subir o painel

```bash
cd /home/dfmoura/Documents/test_several1/trigger/14
docker compose up --build
```

Abra: **http://localhost:8090**

**Como verificar:** a página carrega com os botões **Credenciais**, **Inter** e **Apps** no topo.

---

#### B2. Conectar ao Supabase

1. Clique **Credenciais** (barra lateral esquerda)
2. Preencha:

| Campo | Valor |
|-------|-------|
| URL | `https://SEU_PROJECT.supabase.co` |
| Service Role Key | chave `service_role` (legacy) |

3. Clique **Testar** → *Conexão OK*
4. Clique **Salvar**

> Onde achar a key: Supabase → Project Settings → API → **Legacy anon, service_role API keys** → `service_role`.  
> **Não** use a publishable key.

**Como verificar:** selecione a tabela `licenses` → **Carregar** → a lista de licenças aparece.

---

### Fase C — Inter Trigger TI

#### C1. Criar integração no portal Inter

1. Acesse [developers.inter.co](https://developers.inter.co) → login pelo Internet Banking (QR Code)
2. **Soluções para sua empresa** → **Nova integração**
3. Nome sugerido: `Trigger TI — Licenças B2B`
4. Marque as permissões:
   - Emitir cobrança
   - Consultar cobranças
   - Webhook de cobrança
5. Baixe e guarde:
   - Client ID
   - Client Secret
   - Certificado (`.crt`)
   - Chave privada (`.key`)
6. Anote a **conta corrente** (caso o Inter exija o header `x-conta-corrente`)

**Como verificar:** os arquivos `.crt` e `.key` abrem em editor de texto (formato PEM legível).

---

#### C2. Configurar no painel

1. Clique **Inter** (barra lateral)
2. Preencha os campos:

| Campo | Exemplo / valor |
|-------|-----------------|
| Client ID | da integração Trigger TI |
| Client Secret | da integração Trigger TI |
| Conta corrente | **só números**, conta+dígito **sem hífen** (ex.: `538375221`, não `53837522-1`) — obrigatória para cancelar |
| Sandbox | marque **só** se estiver no ambiente de testes |
| Escopos | `boleto-cobranca.read boleto-cobranca.write` |
| Implantação (R$) | `500.00` |
| Mensalidade (R$) | `99.00` |
| Dias p/ vencimento | `7` |
| Endereço / Cidade / UF / CEP | fallback só se a licença não tiver pagador (use CNPJ na licença) |

3. Selecione **Certificado .crt** e **Chave .key**
4. Clique **Testar** → *Conexão OK* (`https://cdpj.partners.bancointer.com.br` ou sandbox)
5. Clique **Salvar**

**Como verificar:** certificados salvos em `data/inter_trigger_ti/trigger_ti.crt` e `trigger_ti.key` (não commite).

**Erros comuns:**

| Mensagem | O que fazer |
|----------|-------------|
| Certificado não encontrado | Envie `.crt` + `.key` antes de testar |
| OAuth 401 | Confira Client ID e Client Secret |
| Consultar cobrança 401 (*Login/senha inválido*) | OAuth pode passar, mas a **conta corrente** está errada. Use **conta+dígito sem hífen** (ex.: `538375221`, não `53837522` nem `53837522-1`). Salve e clique **Testar** de novo. |
| OAuth 429 | Limite de tokens do Inter (muitos cliques em Testar/Sync). Aguarde ~1 minuto; o painel reutiliza o mesmo token entre requisições. |
| SSL / mTLS error | Par `.crt`/`.key` trocado ou de outra integração |
| Escopo inválido | Marque as permissões no portal Inter |

---

### Fase D — Webhook (baixa automática)

Quando o cliente paga, o Inter avisa o painel. Para isso, o painel precisa de uma URL **pública** na internet.

#### D1. Expor o painel

**Opção A — ngrok (teste rápido)**

```bash
# Em outro terminal, com o painel rodando:
ngrok http 8090
```

Copie a URL HTTPS (ex.: `https://abc123.ngrok-free.app`).

**Opção B — VPS / domínio fixo**

Aponte `https://seu-dominio.com` para a máquina que roda o painel (porta 8090).

---

#### D2. Registrar webhook

1. Painel → **Inter** → campo **URL pública** → cole a URL (**sem** barra no final)
2. Clique **Salvar**
3. Clique **Ver webhook** → confira a URL completa (inclui `?token=...`)
4. Clique **Registrar no Inter**

**Como verificar:** em **Ver webhook**, o campo `registered` deve mostrar a mesma URL.

> **Sem URL pública?** Use o botão **Sync** na cobrança para confirmar pagamento manualmente.

---

### Fase E — Primeiro cliente

#### E1. Pré-cadastrar licença

> **Cadastrar ≠ ativar o app.** Neste passo você só registra o cliente. O painel gera a chave (`TRIG-2026-0001`, `TRIG-2026-0002`…) e mantém o app bloqueado até o pagamento.

1. Tabela **licenses** → **Carregar**
2. Clique **Novo** — formulário **Nova licença (pré-cadastro)**
3. Preencha:

| Campo | O que informar |
|-------|----------------|
| CNPJ | 14 dígitos → clique **Buscar CNPJ** (consulta BrasilAPI / Receita) |
| Nome / endereço do pagador | Preenchidos pela busca; revise se necessário |
| App | `mycondominio` ou `estsankhya` |
| Notas internas | Opcional |

O painel define automaticamente:

| Campo | Valor automático |
|-------|------------------|
| `license_key` | Sequencial `TRIG-ANO-NNNN` |
| `implantacao_paga` | `false` |
| `ativa` | `true` (habilitada no sistema; app ainda bloqueado) |
| `valido_ate` | +30 dias (renovado ao pagar) |

4. Clique **Salvar** — anote a chave exibida (ex.: `TRIG-2026-0003`) para enviar ao cliente depois do pagamento

> **Erro `pagador_cep` / PGRST204?** Execute no Supabase o item 4 da Fase A (`20260609100000_license_pagador.sql`). Sem isso o pré-cadastro ainda funciona, mas o endereço do pagador só é buscado na hora da cobrança.

---

#### E2. Emitir cobrança inicial

A cobrança inicial inclui **implantação + 1ª mensalidade** em um único boleto/Pix.

1. Na linha da licença, clique **Cobrar** (ou digite a `license_key` na barra de cobrança)
2. Clique **Cobrança inicial**
3. Valor = Implantação + Mensalidade (configurados na Fase C)

**Como verificar:** em *Cobranças emitidas*, status `EMITIDA`, com botões **PDF**, **Pix** e **Cancelar** (se precisar refazer).

Envie o PDF ou o Pix copia e cola ao cliente.

---

#### E3. Confirmar pagamento e liberar app

| Situação | O que fazer |
|----------|-------------|
| Webhook configurado | Aguarde alguns minutos após o pagamento |
| Sem webhook | Clique **Sync** na cobrança |

**Como verificar no Supabase** (Table Editor → `licenses`):

| Campo | Valor esperado após pagamento |
|-------|-------------------------------|
| `implantacao_paga` | `true` |
| `valido_ate` | +32 dias a partir do pagamento |
| `ativa` | `true` |

**Como verificar no app:** informe a `license_key` → o app deve liberar (sem *Implantação ainda não confirmada*).

---

#### E4. Fluxo completo do primeiro cliente

```
1. Pré-cadastrar licença no painel (app ainda bloqueado)
2. Cobrança inicial → enviar boleto/Pix
3. Cliente paga
4. Webhook ou Sync → implantacao_paga=true no Supabase
5. Você faz a implantação assistida no condomínio
6. Cliente digita a license_key no app → aparelho vinculado → app libera
```

---

### Fase F — Mensalidades

Todo mês, para cada cliente ativo:

1. Selecione a `license_key` na barra de cobrança
2. Clique **Mensalidade**
3. Envie PDF/Pix ao cliente
4. Após pagamento → webhook ou **Sync** → `valido_ate` estendido +32 dias

> Emissão mensal automática (job agendado) **ainda não está implementada** — hoje é manual pelo painel.

---

## Checklist final

Marque cada item ao concluir:

- [ ] Tabelas `licenses` e `billing_charges` existem no Supabase
- [ ] Edge Functions `license-status` e `license-activate` respondem
- [ ] Painel abre em http://localhost:8090
- [ ] Supabase conectado (Carregar tabela `licenses` OK)
- [ ] Inter **Testar** retorna Conexão OK
- [ ] Webhook registrado no Inter (ou Sync manual disponível)
- [ ] Cobrança inicial emitida com PDF/Pix
- [ ] Pagamento confirmado → `implantacao_paga = true`
- [ ] App libera com a `license_key` cadastrada

---

## Uso do dia a dia

### Novo cliente

1. **Novo** na tabela `licenses` (com CNPJ)
2. **Cobrança inicial** → enviar ao cliente
3. Aguardar pagamento (webhook ou **Sync**)
4. Fazer implantação assistida
5. Cliente ativa o app

### Renovar mensalidade

1. **Mensalidade** → enviar ao cliente
2. Aguardar pagamento (webhook ou **Sync**)

### Parar / reiniciar o painel

```bash
# Parar (dados preservados em data/)
docker compose down

# Subir de novo
docker compose up -d
```

---

## Solução de problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| App: *Implantação ainda não confirmada* | `implantacao_paga = false` | Emita cobrança inicial e confirme pagamento |
| App: *Licença expirada* | `valido_ate` venceu (+ 7 dias de carência) | Emita **Mensalidade** e confirme pagamento |
| Cobrança emitida, licença não atualiza | Webhook inacessível | Use **Sync** na cobrança |
| Webhook parou de funcionar | URL ngrok mudou | Atualize URL pública → **Registrar no Inter** |
| *Tabela billing_charges não existe* | Migration não aplicada | Execute `migrations/20260609000000_billing_charges.sql` |
| *Licença precisa de CPF/CNPJ válido* | Campo `cnpj` vazio ou inválido | Preencha com 11 ou 14 dígitos |
| *Já existe cobrança em aberto* | Cobrança anterior não paga | **Sync** ou aguarde pagamento antes de emitir outra |
| Cancelar: *xContaCorrente* inválido | Conta com hífen (`53837522-1`) | Use só dígitos: `538375221` → **Inter** → Salvar → **Cancelar** |
| Cancelar não reflete no Inter | Conta corrente vazia ou situação `BAIXADO` | Preencha conta (só números) → **Cancelar** ou **Sync** |

---

## Referência técnica

### Separação dos dois mundos Inter

| | App condomínio (Android) | Este painel (Trigger TI) |
|---|---|---|
| Conta bancária | PJ do **condomínio** | PJ da **Trigger TI** |
| Integração portal | Uma por condomínio | Uma só (licenças B2B) |
| Credenciais | No aparelho Android | `data/inter_trigger_ti/` |
| API usada | Cobrança do condomínio | Cobrança de licenças |
| Quem paga | Moradores | Clientes B2B (síndico/empresa) |

### Persistência local

```
data/
├── app.db                 ← credenciais Supabase + Inter (SQLite)
└── inter_trigger_ti/      ← certificado e chave (.crt / .key)
    ├── trigger_ti.crt
    └── trigger_ti.key
```

- `docker compose down` **não apaga** os dados
- Faça backup copiando a pasta `data/`
- **Nunca** commite `data/` no git

### API REST do painel

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/inter/config` | Credenciais Inter Trigger TI |
| POST | `/api/inter/config/upload-cert` | Upload `.crt` + `.key` |
| POST | `/api/inter/config/test` | Testar OAuth/mTLS |
| GET | `/api/inter/webhook/info` | URL de callback |
| POST | `/api/inter/webhook/register` | Registrar webhook no Inter |
| POST | `/api/inter/webhook?token=…` | Callback de pagamento |
| POST | `/api/billing/charges/initial` | Implantação + 1ª mensalidade |
| POST | `/api/billing/charges/monthly` | Mensalidade |
| POST | `/api/billing/charges/{id}/sync` | Consultar status no Inter |
| POST | `/api/billing/charges/{id}/cancel` | Cancelar cobrança EMITIDA no Inter |
| GET | `/api/cnpj/{cnpj}` | Consultar CNPJ (BrasilAPI) e dados do pagador |
| GET | `/api/billing/charges/{id}/pdf` | PDF da cobrança |
| GET | `/api/billing/charges` | Listar cobranças |

### Documentação Inter

- [API Cobrança (Boleto + Pix)](https://developers.inter.co/references/cobranca-bolepix)
- [Pix Automático](https://developers.inter.co/references/pix-automatico) — não implementado; fallback é API Cobrança
