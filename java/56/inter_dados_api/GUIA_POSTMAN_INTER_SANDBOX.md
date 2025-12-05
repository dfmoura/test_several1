# Guia Passo a Passo - Requisições API Banco Inter via Postman (Sandbox)

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

1. **Postman instalado** (versão mais recente recomendada)
2. **Credenciais da aplicação Inter**:
   - `clientId`: 330fb082-f5da-4aef-9d21-c020de8e23e0
   - `clientSecret`: d6257e31-47a7-4ad0-934d-b4b7f93bc4f8
3. **Certificado e chave privada** (arquivos .crt e .key) - necessários para autenticação

---

## 🔐 PASSO 1: Obter Token OAuth (Autenticação)

O token OAuth é necessário para fazer qualquer requisição na API do Banco Inter. Ele tem validade de 60 minutos.

### Configuração no Postman:

#### 1.1. Criar Nova Requisição

- Clique em **"New"** → **"HTTP Request"**
- Nomeie como: `Obter Token OAuth - Sandbox`

#### 1.2. Configurar Método e URL

- **Método**: Selecione **POST**
- **URL**: `https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token`

#### 1.3. Configurar Headers (Cabeçalhos)

Na aba **"Headers"**, adicione:

| Key            | Value                               |
| -------------- | ----------------------------------- |
| `Content-Type` | `application/x-www-form-urlencoded` |

#### 1.4. Configurar Body (Corpo da Requisição)

1. Vá para a aba **"Body"**
2. Selecione a opção **"x-www-form-urlencoded"**
3. Adicione os seguintes campos:

| Key             | Value                                           |
| --------------- | ----------------------------------------------- |
| `client_id`     | `330fb082-f5da-4aef-9d21-c020de8e23e0`          |
| `client_secret` | `d6257e31-47a7-4ad0-934d-b4b7f93bc4f8`          |
| `scope`         | `boleto-cobranca.read` (ou o escopo necessário) |
| `grant_type`    | `client_credentials`                            |

**⚠️ IMPORTANTE**:

- O campo `scope` define quais permissões você precisa. Exemplos:
  - `boleto-cobranca.read` - Leitura de boletos
  - `boleto-cobranca.write` - Criação de boletos
  - `pix.read` - Leitura de Pix
  - `pix.write` - Escrita de Pix
  - Você pode usar múltiplos escopos separados por espaço: `boleto-cobranca.read pix.read`

#### 1.5. Configurar Certificado (CRÍTICO - Esta é a parte mais importante!)

A API do Banco Inter requer autenticação via certificado SSL. Esta é a etapa que mais causa problemas!

**⚠️ ATENÇÃO**: O Postman tem algumas limitações com certificados. Se não funcionar, veja a alternativa no final desta seção.

### Método 1: Configurar Certificado no Postman (Recomendado)

1. No Postman, clique no ícone de **"Settings"** (⚙️) no canto superior direito
2. Ou vá em **File → Settings** (ou **Postman → Settings** no Mac)
3. Na barra lateral esquerda, clique em **"Certificates"**
4. Clique no botão **"Add Certificate"**
5. Configure os seguintes campos:

   - **Host**: `cdpj-sandbox.partners.uatinter.co`
   - **Port**: `443` (deixe em branco ou 443)
   - **CRT file**: Clique em **"Select File"** e escolha seu arquivo de certificado (`.crt`, `.pem` ou `.cer`)
   - **Key file**: Clique em **"Select File"** e escolha seu arquivo de chave privada (`.key`)
   - **Passphrase**: Deixe em branco (a menos que seu certificado tenha senha)

6. Clique em **"Add"**

**🔍 Onde encontrar os certificados?**

- Os certificados geralmente são fornecidos pelo Banco Inter quando você cria a aplicação
- Procure nas pastas: `Inter_API-Chave_e_Certificado/` ou `Certificado_Webhook/`
- Se não tiver os certificados, você precisa solicitá-los ao Banco Inter através do portal de desenvolvedores

### Método 2: Usar Certificado na Requisição Individual (Alternativa)

Se o método acima não funcionar:

1. Na sua requisição, vá para a aba **"Settings"** (dentro da requisição)
2. Role até **"Client Certificates"**
3. Clique em **"Add Certificate"**
4. Configure:
   - **Host**: `cdpj-sandbox.partners.uatinter.co`
   - **Certificate File**: Selecione o arquivo `.crt` ou `.pem`
   - **Key File**: Selecione o arquivo `.key`
   - **Passphrase**: (deixe em branco se não tiver)

### Método 3: Testar com cURL Primeiro (Recomendado para Debug)

Antes de tentar no Postman, teste se o certificado funciona usando o terminal:

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=330fb082-f5da-4aef-9d21-c020de8e23e0&client_secret=d6257e31-47a7-4ad0-934d-b4b7f93bc4f8&scope=boleto-cobranca.read&grant_type=client_credentials" \
  --cert caminho/para/seu/certificado.crt \
  --key caminho/para/sua/chave.key \
  https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token
