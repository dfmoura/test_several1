SELECT DISTINCT
TRUNC(X.DATA,'MM') AS DATA
, CUS.CUSSEMICM AS CUSTO
, CUS.CUSREP AS CUSREP
FROM 
(
SELECT
  (
    TO_DATE(SEQ.MM || SEQ.YYYY, 'MM/YYYY')-1
    -- Subtrai 1 por SEQ.NUM não começar em zero
  ) + SEQ.NUM AS "DATA" 
    FROM
    (
        SELECT RESULT NUM, 
        TO_CHAR(( -- Data Mínima
            TO_DATE('01/01/2020', 'DD/MM/YYYY')
            ) , 'MM') AS "MM",
        TO_CHAR(( -- Data Mínima
            TO_DATE('01/01/2020', 'DD/MM/YYYY')
            ) , 'YYYY') AS "YYYY"
        FROM
          (
          SELECT ROWNUM RESULT FROM DUAL CONNECT BY LEVEL <= (
                (
                -- Data Máxima
                LAST_DAY(TO_DATE('31/12/2099', 'DD/MM/YYYY'))
                -
                -- Data Mínima
                TRUNC(TO_DATE('01/01/2020', 'DD/MM/YYYY')) -- Sempre primeiro dia do mês
                ) + 1 -- Último dia do último ano
            )
          ) -- Quantas sequências para gerar pelo MAX

    ) SEQ
) X, TGFCUS CUS
WHERE 
CUS.DTATUAL = (SELECT MAX(DTATUAL) FROM TGFCUS WHERE DTATUAL <= TRUNC(X.DATA,'MM') AND CODEMP = 1 AND CODPROD = 736)
AND CUS.CODEMP = 1
AND CUS.CODPROD = 736
AND X.DATA >= ADD_MONTHS(TO_DATE('09-11-2023','DD-MM-YYYY'), -12) 
AND X.DATA < TO_DATE('09-11-2023','DD-MM-YYYY')