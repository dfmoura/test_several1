#!/bin/bash

#############################################
# 1) OBTENDO TOKEN OAUTH
#############################################

URL_OAUTH="https://cdpj.partners.bancointer.com.br/oauth/v2/token"

D1="client_id=4397b5b7-c6cc-4cd9-912d-bb754d5052ee"
D2="client_secret=REDACTED"
D3="scope=cob.write"
D4="grant_type=client_credentials"
DADOS=$D1\&$D2\&$D3\&$D4

echo "Solicitando token OAuth..."
echo "--------------------------------------------"

OAUTH_TOKEN_RESPONSE=$(curl -s \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d $DADOS \
  $URL_OAUTH)

if [[ -z $OAUTH_TOKEN_RESPONSE ]]; then
  echo "Sem resposta do servico OAuth. Pode ser limite de chamadas."
  exit 1
fi

# Extrair access_token
LINHA_TOKEN=$(echo $OAUTH_TOKEN_RESPONSE | grep -o '"[^"]*"\s*:\s*"*[^,"]*"*' | \
grep -E '^"(access_token)"' | \
tr '\n' ',' | \
sed 's/,$//')

TOKEN=$(echo $LINHA_TOKEN | cut -c18-)

if [[ -z $TOKEN ]]; then
  echo "ERRO: não foi possível extrair o token!"
  echo "$OAUTH_TOKEN_RESPONSE"
  exit 1
fi

echo "TOKEN OBTIDO!"
echo "--------------------------------------------"


#############################################
# 2) GERAR PIX DE COBRANÇA (PUT /pix/v2/cob)
#############################################

TXID="TX123456789ABCDEFGH"   # << coloque o TXID desejado

URL_PIX="https://cdpj.partners.bancointer.com.br/pix/v2/cob/$TXID"

CORPO='{
  "calendario": {
    "expiracao": 3600
  },
  "devedor": {
    "cpf": "05816182625",
    "nome": "Diogo Ferreira Moura"
  },
  "valor": {
    "original": "2.50",
    "modalidadeAlteracao": 1
  },
  "chave": "7d9f0335-8dcc-4054-9bf9-0dbd61d36906",
  "solicitacaoPagador": "Serviço realizado.",
  "infoAdicionais": [
    {
      "nome": "Campo1",
      "valor": "Informação adicional"
    }
  ]
}'

echo "Criando cobrança PIX..."
echo "--------------------------------------------"

PIX_CRIADO=$(curl -s \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-conta-corrente: 238899195" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$CORPO" \
  $URL_PIX)

echo "Resposta da criação:"
echo "$PIX_CRIADO"
echo "--------------------------------------------"


#############################################
# 3) EXTRAIR A CHAVE PIX "COPIA E COLA"
#############################################

PIX_COPIA_COLA=$(echo "$PIX_CRIADO" | grep -oP '(?<="pixCopiaECola":")[^"]+')

echo
echo "============================================"
echo "        PIX — COPIA E COLA"
echo "--------------------------------------------"
echo "$PIX_COPIA_COLA"
echo "============================================"
echo

exit 0

