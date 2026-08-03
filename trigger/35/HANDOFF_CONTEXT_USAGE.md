# HANDOFF — ERP RLP (trigger/35)

**Para o próximo agente:** leia este arquivo primeiro. Não reabra modelagem em `trigger/32`. Não escreva mais TXT de domínio. Código + homologação / Fase 2 Should.

| | |
|--|--|
| **Raiz do código** | `/home/dfmoura/Documents/test_several1/trigger/35` |
| **Domínio (somente leitura)** | `/home/dfmoura/Documents/test_several1/trigger/32` |
| **ADR caminho** | `trigger/32/DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` (CAMINHO-A) |
| **Decisão de negócio** | Seguir sem pré-acordo com contador; params com `PENDENTE_RATIFICACAO`; validar na homologação |
| **Stack** | TS/Node 22 · Fastify · Prisma · PostgreSQL 16 · React+Vite · Docker Compose · MinIO |
| **Health atual** | `fase: "2-m07"` — Fase 2 Should em andamento (M07 Compras) |
| **Fase 2 outline** | [`FASE2_SHOULD_OUTLINE.md`](./FASE2_SHOULD_OUTLINE.md) |

---

## 1. O que já funciona (Fase 1 Must)

### Fase 0 — M11 Plataforma
- Login JWT individual, sessão com `jti`, lockout por falhas
- RBAC (ADMIN, FISCAL, FINANCEIRO, COMERCIAL, PRODUCAO, COMPRAS, EXPEDICAO, CONSULTA)
- Multi-empresa `EMP-00001` (venda on) / `EMP-00002` (venda off)
- Auditoria quem/quando/de→para; parâmetros com status de ratificação
- Decimal (`decimal.js`) — sem float em dinheiro/qtde
- `outbox_event` (grava; **sem** publisher/worker)
- Docker Compose: postgres, api, web, minio

### Fase 1 — M01 Cadastros
- Parceiro (PAR-), papéis, prospect, fiscal completo/incompleto
- Produtos MP/EMB/REV/PA/SVC, unidades, FAC
- UI: `/parceiros`, `/produtos`, `/unidades-facas`

### Fase 1 — M02 Comercial
- ORC → cenários/escada → alçada gordura/desconto → imposto estimado → link aceite → PED snapshot
- FAC jaCobrado (1×); prospect incompleto não gera PED
- Crédito `LIBERADO` ou adiantamento (`AGUARDA_ADIANTAMENTO` → TIT SINAL → BX → LIBERADO)
- UI: `/orcamentos`, `/pedidos`

### Fase 1 — M03 Produção
- OP/OS a partir de PED liberado; apontamento; consumo MP; retorno PA; conclusão
- UI: `/producao`

### Fase 1 — M04 Estoque
- MOV imutável + saldo materializado + custo médio
- Separação REVENDA; consumo OP; sobra/retalho (`SOBRA_RETALHO`)
- Inventário formal INV- com SoD (aprovador ≠ criador)
- UI: `/estoque`

### Fase 1 — M05 Fiscal
- Focus stub|http; NFE ≠ NFS-e; idempotência; faturamento parcial
- Cancelar NF + CC-e + artefatos (refs/manifesto)
- UI: `/documentos-fiscais`

### Fase 1 — M06 Financeiro + Entrega
- TIT (NF + SINAL); naturezas 1–5; BX manual; COB stub; aging
- BaixaAmbigua + webhook bank; ENT romaneio → PED ENTREGUE
- UI: `/titulos`

### Fase 1 — M09 Integrações
- Focus / Bank / WhatsApp ports; kill-switches; webhooks Focus+Bank idempotentes
- WA stub; outbound MFA outbox sem worker

### Fase 1 — M10 Gerencial (Must)
- Export contador ZIP CSV `RLP-CONTADOR-v1` — UI `/export-contador`

