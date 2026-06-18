# Plano de execução — Condomínio Inter → produto vendável

> **Objetivo:** transformar o app técnico pronto em produto comercial e conseguir o **primeiro cliente pago** em até 10 dias.  
> **Princípio:** olhar para frente, ser prático e focar na venda — não reconstruir o sistema.

---

## 1. Onde você está hoje

| Você já tem | Ainda falta |
|-------------|-------------|
| Sistema financeiro completo (cobrança, extrato, conciliação, PDFs) | Posicionamento comercial claro |
| Integração bancária real (Banco Inter) | Textos voltados ao síndico, não ao desenvolvedor |
| CNPJ e empresa prontos | Canal de contato comercial (WhatsApp, landing) |
| App funcional no Android | Materiais de venda (prints, vídeo, Play Store) |
| Backup/restauração para implantação | Primeiro fluxo de clientes pagos |

**Conclusão:** o produto técnico está pronto. O trabalho agora é **embalagem + venda**, não código complexo.

---

## 2. Modelo de negócio (escolhido)

```
App na Play Store  →  vitrine + credibilidade (não é o canal principal de receita)
Venda direta B2B   →  implantação assistida + mensalidade recorrente
```

### Precificação sugerida (inicial)

| Item | Faixa sugerida |
|------|----------------|
| Implantação (configuração + treinamento) | R$ 300 – R$ 1.500 |
| Mensalidade por condomínio pequeno | R$ 50 – R$ 200/mês |
| App na loja | Gratuito ou valor simbólico |

> A receita vem do **contrato B2B**, não de downloads orgânicos na Play Store.

### Público-alvo

- Síndicos de condomínios pequenos (até ~50 unidades)
- Administradoras locais pequenas
- Condomínios sem ERP caro

### Proposta de valor (1 frase)

> *"Automatizo a gestão financeira do seu condomínio: cobrança, conciliação bancária e prestação de contas — sem planilha manual."*

---

## 3. O que precisa mudar no app

### 3.1 Prioridade máxima (fazer antes de vender)

#### A) Reposicionar nome e textos

| Hoje (técnico) | Mudar para (comercial) |
|----------------|------------------------|
| Condomínio Inter | Nome comercial neutro (ex.: *Gestão Condominial*, *CondoGestão*) |
| Saldo Inter (API) | Saldo bancário / Saldo da conta |
| Atualizar saldo Inter | Atualizar saldo |
| OAuth2 + mTLS | (remover da interface — fica nos bastidores) |
| Documentação da API Inter | Benefícios + contato comercial |

**Arquivos principais a editar:**

- `app/src/main/res/values/strings.xml`
- `app/src/main/res/layout/fragment_home.xml`
- `app/src/main/java/.../onboarding/OnboardingWelcomeFragment.kt`
- `app/src/main/java/.../onboarding/OnboardingInterFragment.kt`
- `app/src/main/res/layout/bottom_sheet_credits.xml`

#### B) Adicionar canal comercial no app

Incluir na tela **Sobre** ou **Ajustes**:

- [ ] Botão **WhatsApp** — "Falar com suporte / Solicitar implantação"
- [ ] Link para landing page
- [ ] Texto: *"Implantação assistida disponível"*
- [ ] E-mail comercial (já existe: `diogo.moura@triggerti.com`)

#### C) Simplificar onboarding para implantação assistida

**Situação atual:** 9 passos, passo 2 exige Client ID/Secret e certificado mTLS — barreira alta para síndico leigo.

**Estratégia:**

1. **Você configura o Inter** para o cliente (remoto ou presencial)
2. O síndico recebe o app já pronto para usar
3. Onboarding do síndico foca em: condomínio → unidades → cobrança → prestação de contas

**Ação:** esconder ou simplificar a tela técnica de Ajustes (credenciais Inter) para usuário final.

#### D) Play Store — checklist mínimo

- [x] Política de privacidade (URL obrigatória) → `docs/politica-privacidade.html`
- [x] Configurar assinatura de release (`signingConfig`) → `keystore.properties` + script
- [x] Descrição comercial (não técnica) → `docs/PLAY_STORE.md`
- [ ] 4–5 prints focados em benefício (capturar no aparelho — guia em `docs/PLAY_STORE.md`)
- [ ] Vídeo curto (30–60s) — roteiro em `docs/PLAY_STORE.md`
- [ ] Publicar HTML de privacidade em `https://triggerti.com/privacidade-gestao-condominial.html`
- [ ] Preencher `commercial_whatsapp_phone` em `strings.xml`

---

### 3.2 Prioridade média (primeiros clientes)

#### E) Comunicar valor em 10 segundos

Na **Home** e no **onboarding final**, mostrar o fluxo:

```
Dinheiro entra → Sistema concilia → Gera prestação de contas
```

Hoje a Home mostra saldos e números, mas não comunica o benefício principal.

#### F) Materiais de venda (fora do app)

| Material | Descrição | Prazo |
|----------|-----------|-------|
| Landing page | 1 página: proposta + vídeo + botão WhatsApp | 1–2 dias |
| Vídeo demo | 30–60s gravando o app real (sem edição complexa) | 1 dia |
| Script de abordagem | Texto para síndico/administradora local | 1 hora |
| Pitch de 20 segundos | Versão oral para demonstração presencial | 30 min |

---

### 3.3 Pode esperar (não bloqueia venda inicial)

