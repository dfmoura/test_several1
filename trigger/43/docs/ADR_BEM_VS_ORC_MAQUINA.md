# ADR-039-BEM-001 — Patrimônio (BEM) × Máquina ORC (G10)

**Status:** Aceito  
**Data:** 2026-08-07  
**Contexto 39:** BL-023 · BL-025 · BL-026  
**Norma:** `../32` — `PATRIMONIO_CONTROLE.txt` · `DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` §5.2 · ADR-DOM-001

---

## Decisão

| Conceito | Tabela / código | Papel |
|----------|-----------------|--------|
| **Bem patrimonial** | `bens_patrimoniais` · `BEM-NNNNN` | Ativo físico (máquina, veículo, TI…). Ownership: Gerencial/Patrimônio (M10). |
| **Grupo hora-máquina ORC** | `orc_catalogo_maquinas` · nome G10 (BETA, 160…) | **Só tarifas** R$/h do orçamento. Não é o ativo. |
| **Ponte** | `bens_patrimoniais.orc_catalogo_maquina_id` (nullable) | Liga bem físico ↔ grupo de preço. Opcional; 1 grupo → N bens. |

**Uma tabela BEM; zero “máquina paralela”.** Preventiva futura e OP referenciam **`bem_id`**, nunca o id do catálogo G10 como se fosse a máquina física.

### Origem operacional (2026-08-19)

A máquina **física** nasce no **Patrimônio**. O G10 **não** é cadastro de equipamento.

| Fluxo | Dono |
|-------|------|
| Nova impressora / equipamento de produção | `POST /bens` (categoria `MAQUINA_GRAFICA`) — escolhe grupo G10 existente **ou** cria o nome do grupo na mesma operação |
| Tarifas R$/h, inativar grupo de preço | Catálogo ORC (`PUT` G10) |
| Modelo inicial da EMP (JSON oficial) | Seed G10 + `seedModeloInicial` (BEM placeholder por grupo) — dados de teste/implantação **preservados** |

**1 grupo G10 → N bens** permanece: duas Reflexo 160 = dois BEM, um grupo de tarifa. Isso evita excesso de vínculos e duplicata de R$/h.

HTTP `POST /orcamento-catalogo/maquinas` é **recusado** no operacional: grupo novo só via patrimônio (ou seed/template).

---

## Consequências (agora)

- CRUD patrimônio e ficha A4 independentes do motor ORC.
- Catálogo ORC **edita tarifas** e **mostra** `bens_vinculados` (leitura, escopo `empresa_id`); não cadastra máquina física.
- Máquina gráfica nova exige grupo hora-máquina (existente ou nome novo). Bens já gravados sem ponte continuam válidos.
- Depreciação oficial / CIAP = contador; parâmetro `valor_minimo_capitalizar_bem` é só política gerencial.

## Consequências (futuro — permitido)

- OP / PCP / manutenção: FK para `bens_patrimoniais.id`.
- Compra de investimento → cria BEM (quando M07/financeiro existirem).
- Plano preventivo em tabela filha do BEM (não no G10).

## Proibido (regressão de domínio)

1. Fundir `orc_catalogo_maquinas` com patrimônio ou renomear G10 para “máquina física”.
2. Usar `orc_catalogo_maquina_id` como identificador da máquina na OP.
3. Obrigar 1:1 BEM↔G10 (duas impressoras Reflexo 160 = dois BEM, um grupo).
4. CMMS / inventário / depreciação fiscal automática “porque tem BEM”.
5. Quebrar tarifas ou seed G10 ao evoluir patrimônio.

Alterar esta ADR exige decisão explícita alinhada ao estudo 32 (Direção + engenharia).

---

## Rastreio no código

- Models: `BemPatrimonial`, `OrcCatalogoMaquina::bensPatrimoniais`
- Teste de arquitetura: `tests/Unit/BemOrcBoundaryTest.php`
- Regra Cursor: `.cursor/rules/bem-orc-boundary.mdc`
