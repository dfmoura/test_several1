# 📋 Guia de Execução - Sistema Orçamentário

## Ordem de Execução

Execute os prompts **na ordem sequencial** abaixo no Mitralab (Gemini):

### ✅ ETAPA 01 - Criação das Tabelas

**Arquivo:** `ETAPA_01_Criacao_Tabelas.md`

- Execute primeiro
- Cria estrutura de banco completa
- Verifique se todas as 7 tabelas foram criadas

### ✅ ETAPA 02 - Dados Mestre

**Arquivo:** `ETAPA_02_Dados_Mestre.md`

- Cria procedures para CRUD de:
  - Centros de Resultado
  - Contas Contábeis
  - Histórico Contábil

### ✅ ETAPA 03 - Gestão de Versões

**Arquivo:** `ETAPA_03_Gestao_Versoes.md`

- Cria versões orçamentárias
- Gerencia ciclo completo
- Lista status dos CRs

### ✅ ETAPA 04 - Preenchimento CR

**Arquivo:** `ETAPA_04_Preenchimento_CR.md`

- Gestores preenchem orçamento
- Salvar rascunho / submeter
- Visualizar planejamento

### ✅ ETAPA 05 - Aprovação

**Arquivo:** `ETAPA_05_Aprovacao.md`

- Controladoria aprova/rejeita
- Workflow de aprovação
- Notificações

### ✅ ETAPA 06 - Consolidação

**Arquivo:** `ETAPA_06_Consolidacao.md`

- Gera DRE consolidado
- Exporta dados
- KPIs e relatórios

---

## 🎯 Dicas Importantes

1. **Execute uma etapa por vez** - não carregue tudo de uma vez
2. **Valide o resultado** antes de prosseguir
3. **Use dados de teste** para validar cada etapa
4. **Em caso de erro:** revise SQL na etapa específica

## 📝 Estrutura Final

**7 Tabelas:**

1. CENTRO_RESULTADO
2. CONTA_CONTABIL
3. HISTORICO_CONTABIL
4. VERSAO
5. STATUS_CR_VERSAO
6. FORECAST
7. NOTIFICACAO

**Procedures por Etapa:**

- Etapa 02: ~10 procedures
- Etapa 03: ~4 procedures
- Etapa 04: ~4 procedures
- Etapa 05: ~4 procedures
- Etapa 06: ~4 procedures

---

**Total estimado:** ~26 procedures/funções SQL
