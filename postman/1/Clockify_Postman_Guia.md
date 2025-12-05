## Guia de Requisições no Postman para Clockify API

Este documento fornece um passo a passo objetivo para configurar e executar requisições à API do Clockify usando o Postman, cobrindo autenticação, variáveis, coleções e exemplos de endpoints comuns (usuários, workspaces, clientes, projetos e lançamentos de horas).

Referência oficial: `https://docs.clockify.me/#section/Introduction`

---

### 1) Pré‑requisitos

- Conta ativa no Clockify e acesso ao `workspace` desejado
- Chave de API pessoal (API Key) do Clockify
- Postman instalado

Como obter sua API Key:

- No Clockify Web, acesse: Profile (avatar) > Settings > API > Copy API Key

---

### 2) Base URL e autenticação

- Base URL (v1): `https://api.clockify.me/api/v1`
- Autenticação: cabeçalho `X-Api-Key: <SEU_TOKEN>`

**IMPORTANTE**: Você já tem o token, então vamos configurar diretamente no Postman.

---

### 2.1) PASSO A PASSO RÁPIDO - Primeira Requisição de Teste

Vamos fazer uma requisição simples para obter seus dados de usuário:

**Passo 1**: Criar nova requisição no Postman

- Clique em **"New"** > **"HTTP Request"** (ou pressione `Ctrl+N`)

**Passo 2**: Configurar o método e URL

- Método: Selecione **"GET"** no dropdown (deve estar selecionado por padrão)
- URL: Digite exatamente: `https://api.clockify.me/api/v1/user`
  - Copie e cole essa URL completa na barra de endereço

**Passo 3**: Adicionar o token no Header (AUTENTICAÇÃO)

1. Clique na aba **"Headers"** abaixo da URL
2. Na linha de cabeçalhos, você verá colunas: **Key** e **Value**
3. Na primeira linha, em **Key**, digite exatamente: `X-Api-Key`
   - Atenção: é case-sensitive (maiúsculas e minúsculas importam)
4. Na mesma linha, em **Value**, cole seu token/API Key do Clockify
   - Cole diretamente o token, sem aspas, sem espaços antes/depois
   - Exemplo: `Vf8KJ9L3mN4pQ5rS6tU7vW8xY9zA0b1C2d3`

**Passo 4**: Verificar configuração (antes de enviar)

- ✅ Método: GET
- ✅ URL: `https://api.clockify.me/api/v1/user`
- ✅ Headers: `X-Api-Key` com seu token no Value

**Passo 5**: Enviar a requisição

- Clique no botão **"Send"** (azul, no lado direito)
- Você deve receber uma resposta JSON com seus dados de usuário (status 200)

**Se der erro 401 ou 403**:

- Verifique se o token foi colado corretamente (sem espaços extras)
- Confirme que o Key está escrito exatamente: `X-Api-Key` (com X maiúsculo e hífen)
- Verifique se sua API Key está ativa no Clockify

**Se der erro 404 ou "could not get response"**:

- Verifique sua conexão com internet
- Confirme que a URL está correta: `https://api.clockify.me/api/v1/user`

---

### 3) Configuração de variáveis no Postman (recomendado)

Crie um Ambiente no Postman (Settings > Environments > Add):

- `CLOCKIFY_BASE_URL` = `https://api.clockify.me/api/v1`
- `CLOCKIFY_API_KEY` = `SUA_CHAVE_AQUI`
- `WORKSPACE_ID` = será preenchido após listar seus workspaces
- `USER_ID` = será preenchido após obter seu usuário

Use essas variáveis nas requisições como `{{VARIAVEL}}`.

---

### 4) Criar uma Coleção no Postman

1. New > Collection > Nome: `Clockify API`
2. Na Collection > Variables (ou no Environment), garanta `CLOCKIFY_BASE_URL` e `CLOCKIFY_API_KEY` definidos
3. Em Authorization, deixe como `No Auth` (usaremos header manual `X-Api-Key`)

---

### 5) Requisições essenciais (passo a passo)

