import requests
from datetime import datetime
import json
from typing import List, Dict, Optional
import time
import os

class DividendosBrapi:
    """
    Classe para buscar dividendos de ações da B3 usando a API BRAPI
    """
    
    def __init__(self, token: Optional[str] = None):
        """
        Inicializa a classe
        
        Args:
            token: Token de autenticação da API BRAPI (opcional)
                   Se não fornecido, tenta ler da variável de ambiente BRAPI_TOKEN
        """
        self.base_url = "https://brapi.dev/api"
        self.stocks_cache = []
        
        # Obter token da variável de ambiente se não foi fornecido
        self.token = token or os.getenv('BRAPI_TOKEN')
        
        if self.token:
            print(f"🔑 Token configurado: {self.token[:4]}...{self.token[-4:]}")
        else:
            print("ℹ️  Usando API sem token (modo gratuito com limites)")
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Retorna os headers para as requisições, incluindo token se disponível
        """
        headers = {
            'User-Agent': 'DividendosBrapi/1.0',
            'Accept': 'application/json'
        }
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        return headers
    
    def obter_lista_stocks_b3(self) -> List[str]:
        """
        Obtém a lista de todas as ações listadas na B3
        
        Returns:
            Lista com os códigos das ações
        """
        try:
            print("🔍 Buscando lista de ações da B3...")
            url = f"{self.base_url}/quote/list"
            
            # Adicionar token como parâmetro na URL se disponível
            params = {'token': self.token} if self.token else {}
            
            response = requests.get(url, params=params, headers=self._get_headers(), timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Filtrar apenas stocks brasileiros (não BDRs nem fundos)
            stocks = [item['stock'] for item in data.get('stocks', []) 
                     if item.get('type') == 'stock']
            
            self.stocks_cache = stocks
            print(f"✅ Total de ações encontradas: {len(stocks)}")
            return stocks
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro ao buscar lista de ações: {e}")
            return []
    
    def obter_dividendos_stock(self, stock: str, data_inicio: str, data_fim: str) -> Dict:
        """
        Obtém os dividendos de uma ação específica no intervalo de datas
        
        Args:
            stock: Código da ação (ex: PETR4)
            data_inicio: Data inicial no formato YYYY-MM-DD
            data_fim: Data final no formato YYYY-MM-DD
            
        Returns:
            Dicionário com informações dos dividendos
        """
        try:
            # A API BRAPI usa o endpoint /quote/{stock}?range=5y&fundamental=true
            # para obter dados fundamentalistas incluindo dividendos
            url = f"{self.base_url}/quote/{stock}"
            params = {
                'range': '5y',
                'fundamental': 'true',
                'dividends': 'true'
            }
            
            # Adicionar token se disponível
            if self.token:
                params['token'] = self.token
            
            response = requests.get(url, params=params, headers=self._get_headers(), timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Verificar se há dados de dividendos
            if 'results' not in data or len(data['results']) == 0:
                return {
                    'stock': stock,
                    'dividendos': [],
                    'total': 0,
                    'erro': None
                }
            
            result = data['results'][0]
            dividendos_historico = result.get('dividendsData', {}).get('cashDividends', [])
            
            # Filtrar dividendos pelo intervalo de datas
            dividendos_filtrados = self._filtrar_por_data(
                dividendos_historico, 
                data_inicio, 
                data_fim
            )
            
            total = sum(div.get('rate', 0) for div in dividendos_filtrados)
            
            return {
                'stock': stock,
                'nome': result.get('longName', stock),
                'dividendos': dividendos_filtrados,
                'total': round(total, 2),
                'quantidade': len(dividendos_filtrados),
                'erro': None
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'stock': stock,
                'dividendos': [],
                'total': 0,
                'erro': str(e)
            }
    
    def _filtrar_por_data(self, dividendos: List[Dict], data_inicio: str, data_fim: str) -> List[Dict]:
        """
        Filtra os dividendos pelo intervalo de datas informado
        
        Args:
            dividendos: Lista de dividendos
            data_inicio: Data inicial no formato YYYY-MM-DD
            data_fim: Data final no formato YYYY-MM-DD
            
        Returns:
            Lista de dividendos filtrados
        """
        try:
            dt_inicio = datetime.strptime(data_inicio, '%Y-%m-%d')
            dt_fim = datetime.strptime(data_fim, '%Y-%m-%d')
            
            dividendos_filtrados = []
            
            for div in dividendos:
                # A data pode vir em diferentes formatos na API
                data_div = div.get('paymentDate') or div.get('date')
                if not data_div:
                    continue
                
                # Converter timestamp para data se necessário
                if isinstance(data_div, int):
                    dt_div = datetime.fromtimestamp(data_div)
                else:
                    # Tentar parsear diferentes formatos
                    try:
                        dt_div = datetime.strptime(data_div, '%Y-%m-%d')
                    except:
                        try:
                            # Remover informação de timezone para comparação
                            dt_div = datetime.fromisoformat(data_div.replace('Z', '+00:00'))
                            dt_div = dt_div.replace(tzinfo=None)
                        except:
                            continue
                
                if dt_inicio <= dt_div <= dt_fim:
                    dividendos_filtrados.append(div)
            
            return dividendos_filtrados
            
        except Exception as e:
            print(f"⚠️  Erro ao filtrar datas: {e}")
            return []
    
    def processar_todas_stocks(self, data_inicio: str, data_fim: str, limite: Optional[int] = None):
        """
        Processa todas as ações da B3 buscando dividendos
        
        Args:
            data_inicio: Data inicial no formato YYYY-MM-DD
            data_fim: Data final no formato YYYY-MM-DD
            limite: Limite de ações a processar (para testes)
        """
        stocks = self.obter_lista_stocks_b3()
        
        if not stocks:
            print("❌ Nenhuma ação encontrada para processar")
            return
        
        # Aplicar limite se especificado
        if limite:
            stocks = stocks[:limite]
            print(f"ℹ️  Processando apenas {limite} ações para teste")
        
        resultados = []
        total_processadas = 0
        total_com_dividendos = 0
        
        print(f"\n📊 Processando dividendos de {data_inicio} até {data_fim}\n")
        print("=" * 80)
        
        for idx, stock in enumerate(stocks, 1):
            print(f"\n[{idx}/{len(stocks)}] Processando {stock}...", end=" ")
            
            resultado = self.obter_dividendos_stock(stock, data_inicio, data_fim)
            resultados.append(resultado)
            total_processadas += 1
            
            if resultado['total'] > 0:
                total_com_dividendos += 1
                print(f"✅ Total: R$ {resultado['total']:.2f} ({resultado['quantidade']} pagamentos)")
            else:
                print("⚪ Sem dividendos")
            
            # Pequeno delay para não sobrecarregar a API
            time.sleep(0.5)
        
        # Exibir resumo
        print("\n" + "=" * 80)
        print("\n📈 RESUMO FINAL")
        print("=" * 80)
        print(f"Total de ações processadas: {total_processadas}")
        print(f"Ações com dividendos: {total_com_dividendos}")
        print(f"Ações sem dividendos: {total_processadas - total_com_dividendos}")
        
        # Salvar resultados em arquivo JSON
        self._salvar_resultados(resultados, data_inicio, data_fim)
        
        # Exibir top 10 maiores pagadores
        self._exibir_top_pagadores(resultados)
    
    def _salvar_resultados(self, resultados: List[Dict], data_inicio: str, data_fim: str):
        """
        Salva os resultados em um arquivo JSON
        """
        # Salvar no diretório output se estiver rodando no Docker, caso contrário no diretório atual
        output_dir = '/app/output' if os.path.exists('/app/output') else '.'
        nome_arquivo = f"dividendos_{data_inicio}_a_{data_fim}.json"
        caminho_completo = os.path.join(output_dir, nome_arquivo)
        
        with open(caminho_completo, 'w', encoding='utf-8') as f:
            json.dump({
                'periodo': {
                    'inicio': data_inicio,
                    'fim': data_fim
                },
                'resultados': resultados
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Resultados salvos em: {nome_arquivo}")
    
    def _exibir_top_pagadores(self, resultados: List[Dict], top: int = 10):
        """
        Exibe as ações que mais pagaram dividendos
        """
        # Ordenar por total de dividendos
        resultados_ordenados = sorted(
            resultados, 
            key=lambda x: x['total'], 
            reverse=True
        )
        
        print(f"\n🏆 TOP {top} MAIORES PAGADORES DE DIVIDENDOS")
        print("=" * 80)
        
        for idx, resultado in enumerate(resultados_ordenados[:top], 1):
            nome = resultado.get('nome', resultado['stock'])[:40]
            print(f"{idx:2d}. {resultado['stock']:8s} - {nome:40s} - R$ {resultado['total']:10.2f}")


def validar_data(data_str: str) -> bool:
    """
    Valida se a data está no formato correto YYYY-MM-DD
    """
    try:
        datetime.strptime(data_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False


def main():
    """
    Função principal do programa
    """
    print("=" * 80)
    print(" " * 20 + "CONSULTA DE DIVIDENDOS B3")
    print("=" * 80)
    
    # Solicitar dados ao usuário
    while True:
        data_inicio = input("\n📅 Digite a data inicial (YYYY-MM-DD): ").strip()
        if validar_data(data_inicio):
            break
        print("❌ Data inválida! Use o formato YYYY-MM-DD (exemplo: 2024-01-01)")
    
    while True:
        data_fim = input("📅 Digite a data final (YYYY-MM-DD): ").strip()
        if validar_data(data_fim):
            # Verificar se data final é maior que inicial
            if data_fim >= data_inicio:
                break
            print("❌ A data final deve ser maior ou igual à data inicial!")
        else:
            print("❌ Data inválida! Use o formato YYYY-MM-DD (exemplo: 2024-12-31)")
    
    # Perguntar se quer processar todas ou apenas algumas (para testes)
    print("\n⚙️  Opções:")
    print("1. Processar todas as ações (pode demorar)")
    print("2. Processar apenas as primeiras 10 (teste rápido)")
    print("3. Processar apenas as primeiras 50")
    
    opcao = input("\nEscolha uma opção (1-3): ").strip()
    
    limite = None
    if opcao == '2':
        limite = 10
    elif opcao == '3':
        limite = 50
    
    # Processar
    app = DividendosBrapi()
    app.processar_todas_stocks(data_inicio, data_fim, limite)
    
    print("\n✅ Processamento concluído!")
    print("=" * 80)


if __name__ == "__main__":
    main()