| Item | Por quê esperar |
|------|-----------------|
| Integração multi-banco | Inter-only é suficiente na fase 1 |
| Painel web | Mobile atende síndico pequeno; web vem com escala |
| Multi-condomínio no app | App é 1 condomínio por aparelho — ok para síndico |
| Backend/nuvem | Dados locais + backup JSON já funcionam |
| Pagamento in-app | Modelo B2B manual é mais rápido para primeiro caixa |

---

## 4. O que NÃO precisa mudar

O núcleo técnico já está alinhado com a proposta de venda:

- Integração bancária real (Inter)
- Emissão de cobranças e boletos
- Conciliação extrato ↔ unidades/pessoas
- Prestação de contas em PDF
- Copiar resumo de inadimplência para WhatsApp
- Backup/restauração JSON (útil na implantação)
- Certidão de débitos por unidade
- Despesas fixas recorrentes

**Não entre em refatoração grande.** O gap é comercial, não funcional.

---

## 5. Cronograma — 10 dias

### Dias 1–2: Embalagem do app

- [ ] Definir nome comercial do produto
- [ ] Revisar e trocar textos técnicos por textos de benefício
- [ ] Adicionar botão WhatsApp + link landing na tela Sobre/Ajustes
- [ ] Escrever proposta de valor (1 frase)

### Dias 2–3: Presença comercial

- [ ] Criar landing page simples (mesmo que básica)
- [ ] Publicar política de privacidade
- [ ] Configurar assinatura de release no Android

### Dias 3–4: Materiais visuais

- [ ] Gravar vídeo demo (30–60s) do app funcionando
- [ ] Capturar 4–5 prints para Play Store
- [ ] Escrever descrição comercial da Play Store
- [ ] Preparar script de abordagem para síndicos

### Dias 5–7: Ajuste de experiência

- [ ] Simplificar onboarding (modo implantação assistida)
- [ ] Ajustar Home para comunicar benefício principal
- [ ] Testar fluxo completo como se fosse um síndico leigo

### Dias 8–10: Venda ativa

- [ ] Listar 20–30 contatos (síndicos, administradoras, conhecidos, grupos locais)
- [ ] Abordar com pitch de 20 segundos + demo no celular
- [ ] Marcar 5–10 demonstrações
- [ ] Oferecer piloto: 30 dias grátis ou valor simbólico
- [ ] **Meta: fechar 1 cliente pago**

---

## 6. Estratégia de lançamento

### Fase 1 — Lançamento controlado (antes da Play Store pública)

1. Escolher 3–10 condomínios ou síndicos
2. Oferecer uso gratuito por 30 dias (ou valor simbólico)
3. Acompanhar de perto, corrigir bugs e coletar feedback
4. Conseguir 1–2 casos reais de sucesso

### Fase 2 — Play Store como prova social

1. Publicar oficialmente
2. Usar depoimentos e prints reais de clientes piloto
3. Play Store vira vitrine, não canal de aquisição

---

## 7. Script de abordagem (modelo)

### WhatsApp / mensagem direta

```
Olá [nome], tudo bem?

Sou [seu nome], da Trigger Data Intelligence. Desenvolvi um sistema 
que automatiza a gestão financeira de condomínios pequenos: 
cobrança, conciliação bancária e prestação de contas em PDF.

Posso te mostrar em 15 minutos como funciona no celular? 
Sem compromisso.
```

### Pitch de 20 segundos (presencial)

```
Meu sistema automatiza toda a gestão financeira do condomínio: 
emite cobrança, sincroniza com o banco, concilia pagamentos 
automaticamente e gera a prestação de contas em PDF. 
O síndico não precisa mais conferir extrato na mão.
```

### Demonstração (15–20 min)

1. Mostrar saldo e dashboard (30s)
2. Sincronizar extrato e conciliar um lançamento (3 min)
3. Emitir cobrança do mês (2 min)
4. Gerar prestação de contas PDF (2 min)
5. Copiar resumo de inadimplência para WhatsApp (1 min)
6. Fechar: *"Posso implantar no seu condomínio em X dias. Mensalidade a partir de R$ Y."*

---

## 8. Posicionamento — o que dizer e o que evitar

### Dizer (benefício)

- "Automatiza cobrança e prestação de contas"
- "Concilia o extrato bancário automaticamente"
- "Ideal para condomínios pequenos"
- "Implantação assistida — eu configuro tudo para você"

### Evitar (técnico)

- "App integrado ao Banco Inter via OAuth2 e mTLS"
- "ERP financeiro condominial"
- "Sistema administrativo completo"
- "App de condomínio no celular"

### Sobre o Banco Inter

- **Não esconder**, mas **não liderar** com o banco
- Posicionar como: *"integração bancária real"* (diferencial)
- Inter é o primeiro conector; outros bancos podem vir depois conforme demanda

---

## 9. Métricas de sucesso

| Prazo | Meta |
|-------|------|
| 10 dias | 1 cliente pago (mesmo valor baixo) |
| 30 dias | 3 clientes pagos + 2 depoimentos |
| 60 dias | Play Store publicada + landing page ativa |
| 90 dias | Avaliar painel web (se clientes pedirem) |

> **Regra:** não escalar marketing antes de validar receita com clientes reais.

---

## 10. Resumo executivo

```
PRODUTO     →  Pronto. Não reconstruir.
POSIÇÃO     →  Solução financeira automatizada para condomínio pequeno.
VENDA       →  Direta B2B: implantação + mensalidade.
CANAL       →  WhatsApp + demo presencial/remota (não Play Store orgânica).
PRAZO       →  10 dias para primeiro cliente pago.
FOCO        →  Textos, contato comercial, materiais visuais, abordagem ativa.
```

---

*Documento gerado em maio/2026 — Trigger Data Intelligence*
