# RLP ERP — Compras, Estoque e Financeiro

Sistema para gráfica de etiquetas/rótulos: requisições de compra, pedidos, entrada de estoque
por XML de NF-e, movimentações manuais e contas a pagar. Controle de bobinas com saldo em
**m² e metros lineares**.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2 · lxml (parser NF-e 4.00) |
| Banco | PostgreSQL 16 |
| Frontend | React 18 · TypeScript · Ant Design 5 · Vite |
| Infra | Docker Compose (nginx serve o front e faz proxy da API) |

## Subir o sistema

```bash
docker compose up -d --build
```

Acesse **http://localhost:8080** (a API fica em `http://localhost:8080/api`, docs em `/api/docs` via proxy).

## Fluxo principal

1. **Importar NF-e**: arraste os XMLs na tela *Importar NF-e*. O fornecedor é cadastrado
   automaticamente com os dados do emitente e os itens são casados com produtos já conhecidos
   (de/para por código do fornecedor).
2. **Aceite**: vincule cada item a um produto existente ou deixe o sistema cadastrar
   automaticamente. No aceite é gerada a **entrada no estoque** (com custo) e as **parcelas no
   contas a pagar** conforme as duplicatas da nota.
3. **Estoque**: saldos por produto em unidade de controle, m² e metros lineares
   (conversão pela largura da bobina). Entradas/saídas manuais e ajustes.
4. **Compras**: requisição → aprovação → pedido de compra → recebimento pela NF-e.
5. **Financeiro**: programar pagamentos, registrar baixas, acompanhar vencidas/a vencer.

## Cadastros com APIs públicas gratuitas

- **CNPJ** — BrasilAPI (dados da Receita Federal, preenche o fornecedor inteiro)
- **CEP** — BrasilAPI com fallback ViaCEP
- **NCM** — tabela oficial pesquisável por código ou descrição no cadastro de produto

## Conversão m² ↔ metro linear

Para bobinas com largura cadastrada:

```
m² = metros lineares × (largura_mm / 1000)
metros lineares = m² / (largura_mm / 1000)
1 rolo = comprimento_m metros lineares
```

As NF-e geralmente vêm em M2; o sistema grava o movimento nas duas medidas.

## Integração futura — Focus NFe (certificado A1)

O ponto de integração está preparado em `backend/app/services/focus_nfe.py`. Com o certificado
A1 cadastrado na [Focus NFe](https://doc.focusnfe.com.br/reference/nfe), basta configurar
`FOCUS_NFE_TOKEN` no `.env` e agendar a busca de notas recebidas — o XML baixado reaproveita o
mesmo pipeline do upload manual (nota entra como PENDENTE e passa pelo aceite).

## Variáveis de ambiente (`.env`, opcional)

```
POSTGRES_USER=rlp
POSTGRES_PASSWORD=rlp_secret
POSTGRES_DB=rlp_erp
WEB_PORT=8080
FOCUS_NFE_TOKEN=
```

## Desenvolvimento sem Docker

```bash
# backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload          # requer Postgres local (DATABASE_URL)

# frontend
cd frontend && npm install && npm run dev   # proxy /api -> localhost:8000
```
