# API de consulta — linhas de crédito (Open Finance / Empréstimos)

Serviço **somente leitura** que expõe `POST /credit-lines` e integra (ou simula) a API de **Empréstimos** do Open Finance Brasil. Não há concessão de crédito nem persistência de dados sensíveis.

Documentação de referência: [DA API - Empréstimos](https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/180256974/DA+API+-+Empr+stimos).

## Stack

- Node.js 18 + TypeScript  
- Fastify, Axios, Zod, dotenv  
- Logs via Pino (Fastify)

## Estrutura

```
src/
  config/       # variáveis de ambiente
  controllers/
  services/
  clients/      # OAuth2 + chamada HTTP à API de empréstimos + mock
  schemas/      # Zod
  routes/
  app.ts
  index.ts
```

## Execução com Docker (recomendado)

Não é necessário instalar Node na máquina host.

```bash
cd trigger/5
docker compose build
docker compose up
```

- API: `http://localhost:3000`  
- Raiz: `GET /` — metadados e lista de rotas  
- Health: `GET http://localhost:3000/health`

### Variáveis

Copie `.env.example` para `.env` e ajuste (ou use apenas variáveis no `docker-compose.yml`).

| Variável | Descrição |
|----------|-----------|
| `MOCK_OPEN_FINANCE` | `true` (padrão no compose): retorna ofertas fictícias sem chamar a instituição |
| `OF_API_BASE_URL` | Base HTTPS da instituição |
| `OF_TOKEN_URL` | Endpoint OAuth2 (ex.: client credentials) |
| `OF_CLIENT_ID` / `OF_CLIENT_SECRET` | Credenciais do cliente |
| `OF_LOANS_RESOURCE_PATH` | Caminho do recurso (ex.: `/open-banking/loans/v1/contracts`) |

Em produção, o tráfego costuma exigir **mTLS** e headers FAPI; este projeto isola a consulta HTTP para você plugar certificados/proxy conforme o participante.

## Exemplo de requisição

```bash
chmod +x scripts/curl-example.sh
./scripts/curl-example.sh
```

Ou manualmente:

```bash
curl -sS -X POST http://localhost:3000/credit-lines \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "52998224725",
    "consentId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Resposta (formato simplificado):

```json
{
  "offers": [
    {
      "institution": "Banco Exemplo S.A. (mock)",
      "type": "CREDITO_PESSOAL_SEM_CONSIGNACAO",
      "interestRate": 1.89,
      "maxAmount": 80000,
      "minAmount": 500,
      "term": 48
    }
  ]
}
```

## Desenvolvimento local (opcional)

Se você já tiver Node 18+:

```bash
npm install
cp .env.example .env
npm run dev
```

## Segurança

- Secrets apenas em `.env` (não versionado).  
- CPF e `consentId` são validados; não há armazenamento.  
- Evite logar documentos ou tokens completos em produção.

## Licença

Uso interno / exemplo.
