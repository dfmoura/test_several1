#!/bin/bash

# Script de teste para obter token OAuth do Banco Inter
# Execute este script para verificar se os certificados estão funcionando

echo "=========================================="
echo "Teste de Autenticação OAuth - Banco Inter"
echo "=========================================="
echo ""

# Caminhos dos certificados
# Usando o certificado completo que inclui a cadeia CA
CERTIFICADO_COMPLETO="Inter_API-Chave_e_Certificado/certificado_completo.crt"
CERTIFICADO_SIMPLES="Inter_API-Chave_e_Certificado/Inter API_Certificado.crt"
CHAVE="Inter_API-Chave_e_Certificado/Inter API_Chave.key"
CA_CERT="Certificado_Webhook/ca.crt"

# Verificar se o certificado completo existe, senão criar
if [ ! -f "$CERTIFICADO_COMPLETO" ]; then
    echo "⚠️  Certificado completo não encontrado. Criando..."
    if [ -f "$CERTIFICADO_SIMPLES" ] && [ -f "$CA_CERT" ]; then
        cat "$CERTIFICADO_SIMPLES" "$CA_CERT" > "$CERTIFICADO_COMPLETO"
        echo "✓ Certificado completo criado"
    else
        echo "❌ ERRO: Não foi possível criar o certificado completo"
        exit 1
    fi
fi

CERTIFICADO="$CERTIFICADO_COMPLETO"
URL="https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token"

# Credenciais
CLIENT_ID="330fb082-f5da-4aef-9d21-c020de8e23e0"
CLIENT_SECRET="REDACTED"
SCOPE="boleto-cobranca.read"

# Verificar se os arquivos existem
if [ ! -f "$CERTIFICADO" ]; then
    echo "❌ ERRO: Certificado completo não encontrado: $CERTIFICADO"
    exit 1
fi

if [ ! -f "$CHAVE" ]; then
    echo "❌ ERRO: Chave privada não encontrada: $CHAVE"
    exit 1
fi

echo "✓ Certificados encontrados"
echo ""

# Fazer a requisição
echo "Enviando requisição OAuth..."
echo ""

RESPOSTA=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=$SCOPE&grant_type=client_credentials" \
  --cert "$CERTIFICADO" \
  --key "$CHAVE" \
  "$URL")

# Separar corpo da resposta e código HTTP
HTTP_CODE=$(echo "$RESPOSTA" | tail -n1)
BODY=$(echo "$RESPOSTA" | sed '$d')

echo "Código HTTP: $HTTP_CODE"
echo ""
echo "Resposta:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCESSO! Token obtido com sucesso."
    echo ""
    echo "Agora você pode usar este token no Postman."
    echo "Copie o valor de 'access_token' da resposta acima."
else
    echo "❌ ERRO: Falha na autenticação (Código: $HTTP_CODE)"
    echo ""
    echo "Verifique:"
    echo "  - Se os certificados estão corretos"
    echo "  - Se as credenciais (client_id e client_secret) estão corretas"
    echo "  - Se está usando a URL do ambiente sandbox"
fi

