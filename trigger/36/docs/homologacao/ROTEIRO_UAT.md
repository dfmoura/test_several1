# Roteiro de homologação etapa a etapa — ERP RLP

Ambiente: Docker local (`WEB_PORT=8036`) ou HML AWS.  
Login: `admin@rlp.com.br` / `Admin@123`.  
Evidência: código de negócio (ORC-/PED-/OP-/NF-/TIT-/COB-/ENT-/BX-) + print + status CA.

## Princípios

- Homologar o **fluxo**, não a tela.
- Integrações em HML ficam **simuladas** (`SIMULAR_INTEGRACOES=true`) até sandbox Focus/banco.
- Gate S1 = GO quando CA-01…06 e CA-08…12 = PASS (CA-07 lab aceitável).

---

## E0 — Plataforma

1. Abrir `/` — ambiente = HOMOLOGACAO.
2. Confirmar usuário admin e role ADMIN.
3. Marcar **CA-08**, **CA-10**, **CA-12** conforme testes de isolamento/backup/SoD.

## E1 — Cadastros

1. Criar parceiro CLIENTE (CNPJ via lookup se rede disponível).
2. Criar produto INSUMO com largura_mm (bobina) e mínimo.
3. Código numérico não muda após criar.

## E2 — Orçamento (**CA-11** decimal)

1. `/orcamentos` → novo → calcular (faixas).
2. Conferir arredondamento etiqueta múltiplo de R$10; matriz R$1.
3. Salvar → Enviar → Aprovar faixa → nasce PED (snapshot).
4. Marcar **CA-01** com código PED gerado.

## E3 — Pedido (**CA-02**)

1. `/pedidos` → Liberar crédito (ou adiantamento).
2. Status → LIBERADO; OP/OS criadas.
3. Marcar **CA-02**.

## E4 — Produção (**CA-03**)

1. Iniciar produção no pedido.
2. `/producao` → concluir OP/OS.
3. Verificar movimento BAIXA_MP se havia saldo.
4. Marcar **CA-03**.

## E5 — Estoque / NF-e entrada

1. `/nfe` upload XML 4.00 (modelos em `../31/modelos` ou `../32/notas_compras`).
2. Aceitar mapeando itens → saldos sobem; títulos PAGAR nascem.
3. `/estoque` confere m²/ml e custo médio.

## E6 — Fiscal (**CA-04**)

1. Pedido em separação/produção elegível → Faturar.
2. `/fiscal` lista NF simulada; idempotency_key impede duplicar.
3. Confirmar TIT+COB nascidos juntos.
4. Marcar **CA-04**.

## E7 — Financeiro (**CA-05**, **CA-09**)

1. `/financeiro` → Baixar título RECEBER.
2. Repetir baixa com mesma chave → resposta idempotent.
3. Tentar natureza 9.xx (API rejeita) — **CA-09**.
4. Marcar **CA-05**.

## E8 — Entrega (**CA-06**)

1. Pedido FATURADO → Entregar.
2. `/entrega` → Confirmar.
3. Marcar **CA-06**.

## HML — Board

1. `/homologacao` preencher evidências.
2. Consultar GO/NO-GO.
3. ATA: data, build (`docker compose images`), decisão, pendências.

---

## Scripts ↔ CA

| Script | CA |
|--------|----|
| HT-COM-01 | CA-01 |
| HT-COM-02 | CA-02 |
| HT-PRD-01 | CA-03 |
| HT-FAT-01 | CA-04 |
| HT-FAT-02 | CA-05 |
| HT-FAT-03 | CA-06 |
| HT-POS-01 | CA-07 |
| HT-PLT-01 | CA-08 |
| HT-GER-01 | CA-09 |
| HT-NFR-01 | CA-10 |
| HT-NFR-02 | CA-11 |
| HT-PLT-02 | CA-12 |
