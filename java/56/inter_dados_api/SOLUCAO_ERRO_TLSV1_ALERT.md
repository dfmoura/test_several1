# 🔧 Solução para Erro: TLSV1_ALERT_UNKNOWN_CA

## ❌ Erro Encontrado

```
Error:write EPROTO 53824531096768:error:10000418:SSL routines:OPENSSL_internal:TLSV1_ALERT_UNKNOWN_CA
```

## ✅ Solução Aplicada

O erro ocorre porque o servidor do Banco Inter não reconhece a autoridade certificadora (CA). A solução é usar um **certificado completo** que inclui tanto o certificado do cliente quanto o certificado CA.

### Arquivo Criado

Foi criado automaticamente o arquivo:
- **`Inter_API-Chave_e_Certificado/certificado_completo.crt`**

Este arquivo combina:
- Certificado do cliente: `Inter API_Certificado.crt`
- Certificado CA: `Certificado_Webhook/ca.crt`

---

## 🚀 Como Usar no Postman

### Passo 1: Remover Certificado Antigo (se existir)

1. No Postman, vá em **Settings** → **Certificates**
2. Procure por `cdpj-sandbox.partners.uatinter.co`
3. Se existir, **delete** a entrada antiga

### Passo 2: Adicionar Certificado Completo

1. No Postman, vá em **Settings** → **Certificates**
2. Clique em **"Add Certificate"**
3. Configure:
   - **Host**: `cdpj-sandbox.partners.uatinter.co`
   - **Port**: `443` (ou deixe em branco)
   - **CRT file**: Selecione `certificado_completo.crt` da pasta `Inter_API-Chave_e_Certificado/`
   - **Key file**: Selecione `Inter API_Chave.key` da pasta `Inter_API-Chave_e_Certificado/`
   - **Passphrase**: Deixe em branco
4. Clique em **"Add"**

### Passo 3: Testar a Requisição

Agora tente novamente a requisição OAuth. O erro `TLSV1_ALERT_UNKNOWN_CA` deve estar resolvido.

---

## 🧪 Testar Antes de Usar no Postman

Execute o script de teste para verificar se funciona:

```bash
cd inter_dados_api
./testar_oauth.sh
```

Se o script funcionar, o problema está resolvido e você pode usar no Postman.

---

## 📝 Notas Importantes

- **Sempre use `certificado_completo.crt`** no Postman (não use apenas `Inter API_Certificado.crt`)
- O certificado completo já foi criado automaticamente
- Se precisar recriar o certificado completo:
  ```bash
  cd inter_dados_api
  cat "Inter_API-Chave_e_Certificado/Inter API_Certificado.crt" "Certificado_Webhook/ca.crt" > "Inter_API-Chave_e_Certificado/certificado_completo.crt"
  ```

---

**Status**: ✅ Certificado completo criado e pronto para uso