#### 5.1 Obter dados do usuário autenticado

**Configuração no Postman:**

1. **Método**: Selecione `GET`
2. **URL**: `https://api.clockify.me/api/v1/user`
3. **Headers**:
   - Key: `X-Api-Key`
   - Value: `SEU_TOKEN_AQUI` (cole diretamente seu token)
4. Clique em **Send**
5. **Resposta esperada**: JSON com seus dados (id, name, email, etc.)

**O que fazer com a resposta:**

- Copie o campo `id` da resposta (será usado depois)
- Exemplo de resposta:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Seu Nome",
  "email": "seu@email.com"
}
```

#### 5.2 Listar workspaces do usuário

**Configuração no Postman:**

1. **Método**: Selecione `GET`
2. **URL**: `https://api.clockify.me/api/v1/workspaces`
3. **Headers**:
   - Key: `X-Api-Key`
   - Value: `SEU_TOKEN_AQUI` (o mesmo token usado acima)
4. Clique em **Send**
5. **Resposta esperada**: Array JSON com seus workspaces

**O que fazer com a resposta:**

- Você receberá uma lista de workspaces, cada um com um `id`
- Copie o `id` do workspace que deseja usar (geralmente será o primeiro da lista)
- Exemplo de resposta:

```json
[
  {
    "id": "507f191e810c19729de860ea",
    "name": "Meu Workspace",
    "imageUrl": "..."
  }
]
```

#### 5.3 Listar projetos de um workspace

**IMPORTANTE**: Você precisa do `workspaceId` obtido na requisição 5.2 acima!

**Configuração no Postman:**

1. **Método**: Selecione `GET`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/projects`
   - Substitua `SEU_WORKSPACE_ID` pelo ID copiado da requisição anterior
   - Exemplo real: `https://api.clockify.me/api/v1/workspaces/507f191e810c19729de860ea/projects`
3. **Headers**:
   - Key: `X-Api-Key`
   - Value: `SEU_TOKEN_AQUI`
4. Clique em **Send**
5. **Resposta esperada**: Array JSON com os projetos do workspace

#### 5.4 Criar um cliente (opcional)

**Configuração no Postman:**

1. **Método**: Selecione `POST`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/clients`
   - Substitua `SEU_WORKSPACE_ID` pelo ID do seu workspace
3. **Headers**:
   - Key: `X-Api-Key` → Value: `SEU_TOKEN_AQUI`
   - Key: `Content-Type` → Value: `application/json`
4. **Body**:
   - Clique na aba **"Body"** (abaixo de Headers)
   - Selecione a opção **"raw"** (botão de opção)
   - No dropdown ao lado, selecione **"JSON"**
   - Cole o seguinte JSON no campo de texto:

```json
{
  "name": "Cliente Exemplo"
}
```

5. Clique em **Send**

#### 5.5 Criar um projeto

**Configuração no Postman:**

1. **Método**: Selecione `POST`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/projects`
   - Substitua `SEU_WORKSPACE_ID` pelo ID do seu workspace
3. **Headers**:
   - Key: `X-Api-Key` → Value: `SEU_TOKEN_AQUI`
   - Key: `Content-Type` → Value: `application/json`
4. **Body**:
   - Aba **"Body"** → **"raw"** → **"JSON"**
   - Cole o JSON (substitua os valores conforme necessário):

```json
{
  "name": "Projeto Exemplo",
  "public": false
}
```

- Se quiser associar a um cliente, adicione `"clientId": "ID_DO_CLIENTE"` (opcional)

5. Clique em **Send**

#### 5.6 Criar um lançamento de horas (time entry)

**IMPORTANTE**: Você precisa do `workspaceId` e de um `projectId` (obtenha listando projetos na requisição 5.3)

**Configuração no Postman:**

1. **Método**: Selecione `POST`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/time-entries`
   - Substitua `SEU_WORKSPACE_ID` pelo ID do seu workspace
3. **Headers**:
   - Key: `X-Api-Key` → Value: `SEU_TOKEN_AQUI`
   - Key: `Content-Type` → Value: `application/json`
4. **Body**:
   - Aba **"Body"** → **"raw"** → \*\*"JSON"`

