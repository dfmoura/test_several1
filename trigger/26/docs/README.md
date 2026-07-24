# Documentação — Sistema de Gestão Reta Etiquetas

Pacote de projeto para ERP operacional local (Docker) com caminho claro para produção.

| Documento | Conteúdo |
|-----------|----------|
| [ARQUITETURA-SISTEMA-GESTAO-RETA.md](./ARQUITETURA-SISTEMA-GESTAO-RETA.md) | Visão geral, escopo, módulos, maturidade, integrações |
| [FLUXO-OPERACIONAL.md](./FLUXO-OPERACIONAL.md) | Passo a passo do fluxo de negócio |
| [MOTOR-ORCAMENTO.md](./MOTOR-ORCAMENTO.md) | Planilha oficial → motor de precificação |
| [DOCKER-LOCAL-PROD.md](./DOCKER-LOCAL-PROD.md) | Compose local e promoção a produção |
| [schema-mvp.sql](./schema-mvp.sql) | DDL PostgreSQL do MVP |

**Fora deste momento:** NFS-e · importações.

**Leitura sugerida:** Arquitetura → Fluxo → Motor → Schema → Docker.

**Implementação:** ver [`README.md`](../README.md) na raiz — Compose local com API, web, worker, Postgres, Redis, MinIO, Mailpit e Caddy.
