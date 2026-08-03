# Arquitetura v2 — Reta Etiquetas ERP

Reconstrução limpa a partir do protótipo em `trigger/27`. Princípios:

1. **Bounded contexts** explícitos (comercial, PCP, suprimentos, estoque, fiscal, financeiro)
2. **Adaptadores** isolados para hubs externos (Focus NFe, Banco Inter)
3. **Snapshots** em pedido/NF/título — imutabilidade comercial
4. **Homologação = produção** na UI; side-effects externos só com credenciais + `simular=false`
5. **Faturamento dual** como regra de domínio, não como if espalhado na UI

## Camadas

```
UI (App Router)
  → API routes (validação + auth)
    → services / lib (orquestração transacional)
      → domain/* (puro: ciclo, split dual, status)
      → packages/pricing-engine (cálculo)
      → packages/focus-nfe | banco-inter (I/O externo ou simulado)
      → Prisma / PostgreSQL
```

## Faturamento dual (domínio)

`domain/faturamento/split-dual.ts` classifica custos:

| Mercadoria (NF-e) | Serviço (NFS-e) |
|---|---|
| papel, acabamento, tubete, caixa | máquina, trocas, tinta, rebobinação (+ matriz) |

O valor comercial da faixa é rateado nessa proporção. O pedido nasce com **dois itens** (`documentoSaidaPadrao` NFE + NFSE). O faturamento emite ambos e um Bolepix Intr sobre o total.

## Hubs

| Hub | Pacote | Uso em homologação |
|---|---|---|
| [Focus NFe](https://doc.focusnfe.com.br/reference/introducao) | `@reta/focus-nfe` | XML/PDF locais espelhando `modelos/` |
| [Inter Bolepix](https://developers.inter.co/references/cobranca-bolepix) | `@reta/banco-inter` | linha digitável + Pix copia-e-cola simulados |
| [Inter Extrato](https://developers.inter.co/references/banking#tag/Extrato) | `@reta/banco-inter` | conciliação bancária (importação idempotente) |
| [Inter Saldo](https://developers.inter.co/references/banking#tag/Saldo) | `@reta/banco-inter` | snapshot de saldo na ContaBancaria |

## Financeiro (tesouraria)

Módulo `/financeiro` — bounded context próprio, vinculado ao ciclo:

| Peça | Origem |
|---|---|
| Contas a receber + Bolepix | Faturamento do pedido |
| Contas a pagar | Lançamento de estoque (NF entrada) |
| Saldo / Extrato / Conciliação | APIs Banking Inter |
| Fluxo de caixa 30d | Projeção AR − AP sobre saldo |

Domínio puro: `domain/financeiro/{aging,cashflow}.ts` · orquestração: `lib/financeiro.ts`

## Identidade visual

Logo oficial → `apps/web/public/brand/logotipo-retaetiquetas.png`

| Token | Hex |
|---|---|
| Vermelho marca | `#E31E24` |
| Azul marca | `#2E3192` |

Tema claro, tipografia Libre Baskerville (display) + DM Sans (corpo), barra inferior vermelha no header.

## O que foi aproveitado de v1

- Motor `pricing-engine` + golden tests + catalogs XLSM
- Schema Prisma do ciclo operacional
- Parsers/builders XML NF-e / NFS-e alinhados aos modelos
- Fluxo compras → estoque → pedido → produção
- Auth JWT + papéis + Empresa/Parceiro/Produto

## O que mudou vs “puxadinhos”

- Split dual no domínio (não só label na UI)
- Pacotes de integração com contrato claro + `simular`
- Ciclo canônico em `domain/ciclo/etapas.ts` (home/menu/jornada leem da mesma fonte)
- Identidade Reta (antes tema verde genérico)
- Portas isoladas (**3849** / **5435**) para coexistir com protótipos 27/28
