"""
Script de exemplo para usar a classe DividendosBrapi sem interação do usuário
Útil para testes automatizados ou execução em scripts
"""

from main import DividendosBrapi

def exemplo_basico():
    """
    Exemplo básico de uso da API
    """
    print("=" * 80)
    print(" " * 25 + "EXEMPLO DE USO")
    print("=" * 80)
    
    # Criar instância
    app = DividendosBrapi()
    
    # Definir período (exemplo: ano de 2024)
    data_inicio = "2024-01-01"
    data_fim = "2024-12-31"
    
    print(f"\n📊 Buscando dividendos de {data_inicio} até {data_fim}")
    print("   (Processando apenas 20 ações para exemplo rápido)\n")
    
    # Processar apenas 20 ações para exemplo rápido
    app.processar_todas_stocks(data_inicio, data_fim, limite=20)
    
    print("\n✅ Exemplo concluído!")


def exemplo_stock_especifico():
    """
    Exemplo buscando dividendos de uma ação específica
    """
    print("\n" + "=" * 80)
    print(" " * 20 + "EXEMPLO - AÇÃO ESPECÍFICA")
    print("=" * 80)
    
    app = DividendosBrapi()
    
    # Buscar dividendos da Petrobras (PETR4) em 2024
    stock = "PETR4"
    data_inicio = "2024-01-01"
    data_fim = "2024-12-31"
    
    print(f"\n🔍 Buscando dividendos de {stock}...")
    resultado = app.obter_dividendos_stock(stock, data_inicio, data_fim)
    
    print(f"\n📈 Resultado para {resultado['stock']}:")
    print(f"   Nome: {resultado.get('nome', 'N/A')}")
    print(f"   Total de dividendos: R$ {resultado['total']:.2f}")
    print(f"   Quantidade de pagamentos: {resultado['quantidade']}")
    
    if resultado['dividendos']:
        print("\n   Detalhes dos pagamentos:")
        for div in resultado['dividendos']:
            valor = div.get('rate', 0)
            data = div.get('paymentDate', div.get('date', 'N/A'))
            print(f"   - {data}: R$ {valor:.2f}")
    else:
        print("   ⚪ Nenhum dividendo encontrado no período")


def exemplo_comparacao():
    """
    Exemplo comparando dividendos de várias ações específicas
    """
    print("\n" + "=" * 80)
    print(" " * 20 + "EXEMPLO - COMPARAÇÃO DE AÇÕES")
    print("=" * 80)
    
    app = DividendosBrapi()
    
    # Lista de ações para comparar
    stocks = ["PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3"]
    data_inicio = "2024-01-01"
    data_fim = "2024-12-31"
    
    print(f"\n📊 Comparando dividendos de {len(stocks)} ações em 2024\n")
    
    resultados = []
    for stock in stocks:
        print(f"🔍 Buscando {stock}...", end=" ")
        resultado = app.obter_dividendos_stock(stock, data_inicio, data_fim)
        resultados.append(resultado)
        print(f"R$ {resultado['total']:.2f}")
    
    # Ordenar por total
    resultados.sort(key=lambda x: x['total'], reverse=True)
    
    print("\n" + "=" * 80)
    print("🏆 RANKING DE DIVIDENDOS")
    print("=" * 80)
    
    for idx, res in enumerate(resultados, 1):
        nome = res.get('nome', res['stock'])[:40]
        print(f"{idx}. {res['stock']:8s} - {nome:40s} - R$ {res['total']:8.2f}")


if __name__ == "__main__":
    # Executar exemplos
    exemplo_basico()
    
    # Descomentar para executar outros exemplos:
    # exemplo_stock_especifico()
    # exemplo_comparacao()

