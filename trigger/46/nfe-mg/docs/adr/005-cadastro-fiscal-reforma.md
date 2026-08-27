# ADR-005 — Cadastro fiscal completo (parceiros + produtos) com reforma IBS/CBS/IS

## Status

Aceito — 2026-08-27

## Contexto

O módulo NF-e MG já emite sob layout **PL_009 / 4.00** (ICMS clássico). A reforma tributária (EC 132 / LC 214 / IT NF-e 2025.002) introduz **IBS**, **CBS** e **Imposto Seletivo (IS)**. “SBS” no vocabulário de negócio refere-se a esse pacote (CBS + IBS), não a um tributo distinto.

Sem parametrização no cadastro, o sistema ficaria incapaz de:

- apurar corretamente operações na transição Simples → Lucro Real;
- classificar destinatários (indIEDest, finalidade, consumidor final, crédito de entrada);
- preparar itens para o grupo UB (IBS/CBS) e IS quando a SEFAZ exigir no XML.

Referências internas: padrões do ERP em `trigger/39` (ParceiroFiscalRules, campos CBS) e especificação de cadastros em `trigger/32`.

## Decisão

1. **Cadastro-first, emissão-depois**  
   Enriquecer `produto` e `destinatario` (parceiro multi-papel) com todos os campos necessários às apurações atuais e à reforma. **Não alterar** o builder XML PL_009 nesta fase — evita rejeição em homologação/produção atual.

2. **Parceiro único com papéis**  
   Manter a tabela `destinatario` (compatibilidade com `nfe.destinatario_id`) e evoluí-la com flags `papel_cliente` / `papel_fornecedor` / `papel_transportadora`, finalidade, regime, IE status, SUFRAMA, e-mail XML, etc. Alias de API: `/v1/parceiros`.

3. **Produto com dois eixos fiscais**  
   - Regime atual: NCM, CFOP, origem, CSOSN/CST, CEST, PIS/COFINS, tipo SPED, GTIN.  
   - Reforma: `cst_ibs_cbs` (CST compartilhado), `cclass_trib`, alíquotas IBS/CBS, flags/CST/alíquota IS.

4. **Aptidão calculada (não bloqueia CRUD)**  
   Serviços de domínio `evaluateParceiroFiscal` / `evaluateProdutoFiscal` retornam `aptoEmissaoNfe`, `aptoReforma` e pendências. A UI e futuros checklists de emissão consomem isso; o cadastro parcial permanece permitido.

5. **cClassTrib manda no CST IBS/CBS**  
   Ao informar `cClassTrib` (6 dígitos), os 3 primeiros preenchem `cst_ibs_cbs`. Alias de entrada `cstCbs` aceito por compatibilidade com o ERP 39.

## Consequências

- Positivo: sistema condizente com a legislação atual e preparado para a reforma sem big-bang no XML.  
- Positivo: um único cadastro de parceiro evita duplicidade cliente/fornecedor.  
- Neutro: emissão IBS/CBS/IS no XML fica para ADR futuro quando o schema SEFAZ-MG estiver obrigatório.  
- Risco mitigado: catálogos CST/cClassTrib são subset curado — atualizar quando a tabela oficial nacional mudar.

## Não fazer (nesta ADR)

- Renomear tabela `destinatario` → `parceiro` (quebra FKs).  
- Emitir grupo `IBSCBS` / `IS` no XML antes da NT/layout oficial em produção MG.  
- Inventar alíquotas oficiais de transição no código — alíquotas são parametrização de cadastro/contador.
