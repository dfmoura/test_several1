# Detalhes · Prompts de implementação futura

Pasta com os **melhores prompts** alinhados às decisões de produto já discutidas.
Use cada arquivo como instrução completa para um agente/dev implementar a feature.

| Arquivo | Tema |
|---------|------|
| `01-auth-papeis-limites.md` | Login, papéis, teto 3 consulta + 1 admin |
| `02-agendamento-coleta-cnpjs.md` | Coleta de madrugada + cadeia CNPJs + Setup |
| `03-propostas-analise-preco-ia.md` | Propostas abertas → análise de preço de mercado |
| `04-setup-tokens-ia-rotacao.md` | Tokens de IA no Setup + rotação automática |
| `05-deploy-aws-free.md` | Deploy gratuito AWS + Git (contexto operacional) |
| `06-baseline-disciplina.md` | Baseline: módulos, testes, backup, health (sem overengineering) |

## Ordem sugerida de implementação

1. Auth e papéis (base de segurança)
2. Tokens de IA no Setup (infra de credenciais)
3. Análise de preço em Propostas abertas
4. Agendamento coleta → CNPJs
5. Disciplina operacional (baseline / backup / health) — `06`
6. Deploy AWS (quando o app estiver estável)

## Princípios comuns (valer em todos os prompts)

- Stack atual: FastAPI + SQLite + Docker + frontend estático em `app/static/`
- Não quebrar coleta PNCP/Power BI nem o schema oficial das licitações
- Features novas em tabelas/módulos isolados
- Telas sensíveis: Setup, Coleta, CNPJs vencedores → só `admin`/`operacao`
- Preferir constantes configuráveis a hardcode espalhado
- Sem overengineering (sem Cognito, sem microserviços, sem RDS por enquanto)
