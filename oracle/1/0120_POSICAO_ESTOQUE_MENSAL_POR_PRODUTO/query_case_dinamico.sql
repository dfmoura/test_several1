-- Query dinâmica usando CASE para gerar colunas automáticas por mês
-- Baseada na query2.sql, mas com CASE dinâmico para criar colunas automaticamente

WITH MESES_INTERVALO AS (
    -- Gera todos os meses entre as datas informadas
    SELECT 
        ADD_MONTHS(
            TRUNC(TO_DATE('01/01/2025', 'DD/MM/YYYY'), 'MM'), 
            LEVEL - 1
        ) AS DATA_MES,
        LAST_DAY(
            ADD_MONTHS(
                TRUNC(TO_DATE('01/01/2025', 'DD/MM/YYYY'), 'MM'), 
                LEVEL - 1
            )
        ) AS ULTIMO_DIA_MES
    FROM DUAL
    CONNECT BY LEVEL <= MONTHS_BETWEEN(
        TRUNC(TO_DATE('26/09/2025', 'DD/MM/YYYY'), 'MM'), 
        TRUNC(TO_DATE('01/01/2025', 'DD/MM/YYYY'), 'MM')
    ) + 1
),
ESTOQUE_BASE AS (
    -- Busca o estoque base para cada produto
    SELECT PRO.CODPROD,
           PRO.DESCRPROD,
           GRU.DESCRGRUPOPROD,
           EST.CODEMP,
           EST.CODLOCAL,
           EST.CONTROLE,
           SUM(EST.ESTOQUE) AS ESTOQUE_BASE
    FROM TGFEST EST,
         TGFPRO PRO,
         TGFLOC LOC,
         TGFGRU GRU
    WHERE EST.CODPROD = PRO.CODPROD
      AND EST.CODLOCAL = LOC.CODLOCAL
      AND GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    GROUP BY PRO.CODPROD,
             PRO.DESCRPROD,
             GRU.DESCRGRUPOPROD,
             EST.CODEMP,
             EST.CODLOCAL,
             EST.CONTROLE
),
ESTO AS (
    SELECT EB.CODPROD,
           EB.DESCRPROD,
           EB.DESCRGRUPOPROD,
           MI.ULTIMO_DIA_MES,
           TO_CHAR(MI.ULTIMO_DIA_MES, 'MM/YYYY') AS PERIODO,
           -- Calcula o estoque final considerando movimentações posteriores
           EB.ESTOQUE_BASE - NVL(
               (SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
                FROM TGFITE ITE
                WHERE ITE.RESERVA = 'N'
                  AND ITE.CODEMP = EB.CODEMP
                  AND ITE.CODPROD = EB.CODPROD
                  AND ITE.CODLOCALORIG = EB.CODLOCAL
                  AND ITE.CONTROLE = EB.CONTROLE
                  AND ITE.ATUALESTOQUE <> 0
                  AND ITE.NUNOTA IN
                    (SELECT NUNOTA
                     FROM TGFCAB
                     WHERE DTNEG > MI.ULTIMO_DIA_MES)), 0) AS ESTOQUE
    FROM ESTOQUE_BASE EB
    CROSS JOIN MESES_INTERVALO MI
    WHERE EB.ESTOQUE_BASE - NVL(
               (SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
                FROM TGFITE ITE
                WHERE ITE.RESERVA = 'N'
                  AND ITE.CODEMP = EB.CODEMP
                  AND ITE.CODPROD = EB.CODPROD
                  AND ITE.CODLOCALORIG = EB.CODLOCAL
                  AND ITE.CONTROLE = EB.CONTROLE
                  AND ITE.ATUALESTOQUE <> 0
                  AND ITE.NUNOTA IN
                    (SELECT NUNOTA
                     FROM TGFCAB
                     WHERE DTNEG > MI.ULTIMO_DIA_MES)), 0) <> 0
),
ESTOQUE_AGREGADO AS (
    -- Agrega o estoque por produto e mês
    SELECT CODPROD,
           DESCRPROD,
           DESCRGRUPOPROD,
           ULTIMO_DIA_MES,
           SUM(ESTOQUE) AS ESTOQUE
    FROM ESTO
    GROUP BY CODPROD, DESCRPROD, DESCRGRUPOPROD, ULTIMO_DIA_MES
)

-- Query principal com CASE dinâmico para cada mês
SELECT CODPROD,
       DESCRPROD,
       DESCRGRUPOPROD,
       -- Gera colunas dinamicamente usando CASE
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('31/01/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_JAN_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('28/02/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_FEV_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('31/03/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_MAR_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('30/04/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_ABR_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('31/05/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_MAI_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('30/06/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_JUN_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('31/07/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_JUL_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('31/08/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_AGO_2025,
       SUM(CASE WHEN ULTIMO_DIA_MES = TO_DATE('30/09/2025', 'DD/MM/YYYY') THEN ESTOQUE ELSE 0 END) AS ESTOQUE_SET_2025
FROM ESTOQUE_AGREGADO
GROUP BY CODPROD, DESCRPROD, DESCRGRUPOPROD
ORDER BY CODPROD;
