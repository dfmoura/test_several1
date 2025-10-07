#!/bin/bash

# Script para executar o exemplo de mochila fracionada com busca gulosa
# Este script oferece diferentes opções de execução

echo "========================================"
echo "MOCHILA FRACIONADA - BUSCA GULOSA"
echo "========================================"
echo ""

# Verifica se o Docker está instalado
if command -v docker &> /dev/null; then
    echo "Docker encontrado. Escolha uma opção:"
    echo "1) Executar com Docker (recomendado)"
    echo "2) Executar com Docker Compose"
    echo "3) Executar diretamente com Python"
    echo ""
    read -p "Digite sua escolha (1-3): " choice
    
    case $choice in
        1)
            echo "Construindo e executando com Docker..."
            docker build -t mochila-gulosa .
            docker run --rm mochila-gulosa
            ;;
        2)
            echo "Executando com Docker Compose..."
            docker-compose up --build
            ;;
        3)
            echo "Executando diretamente com Python..."
            python3 knapsack_greedy.py
            ;;
        *)
            echo "Opção inválida. Executando com Python..."
            python3 knapsack_greedy.py
            ;;
    esac
else
    echo "Docker não encontrado. Executando diretamente com Python..."
    python3 knapsack_greedy.py
fi

echo ""
echo "========================================"
echo "Execução concluída!"
echo "========================================"
