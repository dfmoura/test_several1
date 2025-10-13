# Consulta de Dividendos B3

Este programa busca informações de dividendos das empresas listadas na B3 utilizando a API BRAPI.

## 📋 Funcionalidades

- Lista todas as ações da B3 através da API BRAPI
- Busca dividendos pagos por cada ação em um intervalo de datas específico
- Retorna 0 para ações que não pagaram dividendos no período
- Salva os resultados em arquivo JSON
- Exibe ranking das ações que mais pagaram dividendos

## 🔑 Configuração do Token (Opcional mas Recomendado)

O token da API BRAPI permite mais requisições e melhor performance.

**Seu token já está configurado!** 🎉
```
Token: 6nBuvj6mNCptLKX2VyC8Eh
```

O arquivo `.env` foi criado automaticamente. Para mais detalhes, veja `CONFIGURACAO_TOKEN.md`.

## 🚀 Como executar

### Opção 1: Com Docker Compose (Recomendado)

```bash
# Construir e executar o container
docker-compose up --build

# Ou executar em modo interativo
docker-compose run --rm dividendos-b3
```

### Opção 2: Com Docker

```bash
# Construir a imagem
docker build -t dividendos-b3 .

# Executar o container
docker run -it -v $(pwd):/app/output dividendos-b3
```

### Opção 3: Sem Docker

```bash
# Instalar dependências
pip install -r requirements.txt

# Executar o programa
python main.py
```

## 📊 Uso

1. Execute o programa
2. Informe a data inicial no formato `YYYY-MM-DD` (exemplo: 2024-01-01)
3. Informe a data final no formato `YYYY-MM-DD` (exemplo: 2024-12-31)
4. Escolha uma das opções:
   - Processar todas as ações (pode demorar bastante)
   - Processar apenas 10 ações (teste rápido)
   - Processar apenas 50 ações

5. Os resultados serão salvos em um arquivo JSON com o nome `dividendos_YYYY-MM-DD_a_YYYY-MM-DD.json`

## 📁 Estrutura de saída

O arquivo JSON gerado contém:

```json
{
  "periodo": {
    "inicio": "2024-01-01",
    "fim": "2024-12-31"
  },
  "resultados": [
    {
      "stock": "PETR4",
      "nome": "Petroleo Brasileiro SA Pfd",
      "dividendos": [...],
      "total": 15.50,
      "quantidade": 4,
      "erro": null
    }
  ]
}
```

## 🔧 Tecnologias

- Python 3.11
- Requests (para chamadas HTTP)
- Docker & Docker Compose
- API BRAPI (https://brapi.dev)
- Token BRAPI configurado para melhor performance

## 📝 Observações

- A API BRAPI possui limite de requisições, por isso há um delay de 0.5s entre cada consulta
- O processamento de todas as ações pode levar vários minutos
- Use a opção de teste (10 ou 50 ações) para verificar o funcionamento antes de processar tudo
- Os resultados são salvos no diretório do projeto (mapeado automaticamente quando usando Docker)

## 🌐 API Utilizada

- Lista de ações: https://brapi.dev/api/quote/list
- Dividendos: https://brapi.dev/api/quote/{stock}?dividends=true&fundamental=true

