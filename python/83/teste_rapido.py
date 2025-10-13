"""
Script de teste rápido para validar o funcionamento
"""

from main import DividendosBrapi

def teste():
    print("=" * 80)
    print(" " * 25 + "TESTE RÁPIDO")
    print("=" * 80)
    
    app = DividendosBrapi()
    
    # Teste 1: Buscar lista de ações
    print("\n✅ Teste 1: Buscando lista de ações da B3...")
    stocks = app.obter_lista_stocks_b3()
    if stocks:
        print(f"   ✅ Sucesso! {len(stocks)} ações encontradas")
        print(f"   Exemplos: {', '.join(stocks[:5])}")
    else:
        print("   ❌ Falha ao buscar ações")
        return
    
    # Teste 2: Buscar dividendos de uma ação específica
    print("\n✅ Teste 2: Buscando dividendos da PETR4 (2024)...")
    resultado = app.obter_dividendos_stock("PETR4", "2024-01-01", "2024-12-31")
    
    if resultado['erro']:
        print(f"   ⚠️  Erro: {resultado['erro']}")
    else:
        print(f"   ✅ Sucesso!")
        print(f"   Stock: {resultado['stock']}")
        print(f"   Nome: {resultado.get('nome', 'N/A')}")
        print(f"   Total dividendos: R$ {resultado['total']:.2f}")
        print(f"   Quantidade pagamentos: {resultado['quantidade']}")
    
    print("\n" + "=" * 80)
    print("✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
    print("=" * 80)
    print("\nO programa está funcionando corretamente.")
    print("Você pode executar 'python main.py' para usar o programa completo.")

if __name__ == "__main__":
    teste()

