# Mitralab Proto

Protótipo fullstack (Spring Boot + React) para ingestão multi-banco, consultas e dashboards orientados por IA, com arquitetura modular.

## Requisitos

- Docker e Docker Compose

## Como rodar

Na raiz do projeto:

```bash
docker compose up --build
```

- **Frontend:** http://localhost:3000  
- **API:** http://localhost:8080/api  
- **PostgreSQL:** `localhost:5432` (usuário/senha `mitralab` / `mitralab`, banco `mitralab`)

O backend só sobe depois do healthcheck do Postgres (`depends_on` + `condition: service_healthy`).

## Configurar IA

Variável `AI_PROVIDER` (via ambiente ou arquivo `.env` na mesma pasta do `docker-compose.yml`):

| Valor    | Descrição |
|----------|-----------|
| `mock`   | Padrão. Não chama rede; devolve um plano fixo usando a tabela de exemplo `demo_sales`. |
| `openai` | Exige `OPENAI_API_KEY`. Usa Chat Completions (`mitralab.ai.openai.*` no `application.yml`). |
| `ollama` | LLM local. Por padrão `OLLAMA_BASE_URL=http://host.docker.internal:11434` (Linux: mapeado no compose). |

Exemplos:

```bash
AI_PROVIDER=openai OPENAI_API_KEY=sk-... docker compose up --build
```

```bash
AI_PROVIDER=ollama docker compose up --build
```

No modo **Ollama**, rode o servidor Ollama na máquina host e puxe um modelo (ex.: `ollama pull llama3.2`).

## Credenciais de bancos externos

1. Cadastre a conexão em **Conexões** (`POST /api/connections`).
2. **Recomendado:** preencha `passwordEnvKey` com o nome de uma variável de ambiente e injete o segredo no `docker-compose` ou no orquestrador.
3. **Somente desenvolvimento:** `ALLOW_INLINE_DB_PASSWORD=true` permite gravar `devPassword` no cadastro (o campo não é exposto nas respostas JSON).

Drivers incluídos no backend: PostgreSQL, Oracle (`ojdbc11`), SQL Server.

### JDBC por tipo

- **PostgreSQL:** `jdbc:postgresql://host:port/database`
- **Oracle:** `jdbc:oracle:thin:@//host:port/service` (use o service name em “database”)
- **SQL Server:** `encrypt=false` no protótipo; ajuste para produção.

## Fluxo de prompts (dashboard)

1. Usuário envia texto em **IA & prompts** → `POST /api/ai/dashboard-prompt`.
2. **AI Engine** (`AiEngineService` + `AIProvider`) produz JSON com `sql`, `chartType`, `xKey`, `yKey`.
3. O backend executa o SQL no PostgreSQL da app ou na conexão externa selecionada.
4. O frontend renderiza com Recharts.

Salvar: `POST /api/ai/save-dashboard-from-prompt` cria um `Dashboard` com um widget.

## Arquitetura (backend)

| Pacote | Papel |
|--------|--------|
| `com.mitralab.controller` | REST |
| `com.mitralab.service` | regras de negócio |
| `com.mitralab.repository` | Spring Data JPA |
| `com.mitralab.ai` | **AI Engine** — `AIProvider`, implementações mock/OpenAI/Ollama |
| `com.mitralab.datasource` | execução de SQL (app PG vs JDBC externo), `SqlSafety` (somente SELECT/WITH) |

Para um novo provedor de IA: implemente `AIProvider`, registre um `@Bean` condicionado em `mitralab.ai.provider` (veja `AiConfiguration`).

## Desenvolvimento local (sem Docker)

- Backend: JDK 21 + Maven na pasta `backend` → `mvn spring-boot:run` (Postgres acessível em `DB_*`).
- Frontend: `cd frontend && npm install && npm run dev` — proxy Vite aponta `/api` para `localhost:8080`.

## Limitações do protótipo

- Snapshots de ingestão guardam JSON em texto (adequado para volumes pequenos).
- Validação SQL é intencionalmente simples; não substitui sandbox de produção.
- OpenAI/Ollama dependem de prompts estáveis; ajuste o texto em `AiEngineService` para seu schema real.
