# ERP RLP — Sistema operacional completo (Fase 1)

Sistema único para **RLP Etiquetas Auto Adesivos Ltda** (MG): do orçamento ao caixa, com homologação etapa a etapa.

Constrói sobre o melhor de cada etapa anterior:

| Origem | O que foi aproveitado |
|--------|------------------------|
| `trigger/28` | Party de parceiros, cadastro fiscal-aware, jornada operacional, brand |
| `trigger/29` | Motor R1–R20 (XLSM), catálogo oficial, mapa de facas, transparência de custos |
| `trigger/31` | NF-e XML → estoque (m²/ml), de/para fornecedor, contas a pagar |
| `trigger/32` | Domínio normativo: PED raiz, invariants, CA-01…12, módulos M01–M11 |

## Stack

- **API:** FastAPI + SQLAlchemy + PostgreSQL 16
- **UI:** React 18 + TypeScript + Vite
- **Infra local/AWS:** Docker Compose (db + api + web)

## Subir local (Docker)

```bash
cp .env.example .env
docker compose down -v   # recria banco limpo (HML) para o seed da jornada
docker compose up --build -d
```

- App: http://localhost:8036  
- API docs: http://localhost:8036/api/docs (via proxy) ou container `api:8000`  
- Login: `admin@rlp.com.br` / `Admin@123`
- Demos por perfil (RBAC): `comercial@rlp.com.br`, `financeiro@rlp.com.br`, `fiscal@…`, `producao@…`, `compras@…`, `expedicao@…`, `consulta@…` — senha `Demo@123`
- Usuários/perfis: `/usuarios` (ADMIN)

Parar:

```bash
docker compose down
```

## Jornada operacional (visível na UI)

```
ORC → (aceite) → PED → liberar crédito/sinal → OP/OS → estoque
                         ↓
              NF (simulado Focus) + TIT → COB → ENT → BX
```

Cada etapa mostra badge **OPERACIONAL** / **HOMOLOGAVEL** / **TEORICO** e a regra de domínio associada. Homologação em `/homologacao` com critérios CA-01…CA-12 e gate GO/NO-GO.

## Módulos

| Rota | Conteúdo |
|------|----------|
| `/` | Filas de trabalho + status ambiente |
| `/empresas` | Cadastro principal multi-CNPJ (EMP-00001 / EMP-00002) |
| `/parceiros` `/produtos` | Cadastros (Party + produtos) |
| `/orcamentos` | Motor R1–R20 + faixas + aceite → PED |
| `/pedidos` | Liberação, produção, faturar, entregar |
| `/producao` | OP/OS + empenho/baixa MP + PA/sobra |
| `/estoque` `/compras` `/nfe` | Saldos/reservas + NEC→OC + entrada NF-e XML × OC |
| `/fiscal` | NF saída (simulada em HML) |
| `/financeiro` | TIT / COB / BX (idempotente) + natureza |
| `/naturezas` | Catálogo gerencial grupos 1–5 (sem LAI/9.xx) |
| `/entrega` | Romaneio + confirmação |
| `/devolucoes` | DEV ponta a ponta (fiscal + estoque + financeiro) |
| `/patrimonio` | Bens gerenciais BEM-NNNNN |
| `/jornada` | Diagrama vivo ORC→BX |
| `/homologacao` | UAT CA-01…12 |
| `/usuarios` | Gestão de usuários + perfis RBAC (ADMIN) |

O seed de homologação cria **dados demo da jornada** (pedidos, OP, estoque MP/PA, NF+TIT+COB, entrega, patrimônio) para o agente/usuário visualizar imediatamente.

## Fluxo mínimo de homologação (feliz)

1. Cadastre ou use o cliente demo.
2. Crie orçamento (calcular → salvar → enviar → aprovar faixa) → nasce PED.
3. Em Pedidos: liberar por crédito → iniciar produção.
4. Em Produção: concluir OP/OS.
5. Em Pedidos: faturar (gera NF+TIT+COB simulados) → entregar.
6. Em Financeiro: baixar título (BX).
7. Em Entrega: confirmar.
8. Marque CA-01…12 em Homologação e veja GO/NO-GO.

Paralelo estoque: importe XML NF-e em `/nfe`, aceite mapeando produtos, confira saldos.

## AWS (Scenario D — FinOps)

Alvo documentado no domínio: **1× EC2 Graviton** rodando o mesmo Compose (API+worker+nginx), Postgres no mesmo host (HML) ou RDS (PROD).

Sugestão de cutover:

1. Empacotar imagens (`docker compose build`) e publicar no ECR.
2. EC2 ARM64 + Docker Compose + `.env` com secrets no SSM/Secrets Manager.
3. Security group: 80/443 público; Postgres só localhost/VPC.
4. Volume EBS para `pgdata` + snapshots diários (CA-10).
5. Ambiente: `ENVIRONMENT=HOMOLOGACAO` + `SIMULAR_INTEGRACOES=true` até credenciais Focus/banco.
6. Produção: `SIMULAR_INTEGRACOES=false`, tokens Focus e BankProvider reais, domínio + TLS (Caddy/nginx).

Teto de custo de referência 1º semestre: ~USD 90–180/mês (sem NAT/ALB/Fargate no dia 1).

## Desenvolvimento sem Docker (API)

```bash
# Postgres em :5436 via compose só do db, ou local
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://rlp:rlp_secret@localhost:5436/rlp_erp
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev   # proxy /api → :8000
```

## Invariantes (não negociar)

1. Um ERP; **PED** é o agregado-raiz.
2. Aceite formal de ORC gera PED (não “combinado no zap”).
3. Snapshot do ORC trava o PED — sem recalcular na conversão.
4. Produção só com crédito OK ou adiantamento.
5. NF ≠ TIT (nascem juntos, conceitos distintos).
6. Naturezas 1–5 apenas — LAI/9.xx rejeitado.
7. Dinheiro/qty sem float binário (Decimal HALF-UP).
8. Operações financeiras/fiscais idempotentes.

## Estrutura

```
backend/app/
  domain/etapas.py     # ciclo + CA-01..12
  engine/              # motor R1–R20 (do 29)
  models.py            # schema Fase 1
  routers/api.py       # API REST
  services/            # estoque médio, NF-e, lookups BR
frontend/src/pages/    # UI por etapa
docs/homologacao/      # roteiro UAT
```

## Documentação

- [Roteiro de homologação](docs/homologacao/ROTEIRO_UAT.md)
- Domínio origem: `../32/`
