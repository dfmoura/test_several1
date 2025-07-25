CREATE OR REPLACE VIEW VW_PONDERACOES_MARCA AS
-- View para ponderações por marca
-- Calcula a participação de cada produto na marca baseado nas vendas
SELECT 
CODEMP,
PROD,
CODPROD,
DESCRPROD,
MARCA,
CODGRUPOPROD,
DESCRGRUPOPROD,
ROUND(SUM(QTD) / NULLIF(SUM(SUM(QTD)) OVER (PARTITION BY CODEMP),0),2) AS POND_MARCA
FROM VGF_VENDAS_SATIS
WHERE CODEMP IS NOT NULL
AND MARCA IS NOT NULL
GROUP BY CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD; 