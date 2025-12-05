#!/bin/bash

URL_OAUTH="https://cdpj.partners.bancointer.com.br/oauth/v2/token"

# Dados fixos para OAuth
D1="client_id=4397b5b7-c6cc-4cd9-912d-bb754d5052ee"
D2="client_secret=79a407d2-f5ff-4db4-b42f-785c2a228e2d"
D3="scope=boleto-cobranca.write"
D4="grant_type=client_credentials"
DADOS="$D1&$D2&$D3&$D4"

# Solicitação do token
OAUTH_TOKEN_RESPONSE=$(curl \
  -s \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$DADOS" \
  "$URL_OAUTH")

# Verifica se houve resposta
if [[ -z "$OAUTH_TOKEN_RESPONSE" ]]; then
  echo "ERRO: Sem resposta do servidor OAuth." >&2
  exit 1
fi

# Extrai o token
TOKEN=$(echo "$OAUTH_TOKEN_RESPONSE" | grep -oP '(?<="access_token":")[^"]+')

# Verifica se conseguiu extrair
if [[ -z "$TOKEN" ]]; then
  echo "ERRO: Token não encontrado. Resposta completa:" >&2
  echo "$OAUTH_TOKEN_RESPONSE" >&2
  exit 1
fi

# Apenas imprime o token
echo "$TOKEN"
exit 0

