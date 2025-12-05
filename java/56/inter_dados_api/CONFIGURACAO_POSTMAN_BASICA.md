# Configuração Básica do Postman - Banco Inter Sandbox

## 📋 Informações da Aplicação

- **URL OAuth**: `https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token`
- **Client ID**: `330fb082-f5da-4aef-9d21-c020de8e23e0`
- **Client Secret**: `d6257e31-47a7-4ad0-934d-b4b7f93bc4f8`
- **Operador**: `43695150`
- **Conta Corrente**: `238899195`
- **Certificados**:
  - Certificado Webhook (CA): `Certificado_Webhook/ca.crt`
  - Certificado API: `Inter_API-Chave_e_Certificado/Inter API_Certificado.crt`
  - **Certificado Completo** (recomendado): `Inter_API-Chave_e_Certificado/certificado_completo.crt` ⚠️ **USE ESTE**
  - Chave Privada: `Inter_API-Chave_e_Certificado/Inter API_Chave.key`

---

## 🚀 Passo a Passo Rápido

### 1. Configurar Certificado no Postman

**IMPORTANTE**: O Banco Inter exige certificado SSL para todas as requisições. O certificado deve incluir a cadeia completa (certificado do cliente + certificado CA).

**⚠️ SOLUÇÃO PARA ERRO "TLSV1_ALERT_UNKNOWN_CA"**: Use o arquivo `certificado_completo.crt` que já foi criado automaticamente (combina o certificado do cliente com o certificado CA).

#### Opção A: Configuração Global (Recomendado)

1. Abra o Postman
2. Clique no ícone de **Configurações** (⚙️) no canto superior direito
3. Ou vá em **File → Settings** (Windows/Linux) ou **Postman → Settings** (Mac)
4. No menu lateral esquerdo, clique em **"Certificates"**
5. Clique em **"Add Certificate"**
6. Preencha:
   - **Host**: `cdpj-sandbox.partners.uatinter.co`
   - **Port**: `443` (ou deixe em branco)
   - **CRT file**: Selecione o arquivo `certificado_completo.crt` da pasta `Inter_API-Chave_e_Certificado/` ⚠️ **USE ESTE ARQUIVO**
   - **Key file**: Selecione o arquivo `Inter API_Chave.key` da pasta `Inter_API-Chave_e_Certificado/`
   - **Passphrase**: Deixe em branco (a menos que tenha senha)
7. Clique em **"Add"**

#### Opção B: Configuração por Requisição (Alternativa)

1. Crie uma nova requisição
2. Na aba **"Settings"** da requisição (ao lado de Params, Authorization, etc)
3. Role até **"Client Certificates"**
4. Clique em **"Add Certificate"**
5. Configure:
   - **Host**: `cdpj-sandbox.partners.uatinter.co`
   - **Certificate File**: `certificado_completo.crt` ⚠️ **USE ESTE ARQUIVO**
   - **Key File**: `Inter API_Chave.key`
   - **Passphrase**: (deixe em branco)

---

### 2. Criar Requisição para Obter Token OAuth

#### 2.1. Criar Nova Requisição

- Clique em **"New"** → **"HTTP Request"**
- Nomeie: `Obter Token OAuth`

#### 2.2. Configurar Método e URL

- **Método**: `POST`
- **URL**: `https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token`

#### 2.3. Configurar Headers

Na aba **"Headers"**, adicione:

| Key            | Value                               |
| -------------- | ----------------------------------- |
| `Content-Type` | `application/x-www-form-urlencoded` |

#### 2.4. Configurar Body

1. Vá para a aba **"Body"**
2. Selecione **"x-www-form-urlencoded"** (NÃO JSON!)
3. Adicione os campos:

| Key             | Value                                  |
| --------------- | -------------------------------------- |
| `client_id`     | `330fb082-f5da-4aef-9d21-c020de8e23e0` |
| `client_secret` | `d6257e31-47a7-4ad0-934d-b4b7f93bc4f8` |
| `scope`         | `boleto-cobranca.read`                 |
| `grant_type`    | `client_credentials`                   |

**Nota sobre Scope**:

- Para boletos: `boleto-cobranca.read` ou `boleto-cobranca.write`
- Para Pix: `pix.read` ou `pix.write`
- Para múltiplos: `boleto-cobranca.read pix.read` (separados por espaço)

#### 2.5. Enviar Requisição

1. Clique em **"Send"**
2. Aguarde a resposta

#### 2.6. Resposta Esperada (Sucesso)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "boleto-cobranca.read"
}
```

**Copie o valor de `access_token`** - você precisará dele nas próximas requisições!

---

### 3. Usar o Token em Outras Requisições

#### 3.1. Salvar Token como Variável (Recomendado)

1. Na resposta do token, selecione o valor de `access_token`
2. Clique com botão direito → **"Set as variable"**
3. Nome da variável: `token`
4. Escopo: **Collection** ou **Environment**

#### 3.2. Usar o Token

Em qualquer nova requisição:

**Opção 1 - Aba Authorization:**

1. Vá em **"Authorization"**
2. Tipo: **"Bearer Token"**
3. Token: `{{token}}`

**Opção 2 - Aba Headers:**

1. Vá em **"Headers"**
2. Adicione:
   - Key: `Authorization`
   - Value: `Bearer {{token}}`

---

## 🔍 Exemplo: Consultar Conta

### Requisição GET - Consultar Saldo

- **Método**: `GET`
- **URL**: `https://cdpj-sandbox.partners.uatinter.co/banking/v2/conta`
- **Headers**:
  - `Authorization`: `Bearer {{token}}`
  - `x-conta-corrente`: `238899195`
  - `x-operador`: `43695150`

