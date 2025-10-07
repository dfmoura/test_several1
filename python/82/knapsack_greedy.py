#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Implementação do algoritmo de busca gulosa para o problema da mochila fracionada.

Este algoritmo resolve o problema da mochila fracionada usando uma estratégia gulosa,
onde os itens são ordenados por densidade de valor (valor/peso) em ordem decrescente.
"""

from typing import List, Tuple


class Item:
    """Classe para representar um item da mochila."""
    
    def __init__(self, peso: float, valor: float, nome: str = ""):
        """
        Inicializa um item.
        
        Args:
            peso: Peso do item
            valor: Valor do item
            nome: Nome identificador do item (opcional)
        """
        self.peso = peso
        self.valor = valor
        self.nome = nome
        self.densidade = valor / peso if peso > 0 else 0
    
    def __repr__(self):
        return f"Item({self.nome}, peso={self.peso}, valor={self.valor}, densidade={self.densidade:.2f})"


def mochila_fracionada_gulosa(itens: List[Item], capacidade: float) -> Tuple[List[Tuple[Item, float]], float]:
    """
    Resolve o problema da mochila fracionada usando busca gulosa.
    
    A estratégia gulosa consiste em:
    1. Ordenar os itens por densidade de valor (valor/peso) em ordem decrescente
    2. Adicionar itens na mochila seguindo essa ordem até atingir a capacidade
    
    Args:
        itens: Lista de itens disponíveis
        capacidade: Capacidade máxima da mochila
        
    Returns:
        Tupla contendo:
        - Lista de tuplas (item, fração_adicionada) representando a solução
        - Valor total obtido
    """
    # Ordena os itens por densidade de valor em ordem decrescente
    itens_ordenados = sorted(itens, key=lambda x: x.densidade, reverse=True)
    
    solucao = []
    peso_atual = 0.0
    valor_total = 0.0
    
    for item in itens_ordenados:
        if peso_atual >= capacidade:
            break
            
        # Calcula quanto do item pode ser adicionado
        peso_disponivel = capacidade - peso_atual
        fracao_adicionada = min(1.0, peso_disponivel / item.peso)
        
        if fracao_adicionada > 0:
            solucao.append((item, fracao_adicionada))
            peso_atual += fracao_adicionada * item.peso
            valor_total += fracao_adicionada * item.valor
    
    return solucao, valor_total


def imprimir_solucao(solucao: List[Tuple[Item, float]], valor_total: float, capacidade: float):
    """
    Imprime a solução do problema da mochila de forma formatada.
    
    Args:
        solucao: Lista de tuplas (item, fração_adicionada)
        valor_total: Valor total obtido
        capacidade: Capacidade da mochila
    """
    print("=" * 60)
    print("SOLUÇÃO DA MOCHILA FRACIONADA (BUSCA GULOSA)")
    print("=" * 60)
    print(f"Capacidade da mochila: {capacidade:.2f}")
    print(f"Valor total obtido: {valor_total:.2f}")
    print()
    
    print("Itens selecionados:")
    print("-" * 60)
    print(f"{'Item':<15} {'Peso':<8} {'Valor':<8} {'Fração':<8} {'Peso Usado':<12} {'Valor Obtido':<12}")
    print("-" * 60)
    
    peso_total_usado = 0.0
    for item, fracao in solucao:
        peso_usado = fracao * item.peso
        valor_obtido = fracao * item.valor
        peso_total_usado += peso_usado
        
        print(f"{item.nome:<15} {item.peso:<8.2f} {item.valor:<8.2f} {fracao:<8.2f} {peso_usado:<12.2f} {valor_obtido:<12.2f}")
    
    print("-" * 60)
    print(f"{'TOTAL':<15} {'':<8} {'':<8} {'':<8} {peso_total_usado:<12.2f} {valor_total:<12.2f}")
    print("=" * 60)


def exemplo_basico():
    """Executa um exemplo básico do algoritmo."""
    print("EXEMPLO BÁSICO - MOCHILA FRACIONADA")
    print("=" * 40)
    
    # Cria lista de itens de exemplo
    itens = [
        Item(10, 60, "Item A"),
        Item(20, 100, "Item B"),
        Item(30, 120, "Item C"),
        Item(5, 30, "Item D"),
        Item(15, 90, "Item E")
    ]
    
    capacidade = 50.0
    
    print("Itens disponíveis:")
    for item in itens:
        print(f"  {item}")
    print(f"\nCapacidade da mochila: {capacidade}")
    print()
    
    # Resolve o problema
    solucao, valor_total = mochila_fracionada_gulosa(itens, capacidade)
    
    # Imprime a solução
    imprimir_solucao(solucao, valor_total, capacidade)


def exemplo_detalhado():
    """Executa um exemplo mais detalhado mostrando o processo passo a passo."""
    print("\nEXEMPLO DETALHADO - PROCESSO PASSO A PASSO")
    print("=" * 50)
    
    # Cria lista de itens de exemplo
    itens = [
        Item(12, 24, "Ouro"),
        Item(10, 18, "Prata"),
        Item(8, 12, "Bronze"),
        Item(6, 15, "Platina"),
        Item(4, 8, "Cobre")
    ]
    
    capacidade = 25.0
    
    print("Itens disponíveis (ordenados por densidade):")
    itens_ordenados = sorted(itens, key=lambda x: x.densidade, reverse=True)
    for i, item in enumerate(itens_ordenados, 1):
        print(f"  {i}. {item}")
    print(f"\nCapacidade da mochila: {capacidade}")
    print()
    
    # Resolve o problema
    solucao, valor_total = mochila_fracionada_gulosa(itens, capacidade)
    
    # Imprime a solução
    imprimir_solucao(solucao, valor_total, capacidade)


if __name__ == "__main__":
    print("ALGORITMO DE BUSCA GULOSA - MOCHILA FRACIONADA")
    print("=" * 55)
    
    # Executa os exemplos
    exemplo_basico()
    exemplo_detalhado()
    
    print("\nExplicação do algoritmo:")
    print("- Os itens são ordenados por densidade de valor (valor/peso)")
    print("- Sempre escolhemos o item com maior densidade disponível")
    print("- Podemos quebrar itens para maximizar o valor total")
    print("- Este algoritmo sempre encontra a solução ótima para a mochila fracionada")
