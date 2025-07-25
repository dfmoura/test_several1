-- Exemplo de uso das views modulares
-- Este arquivo demonstra como utilizar as views criadas

-- 1. Primeiro, criar todas as views na ordem correta
-- Execute os arquivos na seguinte ordem:
--   view_custos_historicos.sql
--   view_custos_atuais.sql
--   view_ponderacoes_marca.sql
--   view_metas_objetivos.sql
--   view_faturamento_historico.sql
--   view_faturamento_safra.sql
--   view_precos_atuais.sql
--   view_base_consolidada.sql

-- 2. Exemplo de consulta usando apenas uma view específica
-- Consultar custos históricos para produtos específicos
SELECT * FROM VW_CUSTOS_HISTORICOS 
WHERE CODPROD IN (1001, 1002, 1003);

-- 3. Exemplo de consulta usando múltiplas views
-- Consultar produtos com suas ponderações e custos
SELECT 
  P.CODPROD,
  P.DESCRPROD,
  P.MARCA,
  P.POND_MARCA,
  C.CUSTO_SATIS
FROM VW_PONDERACOES_MARCA P
LEFT JOIN VW_CUSTOS_HISTORICOS C ON P.CODPROD = C.CODPROD
WHERE P.MARCA = 'MARCA_A';

-- 4. Exemplo de consulta usando a view consolidada
-- Consultar produtos com todas as métricas
SELECT 
  CODPROD,
  DESCRPROD,
  MARCA,
  CUSTO_SATIS,
  TICKET_MEDIO_OBJETIVO,
  TICKET_MEDIO_ULT_12_M
FROM VW_BASE_CONSOLIDADA
WHERE RN = 1
AND MARCA = 'MARCA_A'
ORDER BY CODPROD;

-- 5. Exemplo de uso da query final com parâmetros
-- Substitua os valores pelos parâmetros reais
/*
EXECUTE final_query.sql com os seguintes parâmetros:
:P_PERIODO = '2024-01-31'
:P_EMPRESA = 1
:P_CODTAB = 100
:P_CODPROD = NULL
:P_MARCA = ('MARCA_A', 'MARCA_B')
:P_CODPARC = NULL
*/

-- 6. Exemplo de consulta para análise de margens
-- Consultar produtos com margem baixa
SELECT 
  CODPROD,
  DESCRPROD,
  MARCA,
  CUSTO_SATIS,
  PRECO_TAB,
  MARGEM
FROM VW_BASE_CONSOLIDADA
WHERE RN = 1
AND MARGEM < 20
ORDER BY MARGEM;

-- 7. Exemplo de consulta para análise de ticket médio
-- Comparar ticket médio objetivo vs histórico
SELECT 
  MARCA,
  AVG(TICKET_MEDIO_OBJETIVO) AS TICKET_OBJETIVO_AVG,
  AVG(TICKET_MEDIO_ULT_12_M) AS TICKET_HISTORICO_AVG,
  AVG(TICKET_MEDIO_SAFRA) AS TICKET_SAFRA_AVG
FROM VW_BASE_CONSOLIDADA
WHERE RN = 1
GROUP BY MARCA
ORDER BY MARCA;

-- 8. Exemplo de consulta para análise de custos
-- Produtos com maior variação de custo
SELECT 
  CODPROD,
  DESCRPROD,
  MARCA,
  CUSTO_SATIS,
  CUSTO_SATIS_ATU,
  (CUSTO_SATIS_ATU - CUSTO_SATIS) AS VARIACAO_CUSTO
FROM VW_BASE_CONSOLIDADA
WHERE RN = 1
AND CUSTO_SATIS IS NOT NULL
AND CUSTO_SATIS_ATU IS NOT NULL
ORDER BY ABS(CUSTO_SATIS_ATU - CUSTO_SATIS) DESC; 