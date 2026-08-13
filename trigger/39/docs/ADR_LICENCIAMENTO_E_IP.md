# ADR-039-IP-001 — Proteção total TRIGGER (PI, ideias expressas, know-how)

**Status:** Aceito  
**Data:** 2026-08-11  
**Contexto:** repositórios públicos do ecossistema TRIGGER · qualquer produto · qualquer licenciado  
**Norma de produto (UI):** [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md)  
**Instrumento vinculante:** [`../LICENSE`](../LICENSE) (`LicenseRef-TRIGGER-Proprietary` — reserva máxima)

---

## Objetivo

**Proteção total da TRIGGER e de todo o conjunto intelectual do ecossistema** — não só “o PHP/React”, mas a obra completa: domínio, ADRs, motores, prompts, UX, metodologia, marca e know-how organizado.

Público no GitHub ≠ open source ≠ autorização para clonar o negócio.

---

## Decisão (regime)

| Escolha | Valor |
|---------|--------|
| **Regime** | Proprietário / source-available — **reserva máxima de direitos** |
| **Objeto** | **Materiais TRIGGER** (código + docs + schemas + ADRs + prompts + arquitetura + UX + marca + metodologias expressas + obras derivadas) |
| **Titular** | TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA |
| **Terceiros sem contrato** | Só §3: estudo / lab não comercial / citação com atribuição |
| **Uso comercial / clone / SaaS / white-label não autorizado / IA comercial sobre os materiais** | **Vedado** |
| **Licenciados** | Só por **contrato escrito** próprio (genérico — todos os clientes) |
| **MIT / Apache / GPL / CC** | **Proibidos** como licença dos Materiais TRIGGER |

---

## O que “proteção total” cobre na prática

| Ativo | Proteção principal |
|-------|-------------------|
| Código, scripts, IaC, containers | Direito autoral / software (9.610 + 9.609) |
| Docs, ADRs, backlogs, manuais, prompts | Direito autoral (expressão escrita) |
| Schemas, invariantes, modelos de domínio expressos | Direito autoral + compilação / organização |
| Motores (ORC, compiler de relatório, validators…) | Expressão do algoritmo + concorrência desleal se houver imitação servil |
| UX, fluxos, identidade visual TRIGGER | Autoral + marca / trade dress |
| Marca TRIGGER / “Powered by TRIGGER” | Marca + contrato + UI obrigatória |
| Segredos (`.env`, chaves, dados de cliente, roadmap interno) | Segredo de negócio + nunca no Git |
| Know-how organizado (método + checklist + regras de domínio como obra) | Expressão + desleal + contrato |
| Clone “clean-room” feito após estudar estes Materiais para substituir o produto | Vedado pelo `LICENSE` (§0 Obra Derivada + §4); remédios de desleal |

### Ideias — leitura correta (especialista)

Direito autoral **não** dá monopólio tipo patente sobre “ideia abstrata” (ex.: “ter um ERP de etiquetas”).

A TRIGGER **protege de ponta a ponta**:

1. a **expressão concreta** (código, textos, schemas, prompts, UX);
2. a **organização distintiva** do domínio e das regras;
3. **marcas** e apresentação;
4. **segredos** que não forem públicos;
5. **concorrência desleal** contra carona parasitária / imitação servil do produto expresso;
6. **contrato** com cada licenciado e NDA quando houver material ainda confidencial.

Estudar (§3) ≠ licença para montar clone comercial.

---

## Por que não MIT

MIT = autorização ampla de uso comercial. É o oposto de proteção total.

| | MIT | LICENSE TRIGGER |
|--|-----|-----------------|
| Uso comercial | Sim | Não (sem contrato) |
| Reimplementar produto a partir do repo | Na prática liberado | Vedado (§4) |
| Treinar IA para clone comercial | Tipicamente permitido | Vedado |
| Marcas / desleal | Quase nada | Explícito |
| Escopo | Só “software” estreito | Materiais TRIGGER (âmbitos totais) |

---

## Camadas (defesa em profundidade)

| # | Camada | Onde |
|---|--------|------|
| 1 | `LICENSE` reserva máxima | Raiz de cada repo público |
| 2 | Contrato comercial por licenciado | Fora do Git |
| 3 | Marca + atribuição permanente na UI/PDF | Identidade TRIGGER |
| 4 | Segredos fora do Git | `.gitignore`, vault, env no host |
| 5 | Licenças upstream só das deps | Laravel/React/etc. — não “abrem” a TRIGGER |
| 6 | Remédios | Tutela inibitória, danos, DMCA / takedown GitHub |

Licença no Git **prova reserva de direitos** e remove a desculpa “achei que era MIT”. Não substitui INPI, contrato bem redigido nem ação judicial.

Este ADR **não** é aconselhamento jurídico personalizado para litígio — para M&A / disputa, revisar com advogado de PI.

---

## Consequências

**Agora**

1. `LICENSE` bilíngue com objeto ampliado (Materiais TRIGGER) e proibições estritas (clone, IA comercial, blueprint para terceiros, desleal).
2. README declara regime não-OSS e proteção do conjunto intelectual.
3. Agentes **não** sugerem MIT nem amarram a licença a um cliente.
4. White-label troca marca do licenciado — **não** enfraquece a PI da TRIGGER.

**Futuro permitido**

- Espelhar o mesmo `LICENSE` em **todos** os repos públicos TRIGGER.
- `THIRD_PARTY_NOTICES` se compliance pedir.
- NDA + cláusulas de PI espelhadas em todo contrato comercial.

**Proibido**

1. MIT/Apache/GPL/CC nos Materiais TRIGGER.
2. Achar que “ideia solta” ou “reescrevi com outras palavras” libera clone comercial.
3. Remover atribuição TRIGGER.
4. Commitar segredos / dados de cliente.
5. Liberação comercial verbal.
6. Texto de LICENSE amarrado a um único cliente.

---

## Checklist

- [x] `LICENSE` reserva máxima (objeto total)  
- [x] README § Licença  
- [x] Este ADR  
- [ ] Mesmo `LICENSE` nos demais repos públicos do titular  
- [ ] Contratos de **cada** licenciado com cláusula de PI alinhada  
- [ ] Marcas / `triggerti.com` como ativos separados  

---

## Rastreio

| Artefato | Papel |
|----------|--------|
| [`LICENSE`](../LICENSE) | Reserva total + proibições |
| [`README.md`](../README.md) § Licença | Aviso humano |
| [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md) | Marca na UI |
| Este ADR | Norma e leitura de “ideias” |
