# Modularização da Query Principal

## Visão Geral

A query principal foi dividida em múltiplas views reutilizáveis para melhor organização, manutenibilidade e performance. Cada view tem uma responsabilidade específica e pode ser utilizada independentemente.

## Estrutura das Views

### 1. `view_custos_historicos.sql` - VW_CUSTOS_HISTORICOS
**Responsabilidade**: Calcula o custo de satisfação histórico por produto e empresa
- **Entrada**: TGFCUS
- **Saída**: CODPROD, CODEMP, CUSTO_SATIS
- **Lógica**: Obtém o custo mais recente por produto usando ROW_NUMBER()

### 2. `view_custos_atuais.sql` - VW_CUSTOS_ATUAIS
**Responsabilidade**: Calcula o custo de satisfação atual por produto e empresa
- **Entrada**: TGFCUS
- **Saída**: CODPROD, CODEMP, CUSTO_SATIS
- **Lógica**: Obtém o custo atual usando SYSDATE

### 3. `view_ponderacoes_marca.sql` - VW_PONDERACOES_MARCA
**Responsabilidade**: Calcula a participação de cada produto na marca
- **Entrada**: VGF_VENDAS_SATIS
- **Saída**: CODEMP, CODPROD, DESCRPROD, MARCA, POND_MARCA
- **Lógica**: Calcula ponderação baseada na quantidade vendida

### 4. `view_metas_objetivos.sql` - VW_METAS_OBJETIVOS
**Responsabilidade**: Calcula o ticket médio objetivo por marca
- **Entrada**: TGFMET, AD_PRECOMARCA, VGF_VENDAS_SATIS
- **Saída**: MARCA, TICKET_MEDIO_OBJETIVO
- **Lógica**: Agrega metas e preços por marca

### 5. `view_faturamento_historico.sql` - VW_FATURAMENTO_HISTORICO
**Responsabilidade**: Calcula métricas de vendas dos últimos 12 meses
- **Entrada**: VGF_VENDAS_SATIS
- **Saída**: CODPROD, MARCA, TICKET_MEDIO_ULT_12_M
- **Lógica**: Agrega vendas por produto

### 6. `view_faturamento_safra.sql` - VW_FATURAMENTO_SAFRA
**Responsabilidade**: Calcula métricas de vendas do período da safra
- **Entrada**: VGF_VENDAS_SATIS
- **Saída**: CODPROD, MARCA, TICKET_MEDIO_SAFRA
- **Lógica**: Agrega vendas do período safra por produto

### 7. `view_precos_atuais.sql` - VW_PRECOS_ATUAIS
**Responsabilidade**: Obtém os preços vigentes por produto e tabela
- **Entrada**: TGFPRO, TGFEXC, TGFTAB, TGFNTA
- **Saída**: CODTAB, CODPROD, VLRVENDA_ATUAL
- **Lógica**: Obtém preço mais recente por produto/tabela

### 8. `view_base_consolidada.sql` - VW_BASE_CONSOLIDADA
**Responsabilidade**: Integra todas as informações de produtos, preços, custos e métricas
- **Entrada**: Todas as views anteriores + TGFPRO, TGFTAB, TGFNTA
- **Saída**: Dados consolidados com todas as métricas
- **Lógica**: JOIN de todas as views com produtos e tabelas

## Query Final

### `final_query.sql`
**Responsabilidade**: Query final que consome todas as views e aplica filtros
- **Parâmetros de entrada**:
  - `:P_PERIODO` - Período de referência
  - `:P_EMPRESA` - Código da empresa
  - `:P_CODTAB` - Código da tabela (opcional)
  - `:P_CODPROD` - Código do produto (opcional)
  - `:P_MARCA` - Marcas (obrigatório)
  - `:P_CODPARC` - Código do parceiro (opcional)

## Vantagens da Modularização

1. **Reutilização**: Cada view pode ser utilizada independentemente
2. **Manutenibilidade**: Mudanças em uma lógica específica afetam apenas uma view
3. **Performance**: Views podem ser otimizadas individualmente
4. **Testabilidade**: Cada view pode ser testada isoladamente
5. **Legibilidade**: Código mais organizado e fácil de entender

## Ordem de Execução

1. Criar todas as views na ordem apresentada
2. Executar a query final com os parâmetros desejados

## Observações

- As views não contêm parâmetros de entrada, apenas a estrutura fixa
- Os filtros com parâmetros são aplicados apenas na query final
- A view base consolidada (VW_BASE_CONSOLIDADA) é a única que consome outras views
- Todas as views mantêm a lógica original da query principal 