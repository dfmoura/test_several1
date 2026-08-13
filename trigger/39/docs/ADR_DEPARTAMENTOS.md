# ADR-039-DEP-001 — Departamentos (DEP) ≠ Centro de custo

**Status:** Aceito (emenda 2026-08-11 — local BEM = DEP)  
**Data:** 2026-08-11  
**Norma:** `../32` — `CADASTRO_PARCEIROS.txt` · `RH_PAGAMENTO_GERENCIAL.txt` · `ORGANIZACAO_USUARIOS_PERFIS_ACESSO.txt` · `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `PATRIMONIO_CONTROLE.txt`  
**Relacionada:** `ADR_NATUREZAS_GERENCIAIS.md` (CC futuro) · `ADR_BEM_VS_ORC_MAQUINA.md`

---

## Decisão

| Conceito | Tabela / código | Papel |
|----------|-----------------|--------|
| **Departamento** | `departamentos` · `DEP-NNNNN` | Unidade organizacional da EMP. Lista plana por EMP. |
| **Centro de custo** | *(futuro)* · `cc_id` | Dimensão financeira *onde* do lançamento. Natureza = *o quê*; CC = *onde*. **≠** DEP. |
| **Local do patrimônio (BEM)** | `bens_patrimoniais.departamento_id` + espelho `local` | **É o departamento** da EMP onde o ativo está / pertence (estudo 32: *local / setor*). |
| **“Departamento pessoal”** | *(fora do ERP)* | RH/folha do escritório contábil. Fora de escopo. |

**Uma tabela DEP por EMP; zero hierarquia; zero fusão com CC. Consumidores: colaborador (PAR) e local do BEM.**

---

## Modelo

- Escopo: **`empresa_id`** (isolamento lógico multi-EMP).  
- Campos: `codigo` (`DEP-`), `nome`, `ativo`, softDeletes.  
- Consumidores:
  - `parceiros.departamento_id` (papel COLABORADOR)
  - `bens_patrimoniais.departamento_id` (local / setor do ativo)
- Espelhos denormalizados (`parceiros.departamento`, `bens_patrimoniais.local`): nome do DEP para lista/busca/ficha; **não** são fonte da verdade.  
- Mutabilidade: criar / editar nome / soft-inativar; hard-delete só se sem vínculos (PAR ou BEM).

## Seeds canônicos (sugestão por EMP)

Comercial · Produção · Expedição · Financeiro · Fiscal · Administrativo · Operacional  
(valores do estudo 32 + uso já existente no seeder). Locais legados de BEM (ex.: `TI / Escritório`) viram DEP na migração.

---

## Consequências (agora)

- CRUD + `GET /consulta/departamentos` (ativos da EMP) para picker.  
- UI Cadastros → Departamentos; select no colaborador **e** no patrimônio (campo Local).  
- Permissões `departamento.ler` / `departamento.escrever`.

## Consequências (futuro — permitido, não nesta entrega)

- Centro de custo (`cc_id`) em TIT / RH / patrimônio gerencial (**ainda ≠ DEP**).  
- Sugestão de perfil Spatie a partir de cargo/departamento (processo humano hoje).  
- Endereço físico detalhado (prédio/sala) — só com ADR novo; não reabre texto livre no lugar do DEP.

## Proibido (regressão de domínio)

1. Fundir Departamento com Centro de custo ou Natureza gerencial.  
2. Catálogo global de DEP (sem `empresa_id`).  
3. Hierarquia de departamentos sem ADR.  
4. Automatizar troca de perfil RBAC só porque o departamento mudou, sem ADR de acesso.  
5. Voltar `BEM.local` a texto livre como fonte da verdade (fonte = `departamento_id`).

Alterar esta ADR exige decisão explícita alinhada ao estudo 32 (Direção + engenharia).

---

## Rastreio no código

- Model / service: `Departamento`, `DepartamentoService`, `DepartamentoValidationRules`
- API: `DepartamentoController`, `GET /consulta/departamentos`
- Web: `DepartamentosPage`, select em `ParceiroFormPage` e `PatrimonioFormPage`
- Regra Cursor: `.cursor/rules/departamentos.mdc`
- Teste: `tests/Feature/DepartamentoTest.php` · `tests/Feature/BemPatrimonialTest.php`
