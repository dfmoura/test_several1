# Cliente API B3 - Eventos Provisionados

Esta aplicação Java permite conectar e consumir a API de Eventos Provisionados da B3, fornecendo informações sobre dividendos, juros sobre capital próprio, rendimentos e outros eventos corporativos de renda variável.

## Características

- **Cliente HTTP completo** para a API da B3
- **Modelos de dados** baseados na especificação Swagger da API
- **Tratamento de erros** robusto com códigos de status HTTP
- **Validação de dados** para CPF/CNPJ e datas
- **Logging** configurável com Logback
- **Interface interativa** para consultas
- **Suporte a paginação** da API

## Estrutura do Projeto

```
src/main/java/com/b3/investidor/
├── Application.java              # Classe principal com exemplo de uso
├── client/
│   └── B3ApiClient.java         # Cliente HTTP para a API
├── exception/
│   └── B3ApiException.java      # Exceção personalizada
├── model/                       # Modelos de dados
│   ├── Data.java
│   ├── Error.java
│   ├── ErrorResponse.java
│   ├── Link.java
│   ├── ProvisionedEvents.java
│   └── ProvisionedEventsResponse.java
└── util/
    └── ValidationUtils.java     # Utilitários de validação
```

## Pré-requisitos

- Java 11 ou superior
- Maven 3.6 ou superior
- Chave de API da B3 (opcional para testes)

## Como Usar

### 1. Compilação

```bash
mvn clean compile
```

### 2. Execução

```bash
mvn exec:java -Dexec.mainClass="com.b3.investidor.Application"
```

Ou compile e execute o JAR:

```bash
mvn clean package
java -jar target/b3-api-client-1.0.0.jar
```

### 3. Uso Programático

```java
// Criação do cliente
B3ApiClient client = new B3ApiClient(
    B3ApiClient.CERTIFICATION_URL,  // ou PRODUCTION_URL
    "sua-chave-api"                 // opcional
);

// Consulta de eventos
LocalDate referenceDate = LocalDate.now().minusDays(1);
ProvisionedEventsResponse response = client.getProvisionedEvents(
    "12345678901",  // CPF/CNPJ
    referenceDate,  // Data de referência
    1               // Página (opcional)
);

// Processamento dos resultados
if (response.getData() != null) {
    List<ProvisionedEvents> events = response.getData().getProvisionedEvents();
    for (ProvisionedEvents event : events) {
        System.out.println("Evento: " + event.getCorporateActionTypeDescription());
        System.out.println("Valor: R$ " + event.getNetValue());
    }
}
```

## Configuração

### Ambientes

- **Certificação**: `https://apib3i-cert.b3.com.br:2443`
- **Produção**: `https://investidor.b3.com.br:2443`

### Parâmetros da API

- **documentNumber**: CPF (11 dígitos) ou CNPJ (14 dígitos)
- **referenceDate**: Data no formato AAAA-MM-DD (obrigatória)
- **page**: Número da página (opcional, padrão 1)

### Regras de Uso

- Consultar cada CPF uma vez por dia
- Buscar dados apenas do período não consultado anteriormente
- Dados atualizados de segunda a sexta a partir das 23h
- Paginação: 20 itens por página
- Dados disponíveis a partir de novembro/2019

## Tratamento de Erros

A aplicação trata os seguintes códigos de erro da API:

- **400**: Requisição inválida
- **401**: Não autorizado
- **403**: Acesso negado
- **404**: Recurso não encontrado
- **422**: Entidade não processável
- **429**: Muitas requisições
- **500**: Erro interno do servidor
- **503**: Serviço indisponível

## Validações

- **CPF/CNPJ**: Validação de formato e dígitos verificadores
- **Data**: Verificação de formato e limites (não futura, não anterior a 2018)
- **Parâmetros obrigatórios**: Verificação de campos necessários

## Logs

Os logs são salvos em:

- Console (nível INFO)
- Arquivo: `logs/b3-api-client.log` (com rotação diária)

## Dependências

- Jackson (serialização JSON)
- Apache HttpClient 5
- SLF4J + Logback (logging)
- Hibernate Validator (validações)
- JUnit 5 (testes)

## Exemplo de Resposta

```json
{
  "data": {
    "provisionedEvents": [
      {
        "documentNumber": "12345678901",
        "referenceDate": "2024-01-15",
        "corporateActionTypeDescription": "DIVIDENDO",
        "corporationName": "PETROBRAS S.A.",
        "tickerSymbol": "PETR4",
        "netValue": 150.75,
        "paymentDate": "2024-01-20",
        "participantName": "CORRETORA XYZ"
      }
    ]
  },
  "Links": {
    "self": "https://api.../investors/12345678901?referenceDate=2024-01-15&page=1",
    "next": "https://api.../investors/12345678901?referenceDate=2024-01-15&page=2"
  }
}
```

## Licença

Este projeto é fornecido como exemplo educacional. Consulte os termos de uso da API da B3 para uso em produção.
