# ETAPA 04 - Preenchimento por CR

## Prompt para o Gemini:

```
Crie procedures/funções SQL para o gestor preencher orçamento:

**1. Salvar Rascunho**
- Procedure: SALVAR_FORECAST_RASCUNHO
- Input: (id_versao, id_cr, id_conta, mes, valor_planejado)
- Ação:
  1. Insere ou atualiza na tabela FORECAST
  2. Mantém status do CR como 'Pendente_Preenchimento'

**2. Submeter para Aprovação**
- Procedure: SUBMETER_CR
- Input: (id_versao, id_cr)
- Ação:
  1. Valida se existem valores preenchidos
  2. Altera status para 'Enviado_Aprovacao'
  3. Registra data_submissao
  4. Previne edição posterior (bloqueio)

**3. Visualizar Planejamento**
- Function: VISUALIZAR_MEU_ORCAMENTO(id_versao, id_cr)
- Retorna:
  - Informações da versão
  - Status do CR
  - Grade com: (codigo_conta, descricao_conta, mes, valor_planejado, valor_historico)
  - Totais por conta (soma 12 meses)
  - Total mensal do CR

**4. Obter Histórico de Referência**
- Function: HISTORICO_REFERENCIA(id_cr, mes)
- Retorna valor médio histórico para ajudar gestor

Use Oracle SQL. Faça batch update para salvar múltiplos valores de uma vez.
```

**Bloqueio:** Após submeter, CR fica readonly até rejeição.
