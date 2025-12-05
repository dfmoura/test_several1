#!/bin/bash

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
  echo "$OAUTH_TOKEN_RESPONSE"
  exit 1
fi

echo "TOKEN OBTIDO COM SUCESSO!"
echo "--------------------------------------------"


#############################################
# 2) EMITIR COBRANÇA PIX
#############################################

URL_COBRANCA_PIX="https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas"

CORPO=$(cat << 'EOF'
{
  "seuNumero": "123998",
  "valorNominal": 2.5,
  "dataVencimento": "2025-12-20",
  "numDiasAgenda": 60,
  "pagador": {
    "email": "diogomou@gmail.com",
    "ddd": "31",
    "telefone": "999999999",
    "numero": "3456",
    "complemento": "apartamento 3 bloco 4",
    "cpfCnpj": "05816182625",
    "tipoPessoa": "FISICA",
    "nome": "diogo ferreira moura",
    "endereco": "Avenida Brasil, 1200",
    "bairro": "Centro",
    "cidade": "Belo Horizonte",
    "uf": "MG",
    "cep": "30110000"
  },
  "desconto": {
    "taxa": 3,
    "codigo": "PERCENTUALDATAINFORMADA",
    "quantidadeDias": 7
  },
  "multa": {
    "taxa": 2,
    "codigo": "PERCENTUAL"
  },
  "mora": {
    "taxa": 5,
    "codigo": "TAXAMENSAL"
  },
  "mensagem": {
    "linha1": "mensagem 1",
    "linha2": "mensagem 2",
    "linha3": "mensagem 3",
    "linha4": "mensagem 4",
    "linha5": "mensagem 5"
  },
  "beneficiarioFinal": {
    "cpfCnpj": "05816182625",
    "tipoPessoa": "FISICA",
    "nome": "Nome do beneficiário",
    "endereco": "Avenida Brasil, 1200",
    "bairro": "Centro",
    "cidade": "Belo Horizonte",
    "uf": "MG",
    "cep": "30110000"
  }
}
EOF
)

echo "Emitindo cobrança PIX..."
echo "--------------------------------------------"

COBRANCA_EMITIDA=$(curl -s \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-conta-corrente: 238899195" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  -d "$CORPO" \
  "$URL_COBRANCA_PIX")

echo "Resposta da emissão: $COBRANCA_EMITIDA"

# extrair codigoSolicitacao
CODIGO=$(echo "$COBRANCA_EMITIDA" | grep -oP '(?<="codigoSolicitacao":")[^"]+')

if [[ -z "$CODIGO" ]]; then
  echo "ERRO: Não foi possível extrair o codigoSolicitacao"
  exit 1
fi

echo "codigoSolicitacao: $CODIGO"
echo "--------------------------------------------"


#############################################
# 3) CONSULTAR COBRANÇA PARA OBTER PIX
#############################################

URL_CONSULTA="https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/$CODIGO"

echo "Consultando cobrança para obter a chave PIX..."
echo "--------------------------------------------"

DETALHES=$(curl -s \
  -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --cert inter_API_Certificado.crt \
  --key inter_API_Chave.key \
  "$URL_CONSULTA")

echo "Resposta da consulta: $DETALHES"

# extrair pixCopiaECola
CHAVE_PIX=$(echo "$DETALHES" | grep -oP '(?<="pixCopiaECola":")[^"]+')

echo
echo "============================================"
echo "       CHAVE PIX COPIA E COLA"
echo "--------------------------------------------"
echo "$CHAVE_PIX"
echo "============================================"
echo

exit 0