**Exemplo 1 - Lançamento completo (com início e fim):**

```json
{
  "start": "2025-01-15T09:00:00Z",
  "end": "2025-01-15T11:30:00Z",
  "billable": false,
  "description": "Reunião de planejamento",
  "projectId": "SEU_PROJECT_ID_AQUI"
}
```

- **Formato de data**: Use `YYYY-MM-DDTHH:MM:SSZ` (formato ISO 8601)
- Substitua `SEU_PROJECT_ID_AQUI` pelo ID de um projeto existente
- `start` e `end` são obrigatórios neste exemplo

**Exemplo 2 - Iniciar timer (sem fim, será encerrado depois):**

```json
{
  "start": "2025-01-15T13:00:00Z",
  "billable": true,
  "description": "Desenvolvimento de funcionalidade",
  "projectId": "SEU_PROJECT_ID_AQUI"
}
```

- Neste caso, não inclua `end` - o timer ficará rodando até você encerrá-lo (requisição 5.7)

5. Clique em **Send**

**Resposta esperada**: JSON com os dados do time entry criado, incluindo um `id` (guarde esse ID se precisar atualizar depois)

#### 5.7 Parar/encerrar um lançamento em andamento

**IMPORTANTE**: Você precisa do `timeEntryId` do timer que está rodando (obtido ao criar um time entry sem `end`)

**Configuração no Postman:**

1. **Método**: Selecione `PATCH`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/time-entries/TIME_ENTRY_ID/end`
   - Substitua `SEU_WORKSPACE_ID` pelo ID do workspace
   - Substitua `TIME_ENTRY_ID` pelo ID do time entry que está rodando
3. **Headers**:
   - Key: `X-Api-Key` → Value: `SEU_TOKEN_AQUI`
4. Clique em **Send** (não precisa de Body)
5. **Resposta esperada**: JSON com o time entry encerrado, incluindo a hora final (`end`)

#### 5.8 Atualizar um lançamento de horas

**Configuração no Postman:**

1. **Método**: Selecione `PUT`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/time-entries/TIME_ENTRY_ID`
   - Substitua `SEU_WORKSPACE_ID` e `TIME_ENTRY_ID`
3. **Headers**:
   - Key: `X-Api-Key` → Value: `SEU_TOKEN_AQUI`
   - Key: `Content-Type` → Value: `application/json`
4. **Body**:
   - Aba **"Body"** → **"raw"** → **"JSON"**
   - Cole o JSON com os campos que deseja atualizar:

```json
{
  "start": "2025-01-15T09:00:00Z",
  "end": "2025-01-15T12:00:00Z",
  "description": "Ajuste de horário",
  "projectId": "SEU_PROJECT_ID",
  "billable": false
}
```

5. Clique em **Send**

#### 5.9 Listar lançamentos de horas

**Configuração no Postman:**

1. **Método**: Selecione `GET`
2. **URL**: `https://api.clockify.me/api/v1/workspaces/SEU_WORKSPACE_ID/user/SEU_USER_ID/time-entries`
   - Substitua `SEU_WORKSPACE_ID` e `SEU_USER_ID` (obtido na requisição 5.1)
3. **Headers**:
   - Key: `X-Api-Key` → Value: `SEU_TOKEN_AQUI`
4. **Query Params** (opcional - para filtrar):
   - Clique na aba **"Params"** (ao lado de Headers)
   - Adicione parâmetros opcionais:
     - `start`: `2025-01-01T00:00:00Z` (data início)
     - `end`: `2025-01-31T23:59:59Z` (data fim)
     - `page`: `1` (número da página)
     - `page-size`: `50` (itens por página)
5. Clique em **Send**

---

### 6) Boas práticas no Postman

- Use Environment/Collection variables para `API_KEY`, `WORKSPACE_ID`, `USER_ID`, `PROJECT_ID`
- Em `Tests`, armazene IDs automaticamente. Exemplo para salvar `WORKSPACE_ID` do primeiro item:

