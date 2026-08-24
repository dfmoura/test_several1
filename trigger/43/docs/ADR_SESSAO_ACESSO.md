# ADR — Sessão de acesso (única, teto simultâneo, idle)

**Status:** Aceito · **Data:** 2026-08-21  
**Norma:** `MODELO_INSTALACAO_MULTI_EMPRESA.md` · `ADR_FATIA_COMERCIAL_SAAS.md` · `ADR_CONSOLE_PLATAFORMA.md`  
**Referência de UX:** `../23` (uma sessão por conta + «Encerrar sessão anterior e entrar»)

## Contexto

O FLEXORC autentica por **Bearer Sanctum** (`personal_access_tokens`), não por cookie de sessão. Login repetido acumulava PATs. Precisávamos: (1) o mesmo usuário não ficar em dois lugares; (2) no máximo **6 pessoas diferentes** conectadas na instalação; (3) **30 minutos** sem uso encerram o acesso.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Reusar o PAT Sanctum** como sessão viva | Já é o contrato da API. Tabela `sessions` do Laravel não autentica o SPA. Dual-write desincroniza. |
| **Uma sessão viva por usuário** | Segundo login → **409** `SESSAO_OCUPADA`. Senha válida + `encerrar_sessao_anterior=true` derruba a órfã (self-service, como no 23). Admin **Libera sessão** em Usuários. |
| **Teto = 6 usuários distintos** com PAT vivo | Assento da instalação (licenciado), não por EMP. 7º login → **409** `SESSOES_LIMITE` (sem takeover — a vaga é de outra pessoa). |
| **Idle = 30 min** pelo `last_used_at` (ou `created_at` se nunca usado) | Sanctum `expiration` conta desde a criação, não desde o último ato. Callback `authenticateAccessTokensUsing` recusa **antes** de renovar `last_used_at`. |
| **Operador `PLATAFORMA` não consome assento** | Console TRIGGER não pode bloquear o cliente. Continua sujeito a sessão única e idle. |
| Constantes em `config/erp.php` (`erp.auth.*`) | Fácil de alterar depois (`AUTH_IDLE_MINUTES`, `AUTH_MAX_USUARIOS_SIMULTANEOS`). |

```
Login (senha ok)
  ├── PAT vivo deste usuário?  → 409 SESSAO_OCUPADA  |  takeover → revoga e emite
  └── senão, assentos vivos (exceto PLATAFORMA) ≥ 6? → 409 SESSOES_LIMITE
       senão emite PAT name=api
```

Pedido autenticado: PAT ocioso → apaga + 401 `SESSAO_INATIVA`. Usuário inativo → 401 `USUARIO_INATIVO`. Logout e desativar/trocar senha revogam o PAT.

## Fora de escopo

- Cookie SPA / CSRF (`statefulApi` continua desligado)
- SSO, 2FA, “lembrar-me”
- Limite de *contas cadastradas* (só simultâneas)
- Impersonação

## Consequências

- Motor: `SessaoAcessoService` é a única emissão de PAT de acesso (`AuthController`, alta de conta).
- UI login: CTA **Encerrar sessão anterior e entrar** só no 409 `SESSAO_OCUPADA`.
- UI Usuários: pill **Conectado** + **Liberar sessão**.
- SPA: 401 autenticado limpa o token e volta ao login com a mensagem (inatividade inclusive).
- Testes: `SessaoAcessoTest` + onboarding (login após alta = 409 até takeover).
- Isolamento `empresa_id` intacto — sessão é do usuário da instalação, não da EMP.
