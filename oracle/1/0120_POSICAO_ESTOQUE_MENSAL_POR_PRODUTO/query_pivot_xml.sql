-- Query dinâmica usando XML PIVOT para gerar colunas automáticas por mês
-- Baseada na query2.sql, mas com PIVOT XML para criar colunas dinamicamente

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

-- Query principal com PIVOT XML dinâmico
SELECT CODPROD,
       DESCRPROD,
       DESCRGRUPOPROD,
       PIVOT_XML
FROM (
    SELECT CODPROD,
           DESCRPROD,
           DESCRGRUPOPROD,
           ULTIMO_DIA_MES,
           ESTOQUE
    FROM ESTOQUE_AGREGADO
)
PIVOT XML (
    SUM(ESTOQUE) AS ESTOQUE
    FOR ULTIMO_DIA_MES IN (ANY)
)
ORDER BY CODPROD;
