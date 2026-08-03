# Migração AWS — Homologação → Produção

Guia enxuto alinhado ao estudo `trigger/32` (`ESTIMATIVA_CUSTO_AWS_MENSAL.txt` +
`SEGURANCA_NUVEM_AWS_OPERACAO_SEGURA.txt`). Volume: ≤10 usuários · ≈200 NF/mês · região **sa-east-1**.

## Fases

```
[Local HML :3849] → [AWS Homologação] → [AWS Produção]
     agora              após aceite           após go-live
```

### Fase 1 — Local (pasta `trigger/33`)

- Docker Compose: app **3849**, Postgres **5435**
- `simularProducao=true`, Focus/Inter em modo **SIMULADO**
- Objetivo: apresentar ciclo completo ao cliente

### Fase 2 — AWS Homologação (padrão Cenário D / E)

Arquitetura recomendada (porte RLP — **sem** NAT Gateway / ALB / Fargate no dia 1):

| Peça | Escolha |
|---|---|
| Compute | 1× EC2 Graviton (`t4g.small`/`medium`) ou Lightsail |
| Runtime | Mesmo `docker compose` desta pasta |
| Banco | Postgres no host **ou** RDS `db.t4g.micro` (backup automático) |
| TLS | Caddy / nginx + Let's Encrypt no host (ou CloudFront depois) |
| Secrets | SSM Parameter Store / Secrets Manager |
| Backup | Snapshot diário + restore testado 1×/mês |
| Budget | Alarme USD 120–200/mês (HML+sandbox) |

Passos:

1. Conta AWS `nonprod` (separada de produção).
2. EC2 Ubuntu 22.04+, Docker + Compose.
3. Clonar este repositório / enviar artefato release.
4. `.env` com `APP_ENV=homologacao`, `AUTH_SECRET` forte, senhas novas.
5. `docker compose up -d --build`
6. DNS: `erp-hml.retaetiquetas.com.br` (exemplo) → IP elástico.
7. Credenciais Focus **homolog** e Inter **sandbox** quando for testar emissão real.
8. Reiniciar demo: `npm run db:reset-ops` (ou botão ADMIN).

### Fase 3 — Produção

Checklist mínimo (não negociável no estudo 32):

- [ ] Conta AWS `prod` isolada de HML
- [ ] `simularProducao=false`, `ambienteFiscal=PRODUCAO` só em EMP-00001
- [ ] Certificado A1 anexado; Focus token produção
- [ ] BankProvider **Sicoob** (Inter só sandbox)
- [ ] Backup + restore exercitado
- [ ] Idempotência de webhook NF/COB/BX validada
- [ ] Budget + alarme (teto sugerido USD 250/mês 1º semestre)
- [ ] EMP-00002 continua com `vendaHabilitada=false` até parecer Contador+Direção
- [ ] WhatsApp apenas Meta Cloud API (nunca Baileys/conta pessoal)
- [ ] LAI / natureza 9.xx **nunca** no ERP

## Variáveis de ambiente (AWS)

```bash
DATABASE_URL=postgresql://...
AUTH_SECRET=<32+ chars aleatórios>
ADMIN_PASSWORD=<rotacionar no go-live>
APP_ENV=homologacao|producao
PORT=3849
FOCUS_TOKEN=
INTER_CLIENT_ID=
INTER_CLIENT_SECRET=
```

## Cutover sugerido

1. Congelar cadastros mestres em HML local / AWS HML.
2. Dual-run 1–2 semanas (operação ainda no processo atual).
3. Virada fiscal: só após Contador validar séries, CNAE e CFOP.
4. Kill-switch por provedor (Focus / banco / WhatsApp) sem derrubar o ERP.

## Referências

- `../32/ESTIMATIVA_CUSTO_AWS_MENSAL.txt` — Cenário D padrão
- `../32/SEGURANCA_NUVEM_AWS_OPERACAO_SEGURA.txt` — princípios de operação
- `../32/MULTI_EMPRESA_CNPJS_E_LIVROS.txt` — EMP-00001 / EMP-00002