```javascript
const list = pm.response.json();
if (Array.isArray(list) && list.length > 0) {
  pm.collectionVariables.set("WORKSPACE_ID", list[0].id);
}
```

---

### 7) Erros comuns e resolução de problemas

#### Erro 401 (Unauthorized) ou 403 (Forbidden)

**Causa**: Token inválido ou ausente

**Solução passo a passo:**

1. Verifique na aba **Headers** se o Key está escrito exatamente como: `X-Api-Key`

   - ❌ Errado: `x-api-key`, `X-API-KEY`, `X-Api-Key ` (com espaço), `Api-Key`
   - ✅ Correto: `X-Api-Key` (com X maiúsculo, hífen, e sem espaços)

2. Verifique se o Value contém seu token completo

   - Cole o token diretamente, sem aspas
   - Não deve ter espaços antes ou depois do token
   - O token geralmente tem mais de 30 caracteres

3. Verifique se o token está ativo no Clockify:
   - Acesse o Clockify Web
   - Vá em Profile > Settings > API
   - Confirme que sua API Key está visível e ativa
   - Se necessário, gere uma nova API Key

#### Erro 404 (Not Found)

**Causa**: URL incorreta ou IDs inválidos

**Solução:**

1. Verifique se a URL está completa e correta:

   - Base URL: `https://api.clockify.me/api/v1`
   - Verifique se não faltou `/api/v1` na URL
   - Exemplo correto: `https://api.clockify.me/api/v1/user`
   - Exemplo errado: `https://api.clockify.me/user`

2. Verifique se os IDs na URL estão corretos:

   - `workspaceId`: deve ser o ID obtido na requisição de listar workspaces
   - `projectId`, `userId`, `timeEntryId`: devem ser IDs válidos do seu workspace
   - IDs geralmente são strings longas (ex: `507f191e810c19729de860ea`)

3. Confirme que o recurso existe:
   - Liste os workspaces para obter IDs válidos
   - Liste os projetos para confirmar se o `projectId` existe

#### Erro 400 (Bad Request)

**Causa**: JSON inválido ou campos obrigatórios ausentes

**Solução:**

1. Verifique o formato do JSON:

   - Use a aba **Body** → **raw** → **JSON**
   - Confirme que está marcado como JSON no dropdown
   - Verifique se não há vírgulas extras no final dos objetos
   - Verifique se todas as chaves estão entre aspas duplas

2. Verifique o formato de datas:

   - ✅ Correto: `"2025-01-15T09:00:00Z"` (formato ISO 8601 com Z no final)
   - ❌ Errado: `"2025-01-15 09:00:00"`, `"15/01/2025"`, `"2025-01-15T09:00:00"`

3. Verifique campos obrigatórios:

   - Para criar time entry: `start` e `projectId` são obrigatórios
   - Para criar projeto: `name` é obrigatório
   - Para criar cliente: `name` é obrigatório

4. Veja a mensagem de erro na resposta:
   - A API geralmente retorna um JSON com `message` explicando o erro
   - Leia a aba **Body** da resposta de erro para mais detalhes

#### Erro "Could not get response" ou timeout

**Causa**: Problemas de conexão ou servidor

**Solução:**

1. Verifique sua conexão com internet
2. Tente novamente após alguns segundos (o servidor pode estar temporariamente indisponível)
3. Verifique se a URL está correta e se está acessando `https://` (não `http://`)

#### Outras dicas úteis

- **Sempre verifique a resposta**: Mesmo em caso de erro, a resposta JSON geralmente contém informações úteis na propriedade `message`
- **Use a aba "Pretty"**: Na resposta do Postman, clique em "Pretty" para ver o JSON formatado
- **Salve IDs importantes**: Após obter `userId`, `workspaceId`, `projectId`, guarde-os em um arquivo de texto para usar nas próximas requisições

---

### 8) Referências

- Documentação: `https://docs.clockify.me/#section/Introduction`
- Endpoints (seções de referência): Users, Workspaces, Projects, Clients, Time Entries
