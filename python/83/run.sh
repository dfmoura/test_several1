#!/bin/bash

# Script para facilitar a execução do projeto

echo "========================================"
echo "  Consulta de Dividendos B3 - Docker"
echo "========================================"
echo ""

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    echo "   Instale o Docker em: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado!"
    echo "   Instale o Docker Compose em: https://docs.docker.com/compose/install/"
    exit 1
fi

# Não é necessário criar diretório de resultados, os arquivos são salvos no diretório atual

echo "🐳 Opções de execução:"
echo ""
echo "1. Executar com Docker Compose (interativo)"
echo "2. Executar exemplo rápido (20 ações)"
echo "3. Construir apenas a imagem"
echo "4. Limpar containers e imagens"
echo ""

read -p "Escolha uma opção (1-4): " opcao

case $opcao in
    1)
        echo ""
        echo "🚀 Executando com Docker Compose..."
        docker-compose run --rm dividendos-b3
        ;;
    2)
        echo ""
        echo "🚀 Executando exemplo rápido..."
        docker build -t dividendos-b3 . && \
        docker run -it -v $(pwd):/app/output dividendos-b3 python exemplo.py
        ;;
    3)
        echo ""
        echo "🔨 Construindo imagem..."
        docker build -t dividendos-b3 .
        echo "✅ Imagem construída com sucesso!"
        ;;
    4)
        echo ""
        echo "🧹 Limpando containers e imagens..."
        docker-compose down
        docker rmi dividendos-b3:latest 2>/dev/null
        echo "✅ Limpeza concluída!"
        ;;
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac

echo ""
echo "✅ Concluído!"

