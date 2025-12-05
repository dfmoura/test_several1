#!/bin/bash

#############################################
# CONFIGURAÇÃO: Código de Solicitação
#############################################
# Preencha aqui o codigoSolicitacao da cobrança a ser cancelada
# Ou passe como parâmetro na linha de comando: ./cancelamento_cobranca.sh <codigoSolicitacao>
CODIGO_SOLICITACAO="a36ed4f4-8e32-4f4e-b232-1fc8a8148f14"

#############################################
# 1) OBTENDO TOKEN OAUTH
#############################################

URL_OAUTH="https://cdpj.partners.bancointer.com.br/oauth/v2/token"

D1="client_id=4397b5b7-c6cc-4cd9-912d-bb754d5052ee"
D2="client_secret=79a407d2-f5ff-4db4-b42f-785c2a228e2d"
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

# Formato JSON exatamente como no cancelamento.txt original
CORPO=$(cat << 'EOF'
{ 
  "motivoCancelamento":"ACERTOS"
}
EOF
)

# Versão minificada do JSON (para teste alternativo)
CORPO_MINIFICADO='{"motivoCancelamento":"ACERTOS"}'

echo "Enviando requisição de cancelamento..."
echo "URL: $URL_CANCELAR_COBRANCA"
echo "Corpo JSON:"
echo "$CORPO"
echo "Token (primeiros 20 chars): ${TOKEN:0:20}..."
echo "Token completo (últimos 20 chars): ...${TOKEN: -20}"
echo "Conta corrente: 238899195"
echo "--------------------------------------------"

# Verifica se o JSON está correto
echo "Verificando formato do JSON..."
echo "$CORPO" | jq . > /dev/null 2>&1
if [[ $? -eq 0 ]]; then
  echo "✓ JSON válido"
else
  echo "⚠ ATENÇÃO: JSON pode estar mal formatado"
fi
echo "--------------------------------------------"

# Primeiro, vamos testar sem verbose para ver a resposta limpa
echo "Enviando requisição (modo silencioso)..."
COBRANCA_CANCELADA=$(curl \
  --silent \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-conta-corrente: 238899195" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$CORPO" \
  "$URL_CANCELAR_COBRANCA")

echo "Resposta do servidor (modo silencioso):"
echo "$COBRANCA_CANCELADA"
echo "--------------------------------------------"

# Se a primeira tentativa falhar, tenta com JSON minificado
if [[ -z "$COBRANCA_CANCELADA" ]] || echo "$COBRANCA_CANCELADA" | grep -qi "erro\|error\|400\|invalid"; then
  echo "Tentando com JSON minificado..."
  COBRANCA_CANCELADA=$(curl \
    --silent \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "x-conta-corrente: 238899195" \
    --cert inter_API_Certificado.crt \
    --key inter_API_Chave.key \
    -d "$CORPO_MINIFICADO" \
    "$URL_CANCELAR_COBRANCA")
  echo "Resposta com JSON minificado:"
  echo "$COBRANCA_CANCELADA"
  echo "--------------------------------------------"
fi

# Agora com verbose para debug detalhado
echo "Enviando requisição novamente (modo verbose para debug)..."
COBRANCA_CANCELADA_VERBOSE=$(curl \
  -v \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-conta-corrente: 238899195" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$CORPO" \
  "$URL_CANCELAR_COBRANCA" 2>&1)

echo "--------------------------------------------"
echo "DEBUG VERBOSE - Detalhes completos da requisição:"
echo "$COBRANCA_CANCELADA_VERBOSE"
echo "--------------------------------------------"

# Extrai o status HTTP
HTTP_STATUS=$(echo "$COBRANCA_CANCELADA_VERBOSE" | grep -iE "< HTTP/[0-9]" | tail -1)
if [[ -n "$HTTP_STATUS" ]]; then
  echo "Status HTTP: $HTTP_STATUS"
else
  echo "Status HTTP: Não encontrado no verbose"
fi

# Tenta extrair código de status numérico
HTTP_CODE=$(echo "$COBRANCA_CANCELADA_VERBOSE" | grep -oE "HTTP/[0-9.]+ [0-9]{3}" | tail -1 | grep -oE "[0-9]{3}$")
if [[ -n "$HTTP_CODE" ]]; then
  echo "Código HTTP: $HTTP_CODE"
  if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "202" ]] || [[ "$HTTP_CODE" == "204" ]]; then
    echo "✓ SUCESSO! Cancelamento processado com sucesso!"
    echo "  HTTP $HTTP_CODE = Requisição aceita e processada"
  elif [[ "$HTTP_CODE" == "400" ]]; then
    echo "✗ ERRO 400: Requisição inválida - verifique o formato do JSON"
  elif [[ "$HTTP_CODE" == "401" ]]; then
    echo "✗ ERRO 401: Não autorizado - verifique o token"
  elif [[ "$HTTP_CODE" == "403" ]]; then
    echo "✗ ERRO 403: Proibido - verifique permissões"
  elif [[ "$HTTP_CODE" == "404" ]]; then
    echo "✗ ERRO 404: Cobrança não encontrada - verifique o codigoSolicitacao"
  else
    echo "✗ ERRO $HTTP_CODE: Verifique a resposta acima"
  fi
fi

# Extrai apenas o corpo da resposta (JSON)
RESPOSTA_JSON=$(echo "$COBRANCA_CANCELADA" | grep -E "^{|^\[" | head -20)
if [[ -n "$RESPOSTA_JSON" ]]; then
  echo "--------------------------------------------"
  echo "Corpo JSON da resposta:"
  echo "$RESPOSTA_JSON"
  echo "--------------------------------------------"
elif [[ "$HTTP_CODE" == "202" ]] || [[ "$HTTP_CODE" == "204" ]]; then
  echo "--------------------------------------------"
  echo "Resposta vazia (normal para HTTP $HTTP_CODE - operação aceita)"
  echo "--------------------------------------------"
else
  echo "--------------------------------------------"
  echo "ATENÇÃO: Não foi possível extrair JSON da resposta"
  echo "Resposta completa:"
  echo "$COBRANCA_CANCELADA"
  echo "--------------------------------------------"
fi

# Verifica se houve erro na resposta (mas ignora se for 202/204 com resposta vazia)
if [[ -z "$COBRANCA_CANCELADA" ]] && [[ "$HTTP_CODE" != "202" ]] && [[ "$HTTP_CODE" != "204" ]]; then
  echo "ERRO: Sem resposta do servidor."
  exit 1
fi

# Verifica se há mensagens de erro na resposta
if echo "$COBRANCA_CANCELADA" | grep -qi "erro\|error\|ocorreu um erro\|não foi possível"; then
  echo "ERRO: Falha no cancelamento. Verifique a resposta acima."
  exit 1
fi

# Verifica se o cancelamento foi bem-sucedido
if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "202" ]] || [[ "$HTTP_CODE" == "204" ]]; then
  echo "--------------------------------------------"
  echo "✓ CANCELAMENTO REALIZADO COM SUCESSO!"
  echo "  Código HTTP: $HTTP_CODE"
  echo "  Cobrança cancelada: $CODIGO_SOLICITACAO"
  echo "--------------------------------------------"
elif echo "$COBRANCA_CANCELADA" | grep -qi "cancelada\|sucesso\|ok"; then
  echo "Cancelamento processado com sucesso!"
else
  echo "ATENÇÃO: Verifique a resposta acima para confirmar o status do cancelamento."
fi

exit 0