---

## ⚠️ Problemas Comuns

### Erro: "TLSV1_ALERT_UNKNOWN_CA" ou "EPROTO SSL routines:OPENSSL_internal:TLSV1_ALERT_UNKNOWN_CA"

**Este é o erro mais comum!** O servidor não reconhece a autoridade certificadora.

**Solução:**

1. **Use o certificado completo** que já foi criado: `certificado_completo.crt`

   - Este arquivo combina o certificado do cliente com o certificado CA
   - Localização: `Inter_API-Chave_e_Certificado/certificado_completo.crt`

2. **No Postman**, configure o certificado usando `certificado_completo.crt` (não use apenas `Inter API_Certificado.crt`)

3. Se ainda não funcionar, verifique se o arquivo `certificado_completo.crt` foi criado corretamente:

   ```bash
   ls -la inter_dados_api/Inter_API-Chave_e_Certificado/certificado_completo.crt
   ```

4. Se o arquivo não existir, crie manualmente combinando os certificados:
   ```bash
   cd inter_dados_api
   cat "Inter_API-Chave_e_Certificado/Inter API_Certificado.crt" "Certificado_Webhook/ca.crt" > "Inter_API-Chave_e_Certificado/certificado_completo.crt"
   ```

### Erro: "Certificate required" ou "SSL Certificate Error"

**Solução:**

- Verifique se configurou o certificado no Postman (Passo 1)
- **Use `certificado_completo.crt`** (não apenas o certificado do cliente)
- Confirme que os arquivos `.crt` e `.key` estão corretos
- Tente desabilitar temporariamente "SSL certificate verification" em Settings → General (apenas para teste)

### Erro: "invalid_client" ou "Unauthorized"

**Solução:**

- Verifique se `client_id` e `client_secret` estão corretos
- Confirme que está usando a URL do sandbox (não produção)
- Verifique se o Body está como `x-www-form-urlencoded` (não JSON)

### Erro: "invalid_scope"

**Solução:**

- Verifique se o `scope` está correto
- Tente usar apenas um escopo por vez primeiro: `boleto-cobranca.read`

### Erro: "Connection timeout"

**Solução:**

- Verifique sua conexão com a internet
- Confirme que a URL está correta
- Tente novamente após alguns segundos

---

## 🧪 Testar com cURL (Alternativa)

Se o Postman não funcionar, teste primeiro com cURL no terminal:

### Opção 1: Usar o Script de Teste (Recomendado)

Execute o script de teste fornecido:

```bash
cd inter_dados_api
./testar_oauth.sh
```

Este script verifica automaticamente se os certificados estão corretos e tenta obter o token.

### Opção 2: Comando cURL Manual

**⚠️ IMPORTANTE**: Use o certificado completo para evitar o erro "TLSV1_ALERT_UNKNOWN_CA":

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=330fb082-f5da-4aef-9d21-c020de8e23e0&client_secret=d6257e31-47a7-4ad0-934d-b4b7f93bc4f8&scope=boleto-cobranca.read&grant_type=client_credentials" \
  --cert "inter_dados_api/Inter_API-Chave_e_Certificado/certificado_completo.crt" \
  --key "inter_dados_api/Inter_API-Chave_e_Certificado/Inter API_Chave.key" \
  https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token
```

**Se funcionar no cURL mas não no Postman**: O problema está na configuração do certificado no Postman. Verifique novamente o Passo 1.

---

## ✅ Checklist Rápido

Antes de enviar a requisição, verifique:

- [ ] Certificado configurado no Postman usando `certificado_completo.crt` (Passo 1)
- [ ] Método: `POST`
- [ ] URL: `https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token`
- [ ] Header: `Content-Type: application/x-www-form-urlencoded`
- [ ] Body: `x-www-form-urlencoded` (NÃO JSON)
- [ ] Campos do Body preenchidos:
  - [ ] `client_id`: `330fb082-f5da-4aef-9d21-c020de8e23e0`
  - [ ] `client_secret`: `d6257e31-47a7-4ad0-934d-b4b7f93bc4f8`
  - [ ] `scope`: `boleto-cobranca.read` (ou outro)
  - [ ] `grant_type`: `client_credentials`

---

## 📝 Notas Importantes

1. **Certificado é obrigatório**: Sem o certificado configurado, a requisição não funcionará
2. **Token expira em 1 hora**: Após 3600 segundos, você precisará obter um novo token
3. **Ambiente Sandbox**: Esta configuração é para o ambiente de testes (sandbox), não produção
4. **Body deve ser x-www-form-urlencoded**: Não use JSON no Body da requisição OAuth

---

**Última atualização**: 2024  
**Ambiente**: Sandbox
