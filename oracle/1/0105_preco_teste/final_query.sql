-- Query final que consome todas as views e aplica os filtros com parâmetros
-- Parâmetros: :P_PERIODO, :P_EMPRESA, :P_CODTAB, :P_CODPROD, :P_MARCA, :P_CODPARC

SELECT 
NVL(NUTAB,0) NUTAB,
CODTAB,
SUBSTR(NOMETAB, 1, 3) NOMETAB,
CODPROD,
DESCRPROD,
MARCA,
AD_QTDVOLLT,
POND_MARCA,
CUSTO_SATIS,
NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) AS PRECO_TAB,
NVL(((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) - CUSTO_SATIS) / NULLIF(NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0), 0)) * 100, 0) AS MARGEM,
NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) * 0.85 AS PRECO_TAB_MENOS15,
NVL((((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) * 0.85) - CUSTO_SATIS) / NULLIF(NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) * 0.85, 0)) * 100, 0) AS MARGEM_MENOS15,
NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) * 0.65 AS PRECO_TAB_MENOS65,
NVL((((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) * 0.65) - CUSTO_SATIS) / NULLIF(NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) * 0.65, 0)) * 100, 0) AS MARGEM_MENOS65,
NVL(TICKET_MEDIO_OBJETIVO,0) TICKET_MEDIO_OBJETIVO,
NVL(TICKET_MEDIO_PRO_ULT_12_M,0) TICKET_MEDIO_ULT_12_M,
NVL(TICKET_MEDIO_PRO_SAFRA,0) TICKET_MEDIO_SAFRA,
NVL(CUSTO_SATIS_ATU,0) CUSTO_SATIS_ATU
FROM VW_BASE_CONSOLIDADA
WHERE RN = 1
AND (:P_CODTAB IS NULL OR CODTAB = :P_CODTAB)
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
AND MARCA IN (:P_MARCA)
AND DTVIGOR <= :P_PERIODO

UNION ALL

SELECT 
NULL NUTAB,
CODTAB,
NOMETAB,
NULL CODPROD,
'1' DESCRPROD,
MARCA,
NULL AD_QTDVOLLT,
NULL POND_MARCA,
NULL DTVIGOR,
SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) AS CUSTO_SATIS,
SUM((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) AS PRECO_TAB,

NVL((
SUM((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
) / NULLIF(SUM((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM,

SUM((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.85 AS PRECO_TAB_MENOS15,

NVL((
SUM(((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0)*0.85) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
) / NULLIF( SUM(((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0)*0.85) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) , 0) * 100, 0) AS MARGEM_MENOS15,

SUM((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.65 AS PRECO_TAB_MENOS65,

NVL((
SUM(((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0)*0.65)  / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
) / NULLIF(SUM(((NVL(SNK_GET_PRECO(NUTAB, CODPROD, :P_PERIODO), 0)*0.65)  / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM_MENOS65,

TICKET_MEDIO_OBJETIVO_MARCA TICKET_MEDIO_OBJETIVO,
SUM(TICKET_MEDIO_ULT_12_M  * POND_MARCA) AS TICKET_MEDIO_ULT_12_M,
SUM(TICKET_MEDIO_SAFRA  * POND_MARCA) AS TICKET_MEDIO_SAFRA,
SUM((CUSTO_SATIS_ATU / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) CUSTO_SATIS_ATU
FROM VW_BASE_CONSOLIDADA
WHERE RN = 1
AND (:P_CODTAB IS NULL OR CODTAB = :P_CODTAB)
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
AND MARCA IN (:P_MARCA)
AND DTVIGOR <= :P_PERIODO
GROUP BY 
CODTAB,
NOMETAB,
MARCA,
TICKET_MEDIO_OBJETIVO_MARCA
ORDER BY 2,6,4 DESC; 