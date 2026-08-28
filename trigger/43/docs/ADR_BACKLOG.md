# ADR — Backlog operacional por EMP

**Status:** Aceito  
**Data:** 2026-08-27  
**Relacionada:** `docs/MODELO_INSTALACAO_MULTI_EMPRESA.md` · cadastro leve (padrão DEP)

---

## Decisão

Registro **simples** de tarefas da empresa ativa — **não** é o backlog de produto TRIGGER (`docs/BACKLOG.md`), **não** é a matriz de Implantação e **não** entra no Painel (cockpit).

| Campo | Origem |
|-------|--------|
| `tarefa` | Texto informado |
| `lancado_em` | `created_at` (automático no create) |
| `concluido_em` | Automático em **Concluir**; limpo em **Reabrir** |
| `observacao_conclusao` | Texto opcional no **Concluir**; limpo em **Reabrir** |
| `codigo` | `BLG-NNNNN` por EMP |

Situação derivada: `ABERTO` (`concluido_em` null) · `CONCLUIDO` (preenchido). Sem prioridade, responsável, tags ou Kanban nesta entrega.

## Modelo

- Escopo: `empresa_id` + soft delete.
- API: `GET/POST /backlog`, `PUT`, `POST …/concluir`, `POST …/reabrir`, `DELETE`.
- Permissões: `backlog.ler` (consulta) nos papéis operacionais; `backlog.escrever` só em `USR-00019` (concessão direta, não em papel).
- Papéis com `backlog.ler`: ADMIN, FINANCEIRO, COMERCIAL, COMPRAS, FISCAL, PRODUCAO, EXPEDICAO, CONSULTA.
- Grant persistido em `role_has_permissions` (insertOrIgnore) — não confiar só em `hasPermissionTo`/cache Spatie.
- `DatabaseSeeder` inclui `backlog.ler` (evita `syncPermissions` apagar no `SEED_ON_BOOT`); boot: `backlog:ensure-rbac`.
- API: leitura/`escrita` via `BacklogAuthorization` (= `getAllPermissions`, mesmo critério do `/me`).
- UI: menu/rota usam `backlog.ler` (padrão dos demais módulos); formulário e ações só com `backlog.escrever` explícito.
- `User::$guard_name = web` — Spatie + Sanctum.
- UI: Cadastros → **Backlog** (consulta para todos com ler; lançar/concluir só quem escreve).

## Proibido

1. Confundir com `docs/BACKLOG.md` (produto TRIGGER) ou `/implantacao`.
2. Empilhar no Painel.
3. Catálogo global sem EMP.
4. Inventar workflow de projeto sem ADR nova.

## Rastreio

- Model/service: `BacklogItem`, `BacklogService`
- API: `BacklogController`
- Web: `BacklogPage`
- Teste: `tests/Feature/BacklogTest.php`
