# Consulta de Proventos B3 (Eventos Provisionados)

Aplicação para consultar na B3 os **proventos pagos ou provisionados** de um investidor, usando a API oficial **Eventos Provisionados** (documentada em `document.txt` e no Swagger em `B3 Investidor - Eventos Provisionados.json`).

## O que esta API faz

- **Consulta por investidor (CPF/CNPJ)**: retorna eventos corporativos de renda variável provisionados (dividendos, JCP, rendimentos, bonificações etc.) até D-1 da data de referência.
- **Filtro por empresa**: após obter os dados do investidor, você pode filtrar por **ticker** (ex.: PETR4) ou por **nome da empresa** para ver só os proventos daquela empresa.

**Importante**: Esta API da B3 exige **contrato com a B3** e **opt-in do investidor** (autorização na área logada do investidor no site da B3). Os dados são por CPF/CNPJ do investidor, não uma lista pública “por empresa” sem autenticação do titular.

## Requisitos

- Python 3.8+
- Credenciais B3 (client_id e client_secret) fornecidas pela B3 no pacote de acesso após contrato.

## Instalação

```bash
cd /home/dfmoura/Documents/test_several1/prot/2
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# ou: .venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Configuração

1. Copie o arquivo de exemplo e preencha com suas credenciais B3:

   ```bash
   cp .env.example .env
   ```

2. Edite o `.env`:
   - `B3_CLIENT_ID` e `B3_CLIENT_SECRET`: obtidos no pacote de acesso B3.
   - `B3_ENV`: `cert` (certificação) ou `prod` (produção).
   - Ajuste `B3_SCOPE` conforme orientação da B3 (ex.: `https://apib3i-cert.b3.com.br/.default` em cert).

A autenticação usa **OAuth2 Client Credentials** (Azure AD). Em produção a B3 pode exigir **autenticação mútua (mTLS)**; nesse caso será necessário configurar certificados conforme documentação B3.

## Uso

### Todos os proventos do investidor em uma data

```bash
python consulta_proventos.py --cpf 12345678900 --data 2024-02-19
```

CPF pode ser com ou sem formatação; a data deve ser **YYYY-MM-DD** ou **DD/MM/YYYY** e anterior à data atual (conforme regras da API).

### Proventos apenas de uma empresa (por ticker)

```bash
python consulta_proventos.py --cpf 12345678900 --data 2024-02-19 --ticker PETR4
```

### Proventos por nome da empresa

```bash
python consulta_proventos.py --cpf 12345678900 --data 2024-02-19 --empresa "Petrobras"
```

### Saída em JSON

```bash
python consulta_proventos.py --cpf 12345678900 --data 2024-02-19 --json
```

## Estrutura do projeto

| Arquivo | Descrição |
|--------|-----------|
| `document.txt` | Documentação da API B3 Eventos Provisionados (visão geral, regras, modelo de dados) |
| `B3 Investidor - Eventos Provisionados.json` | Swagger 2.0 da API |
| `config.py` | Carrega variáveis de ambiente e URLs (cert/prod) |
| `b3_auth.py` | OAuth2 Client Credentials (token Azure AD) |
| `b3_provisioned_events.py` | Cliente da API (GET investors/{documentNumber}, paginação, filtro por empresa) |
| `consulta_proventos.py` | Script de linha de comando para consulta e exibição |
| `.env.example` | Exemplo de variáveis (copiar para `.env`) |

## Consultar “proventos de uma empresa” (dados públicos)

A API deste projeto é **por investidor (CPF)**. Para listar dividendos/proventos **por empresa** (ticker) em caráter público, sem CPF, é preciso usar outras fontes, por exemplo:

- **B3 – Consultas**: [Dividendos e outros eventos corporativos](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/acoes/consultas/dividendos-e-outros-eventos-corporativos/)
- **APIs de terceiros**: brapi.dev, HG Brasil (dividendos por ativo), conforme termos de uso de cada uma.

Esta aplicação foca no uso da **API oficial B3 Eventos Provisionados** com os arquivos do projeto.

## Regras da API (resumo)

- Consultar cada CPF no máximo uma vez por dia; buscar apenas períodos ainda não consultados.
- Data de referência em **AAAA-MM-DD**; deve ser anterior à data atual.
- Dados disponíveis a partir de 11/2019.
- Paginação: 20 itens por página (o script já percorre todas as páginas).
- Atualização dos dados: segunda a sexta a partir das 23h.

## Erros comuns

- **401/403**: Credenciais inválidas ou sem permissão; conferir client_id, client_secret e scope.
- **422.02**: Participante não autorizado a acessar o CPF/CNPJ.
- **422.03**: CPF/CNPJ não localizado.
- **422.05**: Data de referência deve ser inferior à data atual.
- **422.07**: Data inicial não pode ser anterior a 2018.

Se o ambiente de produção exigir mTLS, será necessário configurar certificados no `requests` (ou em um cliente HTTP que suporte client certificates) conforme documentação B3.