```

Se funcionar no cURL mas não no Postman, o problema está na configuração do Postman.

### ⚠️ Problemas Comuns com Certificados:

**Erro: "Certificate file is invalid"**

- Verifique se o arquivo `.crt` não está corrompido
- Tente converter o certificado para formato PEM: `openssl x509 -in certificado.crt -out certificado.pem`

**Erro: "Key file is invalid"**

- Verifique se o arquivo `.key` corresponde ao certificado
- Certifique-se de que a chave privada não está protegida por senha (ou informe a senha correta)

**Erro: "SSL handshake failed"**

- Verifique se o certificado é válido e não expirou
- Confirme que está usando o certificado do ambiente **sandbox** (não produção)
- Tente desabilitar temporariamente a verificação SSL em Settings → General → "SSL certificate verification" (apenas para testes de diagnóstico)

#### 1.6. Enviar Requisição

1. Clique no botão **"Send"**
2. Aguarde a resposta

### Resposta Esperada (Sucesso):

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "boleto-cobranca.read"
}
```

### ⚠️ Problemas Comuns e Soluções:

#### Erro: "Certificate required" ou "SSL Certificate Error"

**Solução**:

- Verifique se o certificado está configurado corretamente no Postman
- Certifique-se de que os arquivos `.crt` e `.key` estão corretos
- Tente desabilitar temporariamente a verificação SSL em Settings → General → "SSL certificate verification" (apenas para testes)

#### Erro: "invalid_client" ou "Unauthorized"

**Solução**:

- Verifique se o `client_id` e `client_secret` estão corretos
- Confirme que está usando a URL do ambiente **sandbox** (não produção)
- Verifique se os campos no Body estão como `x-www-form-urlencoded` (não JSON)

#### Erro: "invalid_scope"

**Solução**:

- Verifique se o `scope` informado está correto
- Confirme que sua aplicação tem permissão para o escopo solicitado
- Tente usar apenas um escopo por vez primeiro

#### Erro: "Connection timeout" ou "Network error"

**Solução**:

- Verifique sua conexão com a internet
- Confirme que a URL está correta: `https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token`
- Tente novamente após alguns segundos

---

## 📝 PASSO 2: Usar o Token em Outras Requisições

Após obter o token, você precisa usá-lo em todas as requisições subsequentes.

### 2.1. Salvar o Token como Variável (Recomendado)

1. Na resposta do Passo 1, selecione o valor do `access_token`
2. Clique com o botão direito → **"Set as variable"**
3. Crie uma variável chamada `token` (ou `access_token`)
4. Escopo: **Collection** ou **Environment** (recomendado)

### 2.2. Usar o Token em Requisições

Em qualquer requisição subsequente:

1. Vá para a aba **"Authorization"**
2. Selecione **"Bearer Token"** no tipo
3. No campo Token, digite: `{{token}}` (ou o nome da variável que você criou)

**OU**

1. Vá para a aba **"Headers"**
2. Adicione:
   - **Key**: `Authorization`
   - **Value**: `Bearer {{token}}`

---

## 🧪 PASSO 3: Exemplo - Consultar Cobrança Pix

Agora que você tem o token, vamos fazer uma requisição real:

### 3.1. Criar Nova Requisição

- **Método**: `GET`
- **URL**: `https://cdpj-sandbox.partners.uatinter.co/pix/v2/cob?inicio=2024-01-01T00:00:00Z&fim=2024-12-31T23:59:59Z`

### 3.2. Configurar Headers

- **Authorization**: `Bearer {{token}}`
- **x-conta-corrente**: `238899195` (sua conta, se necessário)

### 3.3. Enviar Requisição

- Clique em **"Send"**

---

## 📚 Escopos Disponíveis

Dependendo do que você precisa fazer, use os seguintes escopos:

| Escopo                  | Descrição                          |
| ----------------------- | ---------------------------------- |
| `boleto-cobranca.read`  | Ler informações de boletos         |
| `boleto-cobranca.write` | Criar e modificar boletos          |
| `pix.read`              | Consultar Pix recebidos            |
| `pix.write`             | Criar cobranças Pix                |
| `cob.read`              | Consultar cobranças imediatas      |
| `cob.write`             | Criar cobranças imediatas          |
| `cobv.read`             | Consultar cobranças com vencimento |
| `cobv.write`            | Criar cobranças com vencimento     |
| `webhook.read`          | Consultar webhooks                 |
| `webhook.write`         | Criar/modificar webhooks           |

**Para múltiplos escopos**, separe por espaço:

```
boleto-cobranca.read pix.read cob.read
```

---

## 🔄 Dica: Criar Collection no Postman

Para organizar melhor:

1. Crie uma **Collection** chamada "Banco Inter - Sandbox"
2. Adicione todas as requisições nesta collection
3. Configure variáveis na collection:
   - `base_url`: `https://cdpj-sandbox.partners.uatinter.co`
   - `client_id`: `330fb082-f5da-4aef-9d21-c020de8e23e0`
   - `client_secret`: `d6257e31-47a7-4ad0-934d-b4b7f93bc4f8`
   - `token`: (será preenchido automaticamente)