### Fase 2 — M07 Compras (Should — F2-1)
- COT / propostas / OC com alçada (`compras_alcada_valor_max`)
- Entrada XML NF-e → MOV `ENTRADA_COMPRA` + custo médio (cria SKU MP se ausente)
- OP `AGUARDANDO_MATERIAL` + liberação automática na entrada
- UI: `/compras`

### Seed DEV
| User | Senha | Perfil |
|------|-------|--------|
| `admin@rlp.local` | `Admin@RLP2026!` | ADMIN |
| `operador@rlp.local` | `Operador@RLP2026!` | COMERCIAL |

Referências: `PAR-00011` · `PA-ETQ-001` · `MP-00001` · `REV-00001` · `SVC-00001` · fornecedores Colacril/Avery/Fedrigoni/Camallon

### Smoke Gate G1 (amostra)
- Health passou por `1-must-complete` · agora `2-m07`
- Export meta + bank/focus webhooks idempotentes

---

## 2. O que falta (pós M07 — Fase 2 restante)

Ver [`FASE2_SHOULD_OUTLINE.md`](./FASE2_SHOULD_OUTLINE.md). Resumo:

| # | Escopo | Notas |
|---|--------|-------|
| 1 | ~~M07 Compras~~ | **Feito (F2-1)** |
| 2 | M08 RMA/DEV | próximo |
| 3 | M09 real | WA Meta HTTP + Bank sandbox |
| 4 | M06 polish | CNAB; régua WA; comissão; frete |
| 5 | M03/M10 Should | Amostra/CQ; DRE/BEM/RH; import folha |

### Lacunas conscientes (aceitáveis no Must)
- Outbox sem worker/SQS
- XML/PDF NF = `stub://` sem Focus token
- WA Meta HTTP não implementado
- Params `PENDENTE_RATIFICACAO`
- EMP-00002 venda off; LAI/SPED/eSocial fora

### Fora de escopo (não reabrir)
- Microsserviços, GraphQL, LAI no ERP, SPED completo no ERP

---

## 3. Arquivos tocados (mapa)

```
trigger/35/
  HANDOFF_CONTEXT_USAGE.md · FASE2_SHOULD_OUTLINE.md · README.md
  apps/api/
    prisma/schema.prisma · prisma/seed.ts
    prisma/migrations/… + 20260803220000_fase1_waves_2_6/
      + 20260803230000_fase2_m07_compras/
    src/modules/
      … · gerencial/ · integracoes/ · compras/   # M07
  apps/web/src/pages/… + compras/ComprasPage.tsx
```

---

## 4. Como testar

```bash
cd /home/dfmoura/Documents/test_several1/trigger/35
cp -n .env.example .env
docker compose up --build -d
curl -sf http://localhost:3035/api/v1/health   # "2-m07"
```

| Serviço | URL |
|---------|-----|
| Web | http://localhost:5175 |
| API | http://localhost:3035/api/v1/health |
| OpenAPI | http://localhost:3035/documentation |
| Postgres | `localhost:55432` |
| MinIO | http://localhost:9100 |

### Fluxo feliz UI
1. Login `admin@rlp.local` / `Admin@RLP2026!`
2. ORC → aceite → PED → crédito (ou adiantamento)
3. Estoque / OP / produção → NF → TIT/COB/BX → ENT
4. `/export-contador` baixar ZIP do mês
5. `/compras` — OC direta + colar XML NF compra (Camallon) → MOV

---

## 5. Próximo passo único

**F2-2 M08 Pós-venda (RMA → DEV ponta a ponta)** — ver `FASE2_SHOULD_OUTLINE.md`.
Não reabrir modelagem; não implementar LAI.

---

## 6. Uso de contexto

1. Este `HANDOFF_CONTEXT_USAGE.md`
2. `FASE2_SHOULD_OUTLINE.md` + UC do módulo alvo em `trigger/32`
3. `apps/api/src/modules/` do módulo alvo

Não carregar `MANUAL_UNICO` nem todos os TXTs a cada turno.
