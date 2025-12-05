#!/bin/bash

# Script para gerenciar Links de Pagamento da Rede
# Funcionalidades: Criar, Consultar e Cancelar links de pagamento

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

# Credenciais da API
CLIENT_ID="90399908"
CLIENT_SECRET="f774e8447758453e839f4c73adfcf5e4"

# Ambiente (sandbox ou production)
# IMPORTANTE: As credenciais fornecidas podem ser apenas para sandbox
# Se receber erro 401, tente alterar para "sandbox"
ENVIRONMENT="sandbox"

# URLs base dos ambientes
if [ "$ENVIRONMENT" = "sandbox" ]; then
    BASE_URL="https://payments-apisandbox.useredecloud.com.br/payment-link"
    OAUTH_URL="https://api.userede.com.br/redelabs/oauth2/token"
else
    BASE_URL="https://payments-api.useredecloud.com.br/payment-link"
    OAUTH_URL="https://api.userede.com.br/redelabs/oauth2/token"
fi

# Arquivo temporário para armazenar o token
TOKEN_FILE="/tmp/rede_token_$$.tmp"

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

# Função para obter token de autenticação OAuth 2.0
obter_token() {
    echo "🔐 Obtendo token de autenticação..." >&2
    
    # Codifica client_id:client_secret em base64
    if command -v base64 >/dev/null 2>&1; then
        if base64 --version 2>&1 | grep -q GNU; then
            CREDENTIALS=$(echo -n "${CLIENT_ID}:${CLIENT_SECRET}" | base64 -w 0)
        else
            CREDENTIALS=$(echo -n "${CLIENT_ID}:${CLIENT_SECRET}" | base64)
        fi
    else
        CREDENTIALS=$(echo -n "${CLIENT_ID}:${CLIENT_SECRET}" | openssl base64 | tr -d '\n')
    fi
    
    # Faz requisição para obter o token
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OAUTH_URL" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "Authorization: Basic $CREDENTIALS" \
        -d "grant_type=client_credentials" \
        --connect-timeout 30 \
        --max-time 60)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" != "200" ]; then
        echo "❌ Erro ao obter token de autenticação (HTTP $HTTP_CODE)" >&2
        echo "Resposta: $BODY_RESPONSE" >&2
        if [ "$HTTP_CODE" = "401" ]; then
            echo "" >&2
            echo "💡 Dica: Credenciais inválidas ou ambiente incorreto." >&2
            echo "   - Verifique se as credenciais estão corretas" >&2
            echo "   - Se as credenciais são de SANDBOX, altere ENVIRONMENT para 'sandbox' no script" >&2
            echo "   - Se as credenciais são de PRODUÇÃO, altere ENVIRONMENT para 'production' no script" >&2
        fi
        return 1
    fi
    
    # Extrai o access_token da resposta
    ACCESS_TOKEN=$(echo "$BODY_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "❌ Erro ao extrair token da resposta" >&2
        echo "Resposta: $BODY_RESPONSE" >&2
        return 1
    fi
    
    # Salva o token no arquivo temporário
    echo "$ACCESS_TOKEN" > "$TOKEN_FILE"
    echo "✅ Token obtido com sucesso" >&2
    
    # Retorna apenas o token (stdout)
    echo "$ACCESS_TOKEN"
}

# Função para ler o token do arquivo ou obter um novo
get_token() {
    if [ -f "$TOKEN_FILE" ] && [ -s "$TOKEN_FILE" ]; then
        cat "$TOKEN_FILE"
        return 0
    else
        obter_token
        return $?
    fi
}

# Função para limpar arquivos temporários
cleanup() {
    [ -f "$TOKEN_FILE" ] && rm -f "$TOKEN_FILE"
}

# Registra cleanup ao sair do script
trap cleanup EXIT

# =============================================================================
# FUNÇÕES PRINCIPAIS
# =============================================================================

