# Guia Abrangente: Estruturar Classes e Lógica do Sistema Antes de Codar

> **Para quem é este guia:** você quer parar de "ir codando e descobrindo o design no caminho" e passar a **pensar o sistema inteiro antes de abrir o IDE** — de forma simples, repetível e com resultado concreto.

---

## Como usar este documento

| Se você tem... | Comece por... |
|----------------|---------------|
| 5 minutos | [Seção 0 — Resumo em 1 página](#0-resumo-em-1-página-leia-primeiro) |
| 30 minutos | Seções 0 → 1 → 2 → 3 |
| Um projeto novo | Seções 5 a 12 (templates) na ordem |
| Pronto para codar? | [Checklist da seção 13](#13-checklist-de-prontidão-para-codar) |

**Regra de ouro:** só comece a codar quando o checklist estiver **≥ 80%** completo.

---

## Índice

0. [Resumo em 1 página (leia primeiro)](#0-resumo-em-1-página-leia-primeiro)
1. [Por que projetar antes de codar](#1-por-que-projetar-antes-de-codar)
2. [A analogia da cozinha (entenda as camadas)](#2-a-analogia-da-cozinha-entenda-as-camadas)
3. [Processo em 7 fases (passo a passo)](#3-processo-em-7-fases-passo-a-passo)
4. [Princípios de design de classes](#4-princípios-de-design-de-classes)
5. [Fase 1 — Enquadramento do problema](#5-fase-1--enquadramento-do-problema)
6. [Fase 2 — Vocabulário e entidades do domínio](#6-fase-2--vocabulário-e-entidades-do-domínio)
7. [Fase 3 — Comportamentos e casos de uso](#7-fase-3--comportamentos-e-casos-de-uso)
8. [Fase 4 — Estados, eventos e regras](#8-fase-4--estados-eventos-e-regras)
9. [Fase 5 — Estrutura de classes e camadas](#9-fase-5--estrutura-de-classes-e-camadas)
10. [Fase 6 — Fluxos de dados e sequência](#10-fase-6--fluxos-de-dados-e-sequência)
11. [Fase 7 — Fronteiras, erros e integrações](#11-fase-7--fronteiras-erros-e-integrações)
12. [Templates prontos para copiar](#12-templates-prontos-para-copiar)
13. [Checklist de prontidão para codar](#13-checklist-de-prontidão-para-codar)
14. [Exemplo completo (mini-sistema)](#14-exemplo-completo-mini-sistema)
15. [Erros comuns e como evitar](#15-erros-comuns-e-como-evitar)
16. [Plano de treino (7 dias)](#16-plano-de-treino-7-dias)
17. [Referências e próximos passos](#17-referências-e-próximos-passos)

---

## 0. Resumo em 1 página (leia primeiro)

### O que você vai produzir

Antes de codar, você terá um **blueprint** (`DESIGN.md`) com:

1. **O problema** — o que resolve e o que *não* resolve
2. **O vocabulário** — nomes que todo mundo usa igual
3. **As entidades** — o que existe no mundo do sistema
4. **Os casos de uso** — o que o sistema *faz*
5. **As regras** — o que nunca pode acontecer
6. **As classes** — quem guarda dados, quem faz o quê
7. **Os fluxos** — passo a passo de cada operação importante
8. **As fronteiras** — erros, integrações, segurança

### O processo em uma frase

> **Entenda o problema → nomeie as coisas → liste o que o sistema faz → defina as regras → desenhe as classes → desenhe os fluxos → feche as fronteiras.**

### As 4 perguntas que toda classe responde

Antes de criar qualquer classe, responda:

| Pergunta | Exemplo ruim | Exemplo bom |
|----------|--------------|-------------|
| **O que ela guarda?** | "várias coisas" | `Pedido` guarda itens, status e clienteId |
| **O que ela faz?** | "processa tudo" | `Pedido.finalizar()` valida e muda status |
| **O que ela NÃO faz?** | (não definido) | `Pedido` não envia email nem acessa banco |
| **Quem a usa?** | "todo mundo" | `FinalizarPedidoUseCase` chama `Pedido.finalizar()` |

### Mapa mental rápido

```
PROBLEMA
   ↓
VOCABULÁRIO (glossário)
   ↓
ENTIDADES (o que existe)
   ↓
CASOS DE USO (o que o sistema faz)
   ↓
REGRAS E ESTADOS (o que nunca pode quebrar)
   ↓
CLASSES (quem é responsável por quê)
   ↓
FLUXOS (como tudo se conecta)
   ↓
CÓDIGO ✓
```

### Sinal de que está pronto

Você consegue explicar o sistema em **2 minutos** para alguém que não programa — e dizer **qual classe muda** se uma regra de negócio mudar.

---

## 1. Por que projetar antes de codar

### 1.1 O custo de descobrir tarde

| Onde você erra | Quanto custa corrigir |
|----------------|----------------------|
| No papel / markdown | minutos |
| Na primeira classe | horas |
| Com 3 módulos já acoplados | dias |
| Em produção com dados reais | semanas |

**Código é caro para descobrir.** Papel é barato.

### 1.2 O que "ficar muito bom" significa

Você está pronto quando consegue, **sem olhar código**:

- [ ] Explicar o sistema em 2 minutos para alguém de negócio
- [ ] Listar todas as entidades e o que cada uma **guarda** vs o que **faz**
- [ ] Descrever o fluxo feliz e os 5 principais fluxos de erro
- [ ] Dizer qual classe muda se uma regra mudar — e **só aquela**
- [ ] Desenhar o diagrama de estados de qualquer processo com ciclo de vida

### 1.3 O anti-padrão mais comum

> ❌ "Vou codando e o design aparece."

Isso gera:
- **God classes** — uma classe que sabe de tudo
- **Modelo anêmico** — entidades só com getters/setters; lógica espalhada
- **Dependências circulares** — módulo A precisa de B que precisa de A
- **Regras duplicadas** — a mesma validação em controller, service e repository

### 1.4 O padrão que funciona

> ✅ "Penso o sistema inteiro no papel, depois codifico o esqueleto, depois preencho."

---

## 2. A analogia da cozinha (entenda as camadas)

Imagine um **restaurante**. Cada camada do sistema tem um papel claro:

```
┌─────────────────────────────────────────────────────────────┐
│  GARÇOM (Interface)                                         │
│  Recebe o pedido do cliente, entrega o prato, não cozinha   │
│  → Controllers, APIs, telas, CLI                              │
├─────────────────────────────────────────────────────────────┤
│  CHEF DE SALA (Aplicação)                                   │
│  Organiza os pedidos: "mesa 3 quer entrada + prato + sobremesa"│
│  → Casos de uso, orquestração                               │
├─────────────────────────────────────────────────────────────┤
│  RECEITA E INGREDIENTES (Domínio)                           │
│  As regras da comida: temperatura, tempo, combinações       │
│  → Entidades, regras de negócio, validações                 │
├─────────────────────────────────────────────────────────────┤
│  FORNECEDOR E DESPENSA (Infraestrutura)                     │
│  De onde vêm os ingredientes, onde ficam guardados          │
│  → Banco de dados, filas, APIs externas, arquivos           │
└─────────────────────────────────────────────────────────────┘
```

**Regra de ouro:** o garçom **não entra na cozinha** para cozinhar. O chef **não vai ao mercado** durante o serviço. Cada um tem seu papel.

### 2.1 Três tipos de "coisa" no domínio

Antes de virar classe, classifique cada conceito:

| Pergunta | Se sim... | Exemplo | Tipo |
|----------|-----------|---------|------|
| Tem identidade ao longo do tempo? | ✓ | Pedido #123 | **Entidade** |
| É definido só pelos valores? | ✓ | CPF, R$ 50,00 | **Value Object** |
| É uma operação que o sistema oferece? | ✓ | Finalizar pedido | **Caso de Uso** |
| É detalhe técnico (banco, HTTP)? | ✓ | Salvar no Postgres | **Infraestrutura** |

### 2.2 Entidade vs Value Object vs Agregado

```
Entidade     → tem ID, muda de estado, vive no tempo
Value Object → imutável, comparado por valor (sem ID próprio)
Agregado     → grupo de entidades + VOs com UMA raiz
               → o mundo externo só fala com a RAIZ
```

**Exemplo — E-commerce:**

```
Agregado: Pedido (raiz)
├── PedidoId
├── ClienteId          ← referência (só o ID, não o Cliente inteiro)
├── StatusPedido       ← Value Object ou enum
├── EnderecoEntrega    ← Value Object
└── ItensPedido[]
      └── ItemPedido   ← entidade filha (só acessível via Pedido)
```

**Por que isso importa?** Se qualquer código puder mexer em `ItemPedido` direto, ninguém garante que as regras do `Pedido` sejam respeitadas.

---

## 3. Processo em 7 fases (passo a passo)

Use **sempre nesta ordem**. Cada fase alimenta a próxima.

```
FASE 1 — Enquadramento     "Qual problema estou resolvendo?"
         ↓
FASE 2 — Vocabulário       "Como chamamos cada coisa?"
         ↓
FASE 3 — Casos de uso      "O que o sistema FAZ?"
         ↓
FASE 4 — Estados e regras  "O que NUNCA pode acontecer?"
         ↓
FASE 5 — Classes           "Quem é responsável por quê?"
         ↓
FASE 6 — Fluxos            "Como tudo se conecta na prática?"
         ↓
FASE 7 — Fronteiras        "Erros, integrações, segurança"
```

**Se travou na Fase 5 ou 6:** volte para a Fase 3 ou 4. Geralmente falta clareza nos casos de uso ou nas regras.

### Tempo sugerido por fase (projeto médio)

| Fase | Tempo | Entregável |
|------|-------|------------|
| 1 | 30 min | Ficha do sistema |
| 2 | 1–2 h | Glossário + mapa de entidades |
| 3 | 2–3 h | Lista de UCs + fluxos |
| 4 | 1–2 h | Máquinas de estado + invariantes |
| 5 | 2–3 h | Diagrama de classes + pastas |
| 6 | 1–2 h | Diagramas de sequência |
| 7 | 1 h | Catálogo de erros + integrações |

---

## 4. Princípios de design de classes

### 4.1 Uma classe, um motivo para mudar (SRP)

**Teste rápido:** "Se a regra X mudar, quantas classes eu quebro?"

- Se a resposta for **mais de uma** → provavelmente a responsabilidade está misturada.

### 4.2 Tell, Don't Ask (diga, não pergunte)

**Ruim** — o controller decide tudo:

```java
if (pedido.getStatus() == ABERTO && pedido.getItens().size() > 0) {
    pedido.setStatus(FECHADO);
}
```

**Bom** — a entidade encapsula a regra:

```java
pedido.finalizar();  // internamente valida itens, status, etc.
```

### 4.3 Onde colocar cada tipo de lógica

| Tipo de lógica | Onde colocar | Exemplo |
|----------------|--------------|---------|
| Protege a entidade | **Na entidade** | "Pedido fechado não aceita item" |
| Envolve várias entidades | **Domain Service** | "Transferência entre duas contas" |
| Orquestra passos | **Caso de Uso** | "Importar → validar → persistir" |
| Formato HTTP/JSON | **Controller** | status code, serialização |
| SQL, cache, fila | **Repository (infra)** | `pedidoRepository.save()` |

### 4.4 Sinais de alerta no design

- [ ] Entidade com mais de ~10 métodos públicos
- [ ] Service com 500+ linhas chamado `Manager`, `Helper` ou `Util`
- [ ] DTO, Entity e Domain Model são a mesma classe
- [ ] Controller chama repository direto (pula o caso de uso)
- [ ] Você precisa de diagrama para explicar quem chama quem entre 15 classes

### 4.5 SOLID — versão prática (referência)

| Princípio | Pergunta-teste |
|-----------|----------------|
| **S** — Uma responsabilidade | "Quantas classes quebro se mudar a regra X?" |
| **O** — Aberto para extensão | "E se amanhã tiver um terceiro tipo de pagamento?" |
| **L** — Subtipos honram o contrato | "Quem usa o pai se surpreende com o filho?" |
| **I** — Interfaces pequenas | "Esta interface força métodos inúteis?" |
| **D** — Dependa de abstrações | "O domínio importa algo de banco/HTTP?" |

---

## 5. Fase 1 — Enquadramento do problema

**Objetivo:** saber *exatamente* o que você está construindo — e o que **não** está.

### Template — Ficha do sistema

```markdown
## Nome do sistema
[ex: Sistema de Reserva de Salas]

## Problema em uma frase
[ex: Funcionários não sabem quais salas estão livres sem ir até elas]

## Proposta de valor
1. [benefício mensurável]
2. [benefício mensurável]

## Atores (quem interage)
| Ator | O que quer | Frequência |
|------|------------|------------|
| ... | ... | ... |

## Jornada feliz (passo a passo)
1. ...
2. ...

## O que o sistema NÃO é / NÃO faz
- Não ...
- Não ...

## Restrições hard
| Restrição | Impacto no design |
|-----------|-------------------|
| ... | ... |

## Escopo v1 vs futuro
| v1 (obrigatório) | Futuro (fora do v1) |
|------------------|---------------------|
| ... | ... |
```

### 5 perguntas que destravam o design

1. **Qual é a fonte da verdade?** (banco, arquivo, API externa, usuário)
2. **E se dois usuários fizerem a mesma ação ao mesmo tempo?**
3. **O sistema precisa funcionar offline?**
4. **Dados podem ser apagados ou só marcados como inativos?**
5. **Quem é responsável legalmente pelos dados?** (LGPD, auditoria)

---

## 6. Fase 2 — Vocabulário e entidades do domínio

**Objetivo:** todo mundo (e todo código) usa os **mesmos nomes** para as **mesmas coisas**.

### 6.1 Glossário (Ubiquitous Language)

**Regra:** um termo = um significado. Sem sinônimos no código.

| Termo | Definição precisa | Sinônimos proibidos | Exemplo |
|-------|-------------------|---------------------|---------|
| Reserva | Compromisso de uso de sala em intervalo de tempo | agendamento, booking | "Reserva das 14h às 15h" |
| ... | ... | ... | ... |

### 6.2 Ficha de cada entidade

```markdown
### Entidade: [Nome]

**Identificador:** [UUID / int / composto]
**Ciclo de vida:** nasce quando [...] morre quando [...]

**Atributos (dados que guarda):**
| Atributo | Tipo | Obrigatório? | Regra |
|----------|------|--------------|-------|
| ... | ... | sim/não | ... |

**Comportamentos (o que faz):**
| Método | Pré-condição | Pós-condição | Erros possíveis |
|--------|--------------|--------------|-----------------|
| ... | ... | ... | ... |

**Relacionamentos:**
- 1:N com [...]
- N:1 com [...]
- Referência (só ID) vs composição (objeto filho)

**É raiz de agregado?** sim / não — se não, qual é a raiz?
```

### 6.3 Diagrama de relacionamentos

```
┌──────────┐       1:N        ┌──────────┐
│ Usuario  │─────────────────▶│ Reserva  │
└──────────┘                  └────┬─────┘
                                   │ N:1
                                   ▼
                              ┌──────────┐
                              │   Sala   │
                              └──────────┘
```

### 6.4 Classificação rápida

| Conceito | Entidade | Value Object | Enum | Agregado (raiz) |
|----------|----------|--------------|------|-----------------|
| ... | ☐ | ☐ | ☐ | ☐ |

---

## 7. Fase 3 — Comportamentos e casos de uso

**Objetivo:** listar **tudo que o sistema faz** — com entrada, saída e exceções.

### 7.1 Lista de casos de uso

| ID | Nome | Ator | Prioridade v1 |
|----|------|------|---------------|
| UC-01 | Criar reserva | Funcionário | Alta |
| UC-02 | Cancelar reserva | Funcionário | Alta |
| ... | ... | ... | ... |

### 7.2 Template de caso de uso (detalhado)

```markdown
## UC-XX: [Nome]

**Ator principal:** ...
**Pré-condições:** ...
**Pós-condições (sucesso):** ...

### Fluxo principal
1. Ator solicita ...
2. Sistema valida ...
3. Sistema ...
4. Sistema retorna ...

### Fluxos alternativos
**3a.** Se [condição]:
  3a.1. Sistema ...
  3a.2. Retorna ao passo 4

### Fluxos de exceção
**2a.** Se [validação falha]:
  2a.1. Sistema retorna erro [código/mensagem]
  2a.2. Caso de uso termina em falha

### Dados de entrada
| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| ... | ... | ... | ... |

### Dados de saída
| Campo | Tipo | Quando |
|-------|------|--------|
| ... | ... | ... |

### Classes envolvidas (rascunho)
- Caso de uso: `CriarReservaUseCase`
- Entidades: `Reserva`, `Sala`
- Repositórios: `ReservaRepository`, `SalaRepository`
- Serviços de domínio: `DisponibilidadeService` (se necessário)
```

### 7.3 Matriz caso de uso × entidade

Marque **C** = cria, **R** = lê, **U** = atualiza, **D** = deleta

|  | Usuario | Reserva | Sala |
|--|---------|---------|------|
| UC-01 Criar reserva | R | C | R |
| UC-02 Cancelar | R | U | R |

**O que essa matriz revela:**
- Entidades órfãs (ninguém usa)
- Casos de uso que fazem demais (muitos CUD numa linha)

---

## 8. Fase 4 — Estados, eventos e regras

**Objetivo:** definir o que **nunca pode quebrar** — especialmente em entidades com ciclo de vida.

### 8.1 Máquina de estados

**Entidade: Reserva**

```
                    criar()
         ┌──────────────────────────────┐
         │                              │
         ▼                              │
    ┌─────────┐   confirmar()   ┌──────────────┐
    │ PENDENTE│────────────────▶│  CONFIRMADA  │
    └────┬────┘                 └──────┬───────┘
         │                             │
         │ expirar()                   │ cancelar()
         ▼                             ▼
    ┌─────────┐                   ┌───────────┐
    │ EXPIRADA│                   │ CANCELADA │
    └─────────┘                   └───────────┘
```

Para cada transição:

| De | Para | Evento/Ação | Quem pode | Regra extra |
|----|------|-------------|-----------|-------------|
| — | PENDENTE | criar | Funcionário | sala livre no horário |
| PENDENTE | CONFIRMADA | confirmar | Sistema/Admin | dentro de 15 min |
| ... | ... | ... | ... | ... |

### 8.2 Invariantes (regras que NUNCA podem ser violadas)

| ID | Invariante | Onde é garantida |
|----|------------|------------------|
| INV-01 | Duas reservas CONFIRMADAS não podem sobrepor o mesmo horário | `Reserva.confirmar()` + `DisponibilidadeService` |
| INV-02 | Reserva CANCELADA não volta a CONFIRMADA | máquina de estados em `Reserva` |

### 8.3 Políticas vs mecanismos

| Política (o quê) | Mecanismo (como) |
|------------------|------------------|
| "Reserva expira em 15 min se não confirmada" | Job agendado ou timeout |
| "Notificar usuário ao confirmar" | Evento `ReservaConfirmada` → handler de email |

### 8.4 Eventos de domínio

| Evento | Disparado quando | Consumidores |
|--------|------------------|--------------|
| ReservaCriada | após UC-01 sucesso | auditoria, notificação |
| ReservaCancelada | após UC-02 | liberar sala, email |

**Regra:** eventos nomeiam **fatos passados**: `PedidoFinalizado`, não `FinalizarPedido`.

---

## 9. Fase 5 — Estrutura de classes e camadas

**Objetivo:** transformar tudo que você mapeou em **classes concretas** com responsabilidades claras.

### 9.1 Camadas (dependência aponta para o centro)

```
┌────────────────────────────────────────────────────────────┐
│ presentation / interface                                   │
│   Controllers, Views, DTOs de API                          │
├────────────────────────────────────────────────────────────┤
│ application                                                │
│   Use Cases, Commands/Queries                              │
├────────────────────────────────────────────────────────────┤
│ domain                                                     │
│   Entities, Value Objects, Domain Services, Domain Events  │
│   Repository INTERFACES (portas)                           │
├────────────────────────────────────────────────────────────┤
│ infrastructure                                             │
│   Repository IMPLEMENTATIONS, ORM, HTTP clients, filas     │
└────────────────────────────────────────────────────────────┘
```

### 9.2 Diagrama de classes (domínio)

```
┌─────────────────────┐
│      Reserva        │
├─────────────────────┤
│ - id: ReservaId     │
│ - salaId: SalaId    │
│ - intervalo: Periodo│  ◀── Value Object
│ - status: Status    │
├─────────────────────┤
│ + criar(...)        │
│ + confirmar()       │
│ + cancelar(motivo)  │
└─────────────────────┘
          │ usa
          ▼
┌─────────────────────┐         ┌──────────────────────────┐
│      Periodo        │         │  DisponibilidadeService  │
├─────────────────────┤         ├──────────────────────────┤
│ - inicio: DateTime  │         │ + salaLivre(sala, periodo)│
│ - fim: DateTime     │         └──────────────────────────┘
├─────────────────────┤
│ + sobrepoe(outro)   │
└─────────────────────┘

┌─────────────────────┐
│ ReservaRepository   │  ◀── interface no domínio
├─────────────────────┤
│ + save(reserva)     │
│ + findBySalaEPeriodo│
└─────────────────────┘
          △
          │ implementa (infra)
┌─────────────────────┐
│ ReservaRepositoryImpl│
└─────────────────────┘
```

### 9.3 Mapa de pastas (antes de criar arquivos)

```
src/
├── domain/
│   ├── model/
│   │   ├── Reserva.java
│   │   ├── Sala.java
│   │   └── vo/
│   │       ├── Periodo.java
│   │       └── ReservaId.java
│   ├── service/
│   │   └── DisponibilidadeService.java
│   ├── event/
│   │   └── ReservaConfirmada.java
│   └── repository/
│       └── ReservaRepository.java   # interface
├── application/
│   └── usecase/
│       ├── CriarReservaUseCase.java
│       └── CancelarReservaUseCase.java
├── infrastructure/
│   └── persistence/
│       └── ReservaRepositoryImpl.java
└── presentation/
    └── api/
        └── ReservaController.java
```

### 9.4 Ficha técnica de cada classe

```markdown
### Classe: CriarReservaUseCase

**Camada:** application
**Responsabilidade única:** orquestrar a criação de uma reserva

**Dependências:**
- ReservaRepository
- SalaRepository
- DisponibilidadeService

**Método público:**
- `execute(CriarReservaCommand): CriarReservaResult`

**Não faz:**
- SQL direto
- serialização JSON
- regra de sobreposição (delega ao domain service)

**Testes obrigatórios:**
- happy path
- sala inexistente
- horário ocupado
- período inválido (fim < início)
```

### 9.5 Tabela de responsabilidades

| Responsabilidade | Classe dona | Outras NÃO devem |
|------------------|-------------|------------------|
| Validar sobreposição | DisponibilidadeService | Controller, Repository |
| Persistir reserva | ReservaRepository | Use Case (só chama) |
| Mapear HTTP → Command | ReservaController | Use Case |
| Mudar status | Reserva.confirmar() | Use Case com setStatus |

---

## 10. Fase 6 — Fluxos de dados e sequência

**Objetivo:** ver o sistema **em movimento** — quem chama quem, em que ordem.

### 10.1 Diagrama de sequência (fluxo feliz)

```
Ator     Controller    CriarReservaUC    Disp.Service    ReservaRepo    SalaRepo
  │            │              │                │              │            │
  │─ POST ────▶│              │                │              │            │
  │            │─ execute ───▶│                │              │            │
  │            │              │─ findSala ────────────────────────────────▶│
  │            │              │◀─ sala ───────────────────────────────────│
  │            │              │─ salaLivre ──▶│              │            │
  │            │              │◀─ true ───────│              │            │
  │            │              │─ Reserva.criar() (domínio)    │            │
  │            │              │─ save ────────────────────────▶│            │
  │            │              │◀─ ok ─────────────────────────│            │
  │            │◀─ result ────│                │              │            │
  │◀─ 201 ─────│              │                │              │            │
```

**Desenhe também um fluxo de erro** para cada UC prioritário.

### 10.2 Fluxo de dados

```
HTTP JSON                Command              Domínio              Persistência
─────────               ───────              ───────              ────────────
{ salaId,      →   CriarReservaCommand  →  Reserva (entidade) →  tabela reservas
  inicio,                                               │
  fim }                                                 ▼
                                                   ReservaCriada (evento)
```

### 10.3 Síncrono vs assíncrono

| Operação | Tipo | Motivo |
|----------|------|--------|
| Validar e salvar reserva | Síncrono | usuário precisa da resposta |
| Enviar email confirmação | Assíncrono | não bloqueia UX |
| Relatório mensal | Assíncrono (job) | pesado, sem pressa |

---

## 11. Fase 7 — Fronteiras, erros e integrações

**Objetivo:** fechar o que acontece **fora do caminho feliz** e **fora do seu código**.

### 11.1 Catálogo de erros

| Código | Tipo | HTTP | Mensagem usuário | Classe exceção |
|--------|------|------|------------------|----------------|
| RESERVA_001 | negócio | 409 | Horário indisponível | HorarioIndisponivelException |
| RESERVA_002 | validação | 400 | Fim deve ser após início | PeriodoInvalidoException |

**Regra:** erros de **negócio** ≠ erros de **infraestrutura** (timeout, disco cheio).

### 11.2 Integrações externas

| Sistema externo | Porta (interface) | Adapter (impl) | Falha | Fallback |
|-----------------|-------------------|----------------|-------|----------|
| SMTP | EmailSender | SmtpEmailSender | timeout | retry 3x, depois fila morta |
| API Calendário | CalendarioGateway | GoogleCalendarAdapter | 401 | log + alerta |

### 11.3 Segurança

- [ ] Quem pode executar cada UC? (RBAC)
- [ ] Dados sensíveis em repouso e em trânsito
- [ ] Auditoria: o que logar (sem senha/token)
- [ ] Idempotência em operações críticas

---

## 12. Templates prontos para copiar

### 12.1 Documento mestre (`DESIGN.md`)

```markdown
# [Nome do Sistema] — Design Blueprint

## 1. Enquadramento
[cole seção 5]

## 2. Glossário
[cole seção 6.1]

## 3. Entidades
[cole seção 6.2 para cada entidade]

## 4. Casos de uso
[cole seção 7]

## 5. Estados e invariantes
[cole seção 8]

## 6. Diagrama de classes
[cole seção 9]

## 7. Sequências
[cole seção 10]

## 8. Erros e integrações
[cole seção 11]

## 9. Decisões de arquitetura
| # | Decisão | Alternativas | Motivo |
|---|---------|--------------|--------|
| 001 | Clean Architecture | MVC simples | testabilidade do domínio |
```

### 12.2 Ficha de classe (uma por classe)

```markdown
# Classe: [Nome]

- **Camada:**
- **Responsabilidade (1 frase):**
- **Depende de:**
- **Usada por:**
- **Métodos públicos:**
- **Invariantes que protege:**
- **Não deve:**
- **Cenários de teste:**
```

### 12.3 ADR (decisão de arquitetura)

```markdown
# ADR-003: Usar eventos de domínio para notificações

## Status: Aceito

## Contexto
Notificações por email não podem bloquear criação de reserva.

## Decisão
Publicar `ReservaConfirmada` após commit; handler assíncrono envia email.

## Consequências
+ Desacoplamento
- Infraestrutura de eventos necessária
```

---

## 13. Checklist de prontidão para codar

Marque antes de abrir o IDE. **Mínimo: 80%**.

### Enquadramento
- [ ] Problema e escopo v1 definidos
- [ ] Lista "o que NÃO é" escrita
- [ ] Atores e jornada feliz documentados

### Domínio
- [ ] Glossário com ≥ 5 termos sem ambiguidade
- [ ] Todas entidades têm ID e ciclo de vida
- [ ] Agregados têm raiz identificada
- [ ] Value Objects imutáveis listados

### Comportamento
- [ ] Casos de uso v1 numerados e priorizados
- [ ] Cada UC v1 tem fluxo principal + ≥ 1 exceção
- [ ] Matriz UC × entidade preenchida

### Regras
- [ ] Máquinas de estado desenhadas (onde aplicável)
- [ ] Invariantes listadas com "onde são garantidas"
- [ ] Eventos de domínio nomeados (se houver efeitos colaterais)

### Estrutura
- [ ] Camadas/pacotes definidos
- [ ] Diagrama de classes do domínio revisado
- [ ] Cada classe tem ficha com responsabilidade única
- [ ] Nenhuma dependência do domínio apontando para infra

### Fluxos
- [ ] Sequência do UC principal desenhada
- [ ] Sync vs async decidido por operação

### Fronteiras
- [ ] Catálogo de erros iniciado
- [ ] Integrações com portas/adapters mapeadas
- [ ] Permissões por UC definidas

### Qualidade final
- [ ] Alguém de fora entendeu o doc em 10 min
- [ ] Você consegue estimar tarefas por módulo

---

## 14. Exemplo completo (mini-sistema)

**Sistema:** Biblioteca pessoal de livros.

### Enquadramento

- **Problema:** perder track do que li, nota e status
- **v1:** cadastrar livro, marcar como lendo/lido, avaliar 1–5
- **Não é:** rede social, recomendação por IA

### Entidades

| Conceito | Tipo | ID |
|----------|------|-----|
| Livro | Agregado raiz | LivroId |
| Titulo | VO | — |
| ISBN | VO | — |
| Avaliacao | VO | — |
| StatusLeitura | Enum | QUERO_LER, LENDO, LIDO, ABANDONADO |

### Casos de uso v1

| ID | Nome |
|----|------|
| UC-01 | CadastrarLivro |
| UC-02 | IniciarLeitura |
| UC-03 | FinalizarLeitura |
| UC-04 | AvaliarLivro |

### Invariante chave

- `AvaliarLivro` só se `status == LIDO`

### Classes

```
domain/
  Livro
    + cadastrar(titulo, isbn)
    + iniciarLeitura()
    + finalizarLeitura()
    + avaliar(Avaliacao)
  LivroRepository (interface)

application/
  CadastrarLivroUseCase
  IniciarLeituraUseCase
  FinalizarLeituraUseCase
  AvaliarLivroUseCase
```

### Sequência — AvaliarLivro

```
1. Buscar Livro por id → não existe? erro LIVRO_404
2. livro.avaliar(nota) → status != LIDO? erro LIVRO_003
3. repository.save(livro)
4. retornar DTO
```

**Regra prática:** se o v1 passa de ~40 classes, **corte escopo**.

---

## 15. Erros comuns e como evitar

| Erro | Sintoma | Correção |
|------|---------|----------|
| Modelar o banco primeiro | Tabelas viram entidades anêmicas | Modele o domínio; schema é consequência |
| Um UC gigante | `ProcessarImportacaoUseCase` com 20 passos | Quebre em steps + domain services |
| DTO no domínio | `LivroDTO` em regra de negócio | DTO só na borda |
| Enum espalhado | `if (status == 3)` em 10 lugares | Enum tipado + métodos na entidade |
| Abstração prematura | Interface para tudo no dia 1 | Interface quando há ≥ 2 implementações reais |
| Esquecer concorrência | Duas reservas no mesmo slot | Unique constraint + regra no domínio |
| Comando = consulta | Mesmo model para criar e listar | CQRS leve: Commands mudam; Queries leem |

### Pode codar quando...

- Você discute com o **documento**, não com o código
- Mudanças de regra têm endereço claro ("mudo `Reserva.confirmar()`")
- O time concorda no glossário

### Ainda NÃO codar quando...

- "Depende, vamos ver na implementação"
- Duas pessoas usam o mesmo termo com significados diferentes
- Ninguém sabe qual é a fonte da verdade dos dados

---

## 16. Plano de treino (7 dias)

| Dia | O que fazer | Tempo |
|-----|-------------|-------|
| **1** | Pegue um app que você usa → preencha Fase 1 (enquadramento) | 30 min |
| **2** | Extraia glossário + 5 entidades (Fase 2) | 1 h |
| **3** | Liste 8 casos de uso com exceções (Fase 3) | 1–2 h |
| **4** | Desenhe 2 máquinas de estado (Fase 4) | 1 h |
| **5** | Diagrama de classes + pastas (Fase 5) | 2 h |
| **6** | 3 diagramas de sequência (Fase 6) | 1–2 h |
| **7** | Checklist seção 13 — revise com olhar crítico | 30 min |

### Depois do blueprint

1. **Vertical slice:** implemente **um** UC ponta a ponta (API → UC → domínio → repo)
2. **Teste o domínio primeiro** — entidades e regras sem banco
3. **Expanda** para os outros UCs reutilizando o mesmo esqueleto

---

## 17. Referências e próximos passos

### Leitura (ordem sugerida)

1. **Domain-Driven Design** (Eric Evans) — capítulos sobre Ubiquitous Language, Aggregates
2. **Implementing Domain-Driven Design** (Vaughn Vernon) — agregados na prática
3. **Clean Architecture** (Robert C. Martin) — dependências e camadas
4. **Patterns of Enterprise Application Architecture** (Fowler) — Repository, Domain Model

### Perguntas de revisão (teste a si mesmo)

Responda **sem consultar** o documento:

1. Qual é a raiz do agregado X e por quê?
2. O que acontece se o usuário cancelar no meio do fluxo Y?
3. Qual classe você altera se a regra Z mudar?
4. Quais UCs são idempotentes?
5. Onde está a fronteira entre domínio e aplicação?

Se as respostas fluem, seu design está sólido o suficiente para codar.

### Estilos arquiteturais (quando evoluir)

| Estilo | Quando usar |
|--------|-------------|
| **Camadas clássicas** | CRUD simples, prazo curto |
| **Clean / Hexagonal** | Regras de negócio ricas |
| **CQRS leve** | Leituras complexas ≠ escritas |
| **Event-driven** | Muitos efeitos colaterais desacoplados |

**Para começar:** use **Clean + DDD tático** (entidades, VOs, agregados, casos de uso). Evolua quando a complexidade pedir.

---

## Cartão de referência rápida (imprima ou fixe)

```
┌─────────────────────────────────────────────────────────┐
│  ANTES DE CODAR                                         │
├─────────────────────────────────────────────────────────┤
│  1. Problema + escopo v1 + o que NÃO é                  │
│  2. Glossário (1 termo = 1 significado)                 │
│  3. Entidades: o que guardam + o que fazem              │
│  4. Casos de uso: fluxo feliz + exceções                │
│  5. Estados + invariantes (o que nunca quebra)            │
│  6. Classes: camada + responsabilidade + dependências   │
│  7. Sequência: quem chama quem                          │
│  8. Erros + integrações + segurança                     │
├─────────────────────────────────────────────────────────┤
│  PERGUNTA DE OURO: "Se a regra X mudar, qual classe     │
│  eu altero?" — deve ter UMA resposta clara.             │
└─────────────────────────────────────────────────────────┘
```

---

*Metodologia reutilizável. Para um exemplo em domínio financeiro, veja `trigger/17/estrutura-logica-app-b3-proventos.md`.*
