# Orçamento Flexográfico

Sistema que reproduz a lógica das planilhas `.xlsm` de orçamento (flexografia), com preços dinâmicos e UI própria.

## Stack (Docker)

```bash
docker compose up --build
```

- UI + API: http://localhost:18080  
- Health: http://localhost:18080/api/health  
- Postgres: serviço `db`

## Desenvolvimento local (sem Docker)

```bash
cd backend
pip install -r requirements.txt
pytest -v
uvicorn app.main:app --reload --port 8000
```

## Motor de cálculo

Regras R1–R20 em `backend/app/engine/` (documentadas em `docs/analise/01-Regras-de-Calculo.md`).

Decisões de negócio aplicadas:
- Setup **+1 h**
- Faixas **1..N**
- Troca de produto só com metragem ≥ 1000
- Caixa × R$ 7 (parametrizável)
- Matriz só no **1º pedido** da mesma chave (`cliente+medida+Z+cores+largura+colunas`)
- Cores **4V** mantida
- Campo **máquina roda serviço** mantido (fora do preço)
- Estoque **fora** do MVP

## Testes

```bash
cd backend && pytest -v
```

Regressão contra fixtures extraídas de BRAHVA, ART MOVEIS, rarepan e ORÇAMENTO OFICIAL.
