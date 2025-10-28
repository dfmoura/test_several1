#!/bin/bash

echo "=== Cliente API B3 - Eventos Provisionados ==="
echo ""

# Verifica se o JAR existe
if [ ! -f "target/b3-api-client-1.0.0.jar" ]; then
    echo "JAR não encontrado. Execute 'mvn clean package' primeiro."
    exit 1
fi

echo "Exemplo de uso da API B3:"
echo ""
echo "Sintaxe: java -jar target/b3-api-client-1.0.0.jar [CPF/CNPJ] [DATA] [CHAVE_API]"
echo ""

# Exemplo com CPF
echo "1. Consultando CPF 11144477735 para data 2024-01-15:"
java -jar target/b3-api-client-1.0.0.jar 11144477735 2024-01-15

echo ""
echo "2. Consultando CNPJ 11222333000181 para data 2024-01-15:"
java -jar target/b3-api-client-1.0.0.jar 11222333000181 2024-01-15

echo ""
echo "3. Consultando CPF 11144477735 para ontem (D-1):"
java -jar target/b3-api-client-1.0.0.jar 11144477735

echo ""
echo "4. Modo interativo (sem argumentos):"
echo "java -jar target/b3-api-client-1.0.0.jar"
echo ""

echo "=== Fim dos exemplos ==="
echo ""
echo "Nota: Os erros de SSL são esperados pois estamos usando a API de certificação"
echo "sem credenciais válidas. Em produção, use suas credenciais da B3."