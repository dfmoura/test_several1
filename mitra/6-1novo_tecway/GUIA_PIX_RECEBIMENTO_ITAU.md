# Guia Completo: Fluxo de PIX de Recebimento - API Itaú

## Índice
1. [Introdução](#introdução)
2. [Pré-requisitos](#pré-requisitos)
3. [Cenários de Acesso](#cenários-de-acesso)
4. [Passo a Passo: Credenciais e Certificado Dinâmico](#passo-a-passo-credenciais-e-certificado-dinâmico)
5. [Fluxo de PIX de Recebimento](#fluxo-de-pix-de-recebimento)
6. [Ambientes: Homologação vs Produção](#ambientes-homologação-vs-produção)
7. [Troubleshooting](#troubleshooting)
8. [Referências](#referências)

---

## Introdução

Este guia detalha o processo completo para configurar e implementar o fluxo de **PIX de Recebimento** utilizando a API do Itaú. O processo envolve a geração de credenciais, certificado dinâmico e a integração com os endpoints de PIX.

**Produtos relacionados:**
- PIX Indireto
- PISP (Payment Initiation Service Provider)
- Corban Digital
- Extrato (Account Statement)

**Referência oficial:** [https://devportal.itau.com.br/certificado-dinamico-credenciais](https://devportal.itau.com.br/certificado-dinamico-credenciais)

---

## Pré-requisitos

### Obrigatórios para todos os cenários:

1. **Produto contratado**: Ter pelo menos um dos produtos contratados:
   - PIX Indireto
   - PISP
   - Corban Digital
   - Extrato (Account Statement)
   - FX as a Service - Câmbio

2. **OpenSSL**: Versão 1.1.1 ou superior (recomendado pelo banco)
   - Verificar instalação: `openssl version`
   - Windows: Geralmente vem com Git Bash
   - Linux/macOS: Instalar via gerenciador de pacotes

3. **Ambiente de desenvolvimento**:
   - Java, C#, Python, PHP, cURL ou similar
   - Ou ferramentas como Postman, Insomnia

4. **Acesso ao Portal do Desenvolvedor Itaú**:
   - Conta criada no portal
   - Permissões adequadas (usuário administrador para gerar credenciais)

---

## Cenários de Acesso

### Cenário 1: Com Conta Itaú

**Vantagens:**
- Acesso direto ao Portal do Desenvolvedor
- Processo mais rápido de aprovação
- Suporte técnico direto

**Requisitos:**
- Conta corrente ou empresarial no Itaú
- CNPJ ativo (para empresas)
- Produto PIX contratado junto ao banco

**Processo:**
1. Acessar o Portal do Desenvolvedor com suas credenciais bancárias
2. Realizar login com conta Itaú
3. Seguir o fluxo padrão de geração de credenciais

---

### Cenário 2: Sem Conta Itaú

**Vantagens:**
- Não precisa ter conta no banco
- Acesso via cadastro independente

**Requisitos:**
- CNPJ válido
- Contrato comercial com Itaú para o produto desejado
- Cadastro no Portal do Desenvolvedor

**Processo:**
1. Criar conta no Portal do Desenvolvedor Itaú
2. Realizar cadastro com dados da empresa
3. Aguardar aprovação e contratação do produto
4. Seguir o fluxo padrão de geração de credenciais

**Importante:** Mesmo sem conta corrente, é necessário ter um contrato comercial ativo com o Itaú para o produto PIX.

---

## Passo a Passo: Credenciais e Certificado Dinâmico

### Etapa 1: Gerar Credenciais no Portal

#### 1.1 Acessar o Portal
- URL: https://devportal.itau.com.br
- Realizar login (com ou sem conta Itaú, conforme seu cenário)

#### 1.2 Navegar para Gestão de Credenciais
- No menu lateral esquerdo, clicar em **"Gestão de Credenciais"**
- **Importante:** Apenas usuários administradores podem gerar credenciais

#### 1.3 Escolher Ambiente

**Homologação:**
- Ambiente de testes
- Não utiliza valores reais
- Ideal para desenvolvimento e validação

**Produção:**
- Ambiente real
- Transações financeiras reais
- Requer aprovação e contrato ativo

#### 1.4 Gerar Credenciais
- Selecionar o ambiente desejado
- Clicar em "Gerar Credenciais"
- **Anotar e guardar com segurança:**
  - `client_id`
  - `client_secret`
  - `token temporário` (validade de 5 minutos)
  - `chave de sessão`

**⚠️ ATENÇÃO:**
- O `client_secret` é altamente sensível
- Guarde em local seguro (gerenciador de senhas, variáveis de ambiente)
- Nunca commite no código ou repositório

---

### Etapa 2: Gerar Certificado Dinâmico (CSR)

O Certificate Signing Request (CSR) é necessário para obter o certificado assinado pelo Itaú.

#### 2.1 Gerar Chave Privada e CSR

**Windows (Git Bash ou PowerShell):**

```bash
# Gerar chave privada
openssl genrsa -out private_key.pem 2048

# Gerar CSR (substitua CLIENT_ID pelo seu client_id)
openssl req -new -key private_key.pem -out certificate_request.csr -subj "/CN=SEU_CLIENT_ID/O=SUA_EMPRESA/C=BR"
```

**Linux/macOS:**

```bash
# Gerar chave privada
openssl genrsa -out private_key.pem 2048

# Gerar CSR
openssl req -new -key private_key.pem -out certificate_request.csr -subj "/CN=SEU_CLIENT_ID/O=SUA_EMPRESA/C=BR"
```

**⚠️ IMPORTANTE:**
- O Common Name (CN) do CSR **DEVE SER EXATAMENTE IGUAL** ao `client_id`
- Exemplo: Se `client_id = "abc123xyz"`, então `CN=abc123xyz`

#### 2.2 Validar o CSR (Opcional)

```bash
openssl req -in certificate_request.csr -text -noout
```

Verifique se o CN está correto.

#### 2.3 Ler o Conteúdo do CSR

```bash
# Windows/Linux/macOS
cat certificate_request.csr
```

O conteúdo deve estar no formato:
```
-----BEGIN CERTIFICATE REQUEST-----
...
-----END CERTIFICATE REQUEST-----
```

---

### Etapa 3: Enviar CSR para o STS Itaú

O Security Token Service (STS) do Itaú assinará seu CSR e retornará o certificado dinâmico.

#### 3.1 Preparar a Requisição

**Endpoint:**
```
POST https://sts.itau.com.br/seguranca/v1/certificado/solicitacao
```

**Headers:**
```
Authorization: Bearer {TOKEN_TEMPORARIO}
Content-Type: text/plain
```

**Body:**
Conteúdo completo do arquivo `.csr` (incluindo `-----BEGIN CERTIFICATE REQUEST-----` e `-----END CERTIFICATE REQUEST-----`)

#### 3.2 Exemplos de Implementação

**cURL:**
```bash
curl -X POST \
  https://sts.itau.com.br/seguranca/v1/certificado/solicitacao \
  -H "Authorization: Bearer SEU_TOKEN_TEMPORARIO" \
  -H "Content-Type: text/plain" \
  --data-binary "@certificate_request.csr"
```

**Python:**
```python
import requests

def enviar_csr(csr_path, token):
    url = "https://sts.itau.com.br/seguranca/v1/certificado/solicitacao"
    
    with open(csr_path, 'r') as f:
        csr_content = f.read()
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'text/plain'
    }
    
    response = requests.post(url, data=csr_content, headers=headers)
    
    if response.status_code == 200:
        # Extrair certificado (remover primeira linha "Secret:")
        certificado = response.text.split('\n', 1)[1]
        return certificado
    else:
        raise Exception(f"Erro: {response.status_code} - {response.text}")

# Uso
token = "SEU_TOKEN_TEMPORARIO"
certificado = enviar_csr("certificate_request.csr", token)

# Salvar certificado
with open("certificado_dinamico.crt", "w") as f:
    f.write(certificado)
```

**Java:**
```java
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class EnviarCSR {
    public static String enviarCSR(String csrPath, String token) throws Exception {
        URL url = new URL("https://sts.itau.com.br/seguranca/v1/certificado/solicitacao");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Content-Type", "text/plain");
        connection.setDoOutput(true);
        
        // Ler arquivo CSR
        String csrContent = new String(Files.readAllBytes(Paths.get(csrPath)), 
                                       StandardCharsets.UTF_8);
        
        // Enviar CSR
        try (OutputStream os = connection.getOutputStream()) {
            os.write(csrContent.getBytes(StandardCharsets.UTF_8));
        }
        
        // Ler resposta
        if (connection.getResponseCode() == 200) {
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line).append("\n");
            }
            
            // Extrair certificado (remover primeira linha "Secret:")
            String responseText = response.toString();
            String certificado = responseText.substring(responseText.indexOf("\n") + 1);
            return certificado;
        } else {
            throw new Exception("Erro: " + connection.getResponseCode());
        }
    }
}
```

**C#:**
```csharp
using System;
using System.IO;
using System.Net;
using System.Text;

public class EnviarCSR
{
    public static string SolicitarCertificado(string csrPath, string token)
    {
        var request = (HttpWebRequest)WebRequest.Create(
            "https://sts.itau.com.br/seguranca/v1/certificado/solicitacao");
        
        request.ContentType = "text/plain";
        request.Method = "POST";
        request.Headers.Add("Authorization", "Bearer " + token);
        
        string csrContent = File.ReadAllText(csrPath);
        
        using (var sw = new StreamWriter(request.GetRequestStream(), Encoding.ASCII))
        {
            sw.Write(csrContent);
        }
        
        var response = (HttpWebResponse)request.GetResponse();
        string responseText = new StreamReader(response.GetResponseStream()).ReadToEnd();
        
        // Extrair certificado (remover primeira linha "Secret:")
        string certificado = responseText.Substring(responseText.IndexOf("\n") + 1);
        
        return certificado;
    }
}
```

#### 3.3 Processar Resposta

A resposta do STS contém:
1. **Primeira linha:** `Secret: {CLIENT_SECRET}` (se ainda não tiver)
2. **Restante:** Certificado dinâmico no formato:
```
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```

**Salvar o certificado:**
- Nome sugerido: `certificado_dinamico.crt`
- Guardar junto com a chave privada (`private_key.pem`)

---

### Etapa 4: Renovar Token Temporário

O token temporário tem validade de **5 minutos**. Para renovar:

1. Acessar Portal do Desenvolvedor
2. Ir em "Gestão de Credenciais"
3. Selecionar ambiente (homologação/produção)
4. Gerar novo token temporário

**Importante:** O certificado dinâmico tem validade de **365 dias**. Após expirar, gere um novo usando o mesmo CSR ou um novo CSR.

---

## Fluxo de PIX de Recebimento

### Visão Geral

O fluxo de PIX de recebimento permite:
- Criar cobranças (QR Codes)
- Consultar cobranças
- Receber notificações de pagamento
- Consultar extratos

### Endpoints Principais

**Base URLs:**
- **Homologação:** `https://api.itau.com.br`
- **Produção:** `https://secure.api.itau.com.br` ou `https://secure.api.cloud.itau.com.br`

**Autenticação:**
- Todas as requisições requerem:
  - Certificado dinâmico (mutual TLS)
  - Token de acesso (OAuth 2.0)

### Passo 1: Obter Token de Acesso

**Endpoint:**
```
POST https://sts.itau.com.br/oauth/v2/token
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Body (form-urlencoded):**
```
grant_type=client_credentials
client_id={SEU_CLIENT_ID}
client_secret={SEU_CLIENT_SECRET}
scope=pix_recebimento
```

**Exemplo cURL:**
```bash
curl -X POST \
  https://sts.itau.com.br/oauth/v2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --cert certificado_dinamico.crt \
  --key private_key.pem \
  -d "grant_type=client_credentials" \
  -d "client_id=SEU_CLIENT_ID" \
  -d "client_secret=SEU_CLIENT_SECRET" \
  -d "scope=pix_recebimento"
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Passo 2: Criar Cobrança (QR Code)

**Endpoint:**
```
POST https://api.itau.com.br/pix_recebimento/v2/cob
```

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "calendario": {
    "expiracao": 3600
  },
  "devedor": {
    "cpf": "12345678900",
    "nome": "Nome do Pagador"
  },
  "valor": {
    "original": "100.00"
  },
  "chave": "sua-chave-pix@email.com",
  "solicitacaoPagador": "Pagamento de serviço"
}
```

**Exemplo cURL:**
```bash
curl -X POST \
  https://api.itau.com.br/pix_recebimento/v2/cob \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --cert certificado_dinamico.crt \
  --key private_key.pem \
  -d '{
    "calendario": {
      "expiracao": 3600
    },
    "devedor": {
      "cpf": "12345678900",
      "nome": "Nome do Pagador"
    },
    "valor": {
      "original": "100.00"
    },
    "chave": "sua-chave-pix@email.com",
    "solicitacaoPagador": "Pagamento de serviço"
  }'
```

**Resposta:**
```json
{
  "calendario": {
    "criacao": "2024-01-15T10:30:00Z",
    "expiracao": 3600
  },
  "txid": "E12345678202401151030123456789",
  "revisao": 0,
  "loc": {
    "id": 123456,
    "location": "pix.example.com/v2/cobv/E12345678202401151030123456789",
    "tipoCob": "cob"
  },
  "status": "ATIVA",
  "devedor": {
    "cpf": "12345678900",
    "nome": "Nome do Pagador"
  },
  "valor": {
    "original": "100.00"
  },
  "chave": "sua-chave-pix@email.com",
  "solicitacaoPagador": "Pagamento de serviço",
  "pixCopiaECola": "00020126580014br.gov.bcb.pix..."
}
```

### Passo 3: Consultar Cobrança

**Endpoint:**
```
GET https://api.itau.com.br/pix_recebimento/v2/cob/{txid}
```

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
```

**Exemplo cURL:**
```bash
curl -X GET \
  "https://api.itau.com.br/pix_recebimento/v2/cob/E12345678202401151030123456789" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  --cert certificado_dinamico.crt \
  --key private_key.pem
```

### Passo 4: Consultar Pagamentos

**Endpoint:**
```
GET https://api.itau.com.br/pix_recebimento/v2/pix
```

**Query Parameters:**
- `inicio`: Data inicial (formato: YYYY-MM-DD)
- `fim`: Data final (formato: YYYY-MM-DD)
- `txId`: ID da transação (opcional)

**Exemplo cURL:**
```bash
curl -X GET \
  "https://api.itau.com.br/pix_recebimento/v2/pix?inicio=2024-01-01&fim=2024-01-31" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  --cert certificado_dinamico.crt \
  --key private_key.pem
```

### Passo 5: Webhook (Notificações)

Configure o webhook no Portal do Desenvolvedor para receber notificações de pagamento.

**Endpoint de notificação (seu servidor):**
```
POST https://seu-servidor.com.br/webhook/pix
```

**Payload recebido:**
```json
{
  "endToEndId": "E12345678202401151030123456789",
  "txid": "E12345678202401151030123456789",
  "valor": "100.00",
  "horario": "2024-01-15T10:35:00Z",
  "infoPagador": "Pagamento recebido"
}
```

---

## Ambientes: Homologação vs Produção

### Homologação

**Características:**
- Ambiente de testes
- Não utiliza valores reais
- Ideal para desenvolvimento
- Validação de integração

**URLs:**
- STS: `https://sts.itau.com.br`
- API: `https://api.itau.com.br`

**Credenciais:**
- Geradas no Portal do Desenvolvedor
- Ambiente: "Homologação"

**Limitações:**
- Transações simuladas
- Não gera movimentação real
- Dados de teste

### Produção

**Características:**
- Ambiente real
- Transações financeiras reais
- Requer aprovação comercial

**URLs:**
- STS: `https://sts.itau.com.br`
- API: `https://secure.api.itau.com.br` ou `https://secure.api.cloud.itau.com.br`

**Credenciais:**
- Geradas no Portal do Desenvolvedor
- Ambiente: "Produção"
- Requer contrato ativo

**Requisitos:**
- Contrato comercial assinado
- Produto PIX contratado
- Aprovação do Itaú

**⚠️ ATENÇÃO:**
- Certificado dinâmico válido por 365 dias
- Renovação permitida 60 dias antes do vencimento
- Guarde backup do certificado e chave privada

---

## Troubleshooting

### Erros Comuns e Soluções

#### C100: Ausência do certificado na chamada
**Causa:** Certificado não está sendo enviado na requisição.

**Solução:**
- Verificar se o certificado está sendo enviado corretamente
- Em cURL: usar `--cert` e `--key`
- Em código: configurar cliente HTTP com certificado

#### C200: Certificado inválido
**Causa:** Certificado corrompido ou formato incorreto.

**Solução:**
- Validar formato do certificado
- Verificar se está completo (BEGIN/END)
- Regenerar certificado se necessário

#### C300: Falha ao extrair dados do certificado
**Causa:** Certificado não foi emitido corretamente.

**Solução:**
- Verificar se o CSR foi enviado corretamente
- Validar resposta do STS
- Regenerar certificado

#### C400: Cadeia certificadora inválida
**Causa:** Certificado não foi emitido pelo STS do Itaú.

**Solução:**
- Usar apenas certificados gerados via STS Itaú
- Não usar certificados de terceiros

#### C500: Certificado expirado
**Causa:** Certificado passou da validade de 365 dias.

**Solução:**
- Gerar novo certificado
- Usar CSR existente ou criar novo

#### C600: Common Name (CN) inválido
**Causa:** CN do certificado não corresponde ao `client_id`.

**Solução:**
- Verificar se o CN do CSR é exatamente igual ao `client_id`
- Regenerar CSR com CN correto

#### C700/C700a: Certificado ainda válido
**Causa:** Tentativa de renovar certificado antes dos 60 dias.

**Solução:**
- Aguardar 60 dias antes do vencimento
- Usar certificado atual

#### C800: CSR inválido
**Causa:** Formato ou conteúdo do CSR incorreto.

**Solução:**
- Validar formato do CSR
- Verificar se está completo
- Regenerar CSR

#### C800a: CN do CSR inválido
**Causa:** CN do CSR não corresponde ao `client_id`.

**Solução:**
- Verificar `client_id`
- Regenerar CSR com CN correto

#### C800b: Limite de certificados excedido
**Causa:** Muitas tentativas com o mesmo token.

**Solução:**
- Gerar novo token temporário
- Tentar novamente

#### Token expirado
**Causa:** Token temporário expirou (5 minutos).

**Solução:**
- Gerar novo token no Portal
- Usar imediatamente

#### Erro 401: Não autorizado
**Causa:** Token inválido ou expirado.

**Solução:**
- Verificar token de acesso
- Renovar token se necessário
- Verificar credenciais

#### Erro 403: Proibido
**Causa:** Permissões insuficientes.

**Solução:**
- Verificar permissões no Portal
- Contatar suporte se necessário

---

## Referências

### Documentação Oficial
- [Portal do Desenvolvedor Itaú](https://devportal.itau.com.br)
- [Certificado Dinâmico e Credenciais](https://devportal.itau.com.br/certificado-dinamico-credenciais)
- [API PIX Recebimento](https://devportal.itau.com.br/api/pix-recebimento)

### Suporte
- **Portal:** Formulário "Fale Conosco" no Portal do Desenvolvedor
- **Comercial:** Contatar representante comercial Itaú
- **Técnico:** Time de Implantação Técnica

### Ferramentas Úteis
- **OpenSSL:** [https://www.openssl.org/](https://www.openssl.org/)
- **Postman:** [https://www.postman.com/](https://www.postman.com/)
- **cURL:** [https://curl.se/](https://curl.se/)

---

## Checklist Final

Antes de ir para produção, verifique:

- [ ] Credenciais geradas (client_id e client_secret)
- [ ] Certificado dinâmico gerado e válido
- [ ] Chave privada guardada com segurança
- [ ] Token de acesso funcionando
- [ ] Testes em homologação concluídos
- [ ] Webhook configurado (se aplicável)
- [ ] Tratamento de erros implementado
- [ ] Logs e monitoramento configurados
- [ ] Contrato comercial assinado (produção)
- [ ] Documentação da integração atualizada

---

**Última atualização:** Janeiro 2025

**Versão:** 1.0