Assim, você pode usar `{{base_url}}/oauth/v2/token` nas URLs.

---

## ✅ Checklist Final

Antes de enviar a requisição, verifique:

- [ ] Método HTTP está correto (POST para OAuth)
- [ ] URL está correta (sandbox, não produção)
- [ ] Headers estão configurados (`Content-Type: application/x-www-form-urlencoded`)
- [ ] Body está como `x-www-form-urlencoded` (não JSON)
- [ ] Todos os campos do Body estão preenchidos (client_id, client_secret, scope, grant_type)
- [ ] Certificado SSL está configurado no Postman
- [ ] Certificado corresponde ao ambiente sandbox

---

## 🆘 Ainda com Problemas? - Troubleshooting Detalhado

### Passo a Passo de Diagnóstico:

#### 1. Verificar Logs Detalhados

- No Postman, vá em **View → Show Postman Console** (ou pressione `Ctrl+Alt+C` / `Cmd+Alt+C`)
- Envie a requisição novamente e observe os logs
- Procure por mensagens de erro relacionadas a SSL, certificado ou autenticação

#### 2. Verificar Certificados

Execute no terminal para verificar se os certificados existem e são válidos:

```bash
# Verificar se o certificado existe
ls -la Inter_API-Chave_e_Certificado/
ls -la Certificado_Webhook/

# Verificar informações do certificado (se tiver)
openssl x509 -in certificado.crt -text -noout

# Verificar se a chave privada corresponde ao certificado
openssl x509 -noout -modulus -in certificado.crt | openssl md5
openssl rsa -noout -modulus -in chave.key | openssl md5
# Se os hashes MD5 forem iguais, os arquivos correspondem
```

#### 3. Testar com cURL (Método Mais Confiável)

Se você tem os certificados, teste primeiro com cURL para confirmar que funcionam:

```bash
# Substitua os caminhos pelos seus arquivos reais
curl -v -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=330fb082-f5da-4aef-9d21-c020de8e23e0&client_secret=d6257e31-47a7-4ad0-934d-b4b7f93bc4f8&scope=boleto-cobranca.read&grant_type=client_credentials" \
  --cert inter_dados_api/Inter_API-Chave_e_Certificado/certificado.crt \
  --key inter_dados_api/Inter_API-Chave_e_Certificado/chave.key \
  https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token
```

**Se o cURL funcionar mas o Postman não:**

- O problema está na configuração do Postman
- Tente reinstalar o Postman
- Tente usar o Postman Desktop (não a versão web)

#### 4. Verificar Credenciais

Confirme que está usando as credenciais corretas:

- `clientId`: `330fb082-f5da-4aef-9d21-c020de8e23e0`
- `clientSecret`: `d6257e31-47a7-4ad0-934d-b4b7f93bc4f8`
- URL: `https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token` (sandbox, não produção)

#### 5. Verificar Formato dos Dados

Certifique-se de que:

- O Body está como `x-www-form-urlencoded` (NÃO JSON)
- Todos os campos estão preenchidos
- Não há espaços extras nos valores

#### 6. Problemas Específicos do Postman

**Postman não reconhece o certificado:**

- Tente converter o certificado para formato PEM:
  ```bash
  openssl x509 -in certificado.crt -out certificado.pem
  ```
- Use o arquivo `.pem` no Postman

**Erro "Unable to verify the first certificate":**

- Em Settings → General, desabilite temporariamente "SSL certificate verification"
- ⚠️ **ATENÇÃO**: Isso é apenas para diagnóstico. Reative após identificar o problema.

**Postman trava ao adicionar certificado:**

- Feche e reabra o Postman
- Tente adicionar o certificado em uma requisição individual (não nas configurações globais)

#### 7. Alternativa: Usar Postman Collection com Scripts

Se nada funcionar, você pode:

1. Criar uma requisição que usa o certificado via script
2. Ou usar o Postman Runner com variáveis de ambiente
3. Ou considerar usar outra ferramenta como Insomnia ou HTTPie

#### 8. Contatar Suporte

Se após todos esses passos ainda não funcionar:

1. Documente todos os erros que aparecem
2. Capture screenshots das configurações
3. Teste com cURL e documente o resultado
4. Entre em contato com o suporte do Banco Inter fornecendo:
   - Mensagens de erro completas
   - Versão do Postman
   - Sistema operacional
   - Resultado do teste com cURL

---

## 📖 Referências

- Documentação completa: `documentacao_api_recebimento.txt`
- Exemplo de script: `exemplo.txt`
- Credenciais: `Integracao_api_inter.txt`

---

**Última atualização**: Baseado na documentação disponível em 2024
**Ambiente**: Sandbox (https://cdpj-sandbox.partners.uatinter.co)
