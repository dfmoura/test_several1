# Prompt · Autenticação, papéis e limite de usuários

## Contexto do projeto

Observatório de Licitações (Observatório Social Uberlândia). App FastAPI + SQLite + frontend em `app/static/` (shell com páginas: Painel, Mapa, Consulta, CNPJs vencedores, Propostas abertas, Coleta, Compras.gov, Power BI, Vínculos, Observadores, Setup). Hoje **não há autenticação**.

## Objetivo

Implementar login simples com sessão, papéis e teto de contas, de forma extensível para o futuro.

## Requisitos funcionais

1. **Login por usuário/senha** (sessão cookie no servidor). Sem OAuth/Cognito.
2. **Papéis iniciais:**
   - `consulta` — leitura das telas de análise (Painel, Mapa, Consulta, CNPJs vencedores, Propostas abertas em modo leitura). **Não** acessa Setup, Coleta nem dispara job de CNPJs pendentes (nem APIs dessas áreas).
   - `admin` (ou `operacao`) — acesso total, inclusive Setup, Coleta, disparo/cancelamento de CNPJs pendentes e gestão de usuários.
3. **Limites rígidos:**
   - no máximo **1** usuário `admin`
   - no máximo **3** usuários `consulta`
   - total máximo **4** contas
   - constantes fáceis de alterar depois (`MAX_ADMIN = 1`, `MAX_CONSULTA = 3`)
   - **sessão única por conta:** se já houver login ativo, o 2º acesso recebe 409 (não derruba quem está dentro); admin pode **Liberar sessão** no Setup
4. **Bootstrap:** se não existir nenhum usuário, permitir criar o primeiro admin (setup inicial) ou seed via env.
5. **UI:**
   - tela de login
   - menu lateral só mostra páginas permitidas pelo papel
   - Setup: listar usuários, criar (respeitando teto), desativar/resetar senha/liberar sessão (só admin)
6. **Segurança:**
   - senha com hash (ex.: bcrypt/argon2)
   - bloquear APIs sensíveis no backend (não confiar só em esconder botão)
   - rotas de coleta, setup, POST do job de CNPJs pendentes → exigem admin; GET da listagem/status de vencedores → login (consulta ok)

## Requisitos técnicos

- Tabelas novas isoladas (ex.: `usuarios`, `sessoes` se necessário)
- Middleware/dependency FastAPI para `require_login` e `require_admin`
- Frontend: após login, carregar perfil (`/api/auth/me`) e filtrar `nav-btn`
- Manter estilo visual atual do app
- Testes cobrindo: teto de usuários, bloqueio de API sem admin, hash de senha

## Fora de escopo

- SSO, e-mail, 2FA, recuperação por e-mail
- Mais de dois papéis (pode deixar enum extensível, mas só implementar estes dois)

## Critérios de aceite

- Visitante sem login não usa o sistema
- Usuário `consulta` vê CNPJs vencedores (leitura), mas não dispara/cancela o lote; não vê nem chama Setup/Coleta
- Tentativa de criar 2º admin ou 4º consulta falha com mensagem clara
- Reinício do container preserva usuários no SQLite