# Função para criar link de pagamento
criar_link() {
    local AMOUNT="$1"
    local EXPIRATION_DATE="$2"
    local INSTALLMENTS="${3:-1}"
    local PAYMENT_OPTIONS="${4:-credit}"
    local DESCRIPTION="${5:-Link de Pagamento}"
    
    # Validações básicas
    if [ -z "$AMOUNT" ] || [ -z "$EXPIRATION_DATE" ]; then
        echo "❌ Erro: Parâmetros obrigatórios não fornecidos"
        echo "Uso: criar_link <valor> <data_expiracao> [parcelas] [opcoes_pagamento] [descricao]"
        echo "Exemplo: criar_link 100.00 \"12/31/2025\" 2 \"credit,pix\" \"Venda de produto\""
        exit 1
    fi
    
    echo "📝 Criando link de pagamento..."
    
    # Obtém o token
    if [ -f "$TOKEN_FILE" ] && [ -s "$TOKEN_FILE" ]; then
        TOKEN=$(cat "$TOKEN_FILE")
    else
        TOKEN=$(obter_token)
        if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
            echo "❌ Não foi possível obter o token de autenticação" >&2
            exit 1
        fi
    fi
    
    # Verifica se o token foi obtido
    if [ -z "$TOKEN" ]; then
        echo "❌ Token vazio" >&2
        exit 1
    fi
    
    # Prepara o body da requisição - converte opções para array JSON
    if [[ "$PAYMENT_OPTIONS" == *","* ]]; then
        # Múltiplas opções
        PAYMENT_OPTIONS_ARRAY=$(echo "$PAYMENT_OPTIONS" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
    else
        # Uma única opção
        PAYMENT_OPTIONS_ARRAY="[\"$PAYMENT_OPTIONS\"]"
    fi
    
    BODY=$(cat <<EOF
{
  "amount": $AMOUNT,
  "expirationDate": "$EXPIRATION_DATE",
  "installments": $INSTALLMENTS,
  "paymentOptions": $PAYMENT_OPTIONS_ARRAY,
  "description": "$DESCRIPTION"
}
EOF
)
    
    # Debug (descomente para ver o que está sendo enviado)
    if [ "${DEBUG:-0}" = "1" ]; then
        echo "🔍 DEBUG - URL: ${BASE_URL}/v1/create"
        echo "🔍 DEBUG - Body: $BODY"
        echo "🔍 DEBUG - Token (primeiros 20 chars): ${TOKEN:0:20}..."
    fi
    
    # Faz a requisição
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/v1/create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Company-number: $CLIENT_ID" \
        -d "$BODY" \
        --connect-timeout 30 \
        --max-time 60)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')
    
    # Verifica se houve erro de conexão
    if [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
        echo "❌ Erro de conexão. Verifique:"
        echo "   - Conexão com a internet"
        echo "   - URL: ${BASE_URL}/v1/create"
        echo "   - Firewall/proxy"
        echo ""
        echo "💡 Dica: Para debug, execute: DEBUG=1 $0 criar ..."
        echo ""
        echo "Resposta completa: $RESPONSE"
        exit 1
    fi
    
    # Se token inválido (401), tenta obter novo
    if [ "$HTTP_CODE" = "401" ]; then
        echo "⚠️  Token inválido ou expirado. Obtendo novo token..."
        rm -f "$TOKEN_FILE"
        TOKEN=$(obter_token)
        echo "🔄 Tente executar o comando novamente."
        exit 1
    fi
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Link criado com sucesso!"
        echo "$BODY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESPONSE"
        
        # Extrai o paymentLinkId e URL
        PAYMENT_LINK_ID=$(echo "$BODY_RESPONSE" | grep -o '"paymentLinkId":"[^"]*' | cut -d'"' -f4)
        URL=$(echo "$BODY_RESPONSE" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
        
        if [ -n "$PAYMENT_LINK_ID" ]; then
            echo ""
            echo "📌 Payment Link ID: $PAYMENT_LINK_ID"
            echo "🔗 URL: $URL"
        fi
    else
        echo "❌ Erro ao criar link (HTTP $HTTP_CODE)"
        echo "$BODY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESPONSE"
        exit 1
    fi
}

# Função para consultar detalhes do link
consultar_link() {
    local PAYMENT_LINK_ID="$1"
    
    if [ -z "$PAYMENT_LINK_ID" ]; then
        echo "❌ Erro: Payment Link ID não fornecido"
        echo "Uso: consultar_link <payment_link_id>"
        echo "Exemplo: consultar_link 33j36w0"
        exit 1
    fi
    
    echo "🔍 Consultando detalhes do link: $PAYMENT_LINK_ID"
    
    # Obtém o token
    if [ -f "$TOKEN_FILE" ] && [ -s "$TOKEN_FILE" ]; then
        TOKEN=$(cat "$TOKEN_FILE")
    else
        TOKEN=$(obter_token)
        if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
            echo "❌ Não foi possível obter o token de autenticação" >&2
            exit 1
        fi
    fi
    
    # Verifica se o token foi obtido
    if [ -z "$TOKEN" ]; then
        echo "❌ Token vazio" >&2
        exit 1
    fi
    
    # Faz a requisição
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/v1/details/${PAYMENT_LINK_ID}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Company-number: $CLIENT_ID" \
        --connect-timeout 30 \
        --max-time 60)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')
    
    # Verifica se houve erro de conexão
    if [ "$HTTP_CODE" = "000" ]; then
        echo "❌ Erro de conexão. Verifique sua conexão com a internet."
        exit 1
    fi
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Consulta realizada com sucesso!"
        echo "$BODY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESPONSE"
        
        # Extrai informações importantes
        STATUS=$(echo "$BODY_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        AMOUNT=$(echo "$BODY_RESPONSE" | grep -o '"amount":[0-9.]*' | cut -d':' -f2)
        
        if [ -n "$STATUS" ]; then
            echo ""
            echo "📊 Status: $STATUS"
            [ -n "$AMOUNT" ] && echo "💰 Valor: R$ $AMOUNT"
        fi
    else
        echo "❌ Erro ao consultar link (HTTP $HTTP_CODE)"
        echo "$BODY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESPONSE"
        exit 1
    fi
}

# Função para cancelar link de pagamento
cancelar_link() {
    local PAYMENT_LINK_ID="$1"
    
    if [ -z "$PAYMENT_LINK_ID" ]; then
        echo "❌ Erro: Payment Link ID não fornecido"
        echo "Uso: cancelar_link <payment_link_id>"
        echo "Exemplo: cancelar_link 33j36w0"
        exit 1
    fi
    
    echo "🚫 Cancelando link: $PAYMENT_LINK_ID"
    
    # Obtém o token
    if [ -f "$TOKEN_FILE" ] && [ -s "$TOKEN_FILE" ]; then
        TOKEN=$(cat "$TOKEN_FILE")
    else
        TOKEN=$(obter_token)
        if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
            echo "❌ Não foi possível obter o token de autenticação" >&2
            exit 1
        fi
    fi
    
    # Verifica se o token foi obtido
    if [ -z "$TOKEN" ]; then
        echo "❌ Token vazio" >&2
        exit 1
    fi
    
    # Faz a requisição
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "${BASE_URL}/v1/cancel/${PAYMENT_LINK_ID}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Company-number: $CLIENT_ID" \
        --connect-timeout 30 \
        --max-time 60)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')
    
    # Verifica se houve erro de conexão
    if [ "$HTTP_CODE" = "000" ]; then
        echo "❌ Erro de conexão. Verifique sua conexão com a internet."
        exit 1
    fi
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Link cancelado com sucesso!"
        echo "$BODY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESPONSE"
    else
        echo "❌ Erro ao cancelar link (HTTP $HTTP_CODE)"
        echo "$BODY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESPONSE"
        exit 1
    fi
}

# Função para exibir ajuda
exibir_ajuda() {
    cat <<EOF
🔗 Script de Gerenciamento de Links de Pagamento - Rede

USO:
    $0 <comando> [parâmetros]

COMANDOS DISPONÍVEIS:

1. criar <valor> <data_expiracao> [parcelas] [opcoes] [descricao]
   Cria um novo link de pagamento
   
   Parâmetros:
   - valor: Valor do pagamento (ex: 100.00)
   - data_expiracao: Data no formato MM/DD/YYYY (ex: "12/31/2025")
   - parcelas: Número de parcelas (1-12, padrão: 1)
   - opcoes: Opções de pagamento separadas por vírgula (padrão: "credit")
             Exemplos: "credit", "pix", "credit,pix"
   - descricao: Descrição do link (padrão: "Link de Pagamento")
   
   Exemplo:
   $0 criar 150.50 "12/31/2025" 3 "credit,pix" "Venda de produto"

2. consultar <payment_link_id>
   Consulta os detalhes e status de um link de pagamento
   
   Parâmetros:
   - payment_link_id: ID do link de pagamento
   
   Exemplo:
   $0 consultar 33j36w0

3. cancelar <payment_link_id>
   Cancela um link de pagamento que não foi pago
   
   Parâmetros:
   - payment_link_id: ID do link de pagamento
   
   Exemplo:
   $0 cancelar 33j36w0

4. token
   Obtém um novo token de autenticação (geralmente não necessário)
   
   Exemplo:
   $0 token

5. ajuda
   Exibe esta mensagem de ajuda

EXEMPLOS COMPLETOS:

# Criar link simples
$0 criar 100.00 "12/31/2025"

# Criar link com parcelas e PIX
$0 criar 250.00 "12/31/2025" 6 "credit,pix" "Compra parcelada"

# Consultar status do link
$0 consultar 33j36w0

# Cancelar link não pago
$0 cancelar 33j36w0

NOTAS:
- O token é obtido automaticamente e tem validade de 24 minutos
- As datas devem estar no formato MM/DD/YYYY
- O ambiente padrão é SANDBOX (altere a variável ENVIRONMENT no script para usar production)
EOF
}

# =============================================================================
# PROCESSAMENTO DE COMANDOS
# =============================================================================

# Verifica se há argumentos
if [ $# -eq 0 ]; then
    exibir_ajuda
    exit 0
fi

COMANDO="$1"
shift

case "$COMANDO" in
    criar)
        criar_link "$@"
        ;;
    consultar)
        consultar_link "$@"
        ;;
    cancelar)
        cancelar_link "$@"
        ;;
    token)
        TOKEN=$(obter_token)
        if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
            exit 1
        fi
        echo ""
        echo "Token obtido: ${TOKEN:0:20}... (token completo salvo em $TOKEN_FILE)"
        ;;
    ajuda|help|--help|-h)
        exibir_ajuda
        ;;
    *)
        echo "❌ Comando desconhecido: $COMANDO"
        echo ""
        exibir_ajuda
        exit 1
        ;;
esac

