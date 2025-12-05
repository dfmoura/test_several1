#!/bin/bash

#############################################
# CONFIGURAÇÃO: Código de Solicitação
#############################################
# Preencha aqui o codigoSolicitacao da cobrança a ser cancelada
# Ou passe como parâmetro na linha de comando: ./cancelamento_cobranca1.sh <codigoSolicitacao>
CODIGO_SOLICITACAO="03bf179f-f2a7-4326-8581-ba1e20fdb76e"

#############################################
# 1) OBTENDO TOKEN OAUTH
#############################################

URL_OAUTH="https://cdpj.partners.bancointer.com.br/oauth/v2/token"

D1="client_id=4397b5b7-c6cc-4cd9-912d-bb754d5052ee"
D2="client_secret=REDACTED"
D3="scope=boleto-cobranca.write"
D4="grant_type=client_credentials"
DADOS="$D1&$D2&$D3&$D4"

echo "Solicitando token OAuth..."
echo "--------------------------------------------"

OAUTH_TOKEN_RESPONSE=$(curl -s \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$DADOS" \
  "$URL_OAUTH")

if [[ -z "$OAUTH_TOKEN_RESPONSE" ]]; then
  echo "ERRO: Sem resposta do servidor OAuth."
  exit 1
fi

TOKEN=$(echo "$OAUTH_TOKEN_RESPONSE" | grep -oP '(?<="access_token":")[^"]+')

if [[ -z "$TOKEN" ]]; then
  echo "ERRO: Token não encontrado!"
  echo "Resposta completa:"
  echo "$OAUTH_TOKEN_RESPONSE"
  exit 1
fi

echo "TOKEN OBTIDO COM SUCESSO!"
echo "--------------------------------------------"

#############################################
# 2) CANCELANDO A COBRANÇA
#############################################

# Se o codigoSolicitacao foi fornecido como parâmetro, usa o parâmetro
# Caso contrário, usa o valor definido na variável no início do script
if [[ -n "$1" ]]; then
  CODIGO_SOLICITACAO="$1"
fi

# Verifica se o codigoSolicitacao foi definido
if [[ -z "$CODIGO_SOLICITACAO" ]]; then
  echo "ERRO: É necessário informar o codigoSolicitacao."
  echo "Preencha a variável CODIGO_SOLICITACAO no início do script"
  echo "ou passe como parâmetro: $0 <codigoSolicitacao>"
  exit 1
fi

echo "Cancelando cobrança com codigoSolicitacao: $CODIGO_SOLICITACAO"
echo "--------------------------------------------"

URL_CANCELAR_COBRANCA="https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/$CODIGO_SOLICITACAO/cancelar"

CORPO=$(cat << 'EOF'
{ 
  "motivoCancelamento":"ACERTOS"
}
EOF
)

# Faz a requisição e captura tanto a resposta quanto o código HTTP
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-conta-corrente: 238899195" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$CORPO" \
  "$URL_CANCELAR_COBRANCA")

# Separa o corpo da resposta do código HTTP (última linha)
COBRANCA_CANCELADA=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "--------------------------------------------"
echo "Resposta do cancelamento:"
echo "$COBRANCA_CANCELADA"

# Verifica o código HTTP
if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "202" ]] || [[ "$HTTP_CODE" == "204" ]]; then
  echo "--------------------------------------------"
  echo "✓ CANCELAMENTO REALIZADO COM SUCESSO!"
  echo "  Código HTTP: $HTTP_CODE"
  echo "  Cobrança cancelada: $CODIGO_SOLICITACAO"
  echo "--------------------------------------------"
elif [[ "$HTTP_CODE" == "400" ]]; then
  echo "--------------------------------------------"
  echo "ERRO 400: Requisição inválida - verifique o formato do JSON"
  exit 1
elif [[ "$HTTP_CODE" == "401" ]]; then
  echo "--------------------------------------------"
  echo "ERRO 401: Não autorizado - verifique o token"
  exit 1
elif [[ "$HTTP_CODE" == "403" ]]; then
  echo "--------------------------------------------"
  echo "ERRO 403: Proibido - verifique permissões"
  exit 1
elif [[ "$HTTP_CODE" == "404" ]]; then
  echo "--------------------------------------------"
  echo "ERRO 404: Cobrança não encontrada - verifique o codigoSolicitacao"
  exit 1
elif [[ -n "$HTTP_CODE" ]]; then
  echo "--------------------------------------------"
  echo "ERRO $HTTP_CODE: Verifique a resposta acima"
  exit 1
fi

# Verifica se há mensagens de erro na resposta JSON
if echo "$COBRANCA_CANCELADA" | grep -qi "erro\|error"; then
  echo "--------------------------------------------"
  echo "ERRO: Falha no cancelamento. Verifique a resposta acima."
  exit 1
fi

exit 0

