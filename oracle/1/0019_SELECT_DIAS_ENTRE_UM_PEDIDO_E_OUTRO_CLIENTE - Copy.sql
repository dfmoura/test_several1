/* TOTAL DE DIAS MEDIOS ENTRE UM PEDIDO E OUTRO POR CLIENTE */

WITH OrderData AS (
    SELECT 
        CAB.CODPARC,
        PAR.RAZAOSOCIAL,
        CAB.NUNOTA,
        CAB.DTNEG,
        LAG(CAB.DTNEG) OVER (PARTITION BY CAB.CODPARC ORDER BY CAB.DTNEG) AS PREVIOUS_DTNEG,
        SUM(
            CASE 
                WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 
                ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) 
            END
        ) AS VLRFAT
    FROM 
        TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER 
            AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    WHERE 
        TOP.GOLSINAL = -1
        AND (CAB.DTNEG BETWEEN '01-10-2023' AND '22-11-2023')
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        AND PRO.AD_TPPROD IS NOT NULL
    GROUP BY 
        CAB.CODPARC, PAR.RAZAOSOCIAL, CAB.NUNOTA, CAB.DTNEG
),
DIAS AS (SELECT 
    CODPARC,
    RAZAOSOCIAL,
    NUNOTA,
    DTNEG,
    PREVIOUS_DTNEG,
    VLRFAT,
    CASE 
        WHEN PREVIOUS_DTNEG IS NOT NULL THEN DTNEG - PREVIOUS_DTNEG
        ELSE NULL
    END AS DAYS_BETWEEN_ORDERS
FROM 
    OrderData
ORDER BY 
    CODPARC, DTNEG)
    
SELECT
CODPARC
, RAZAOSOCIAL
, AVG(DAYS_BETWEEN_ORDERS) DIAS
FROM DIAS
WHERE DAYS_BETWEEN_ORDERS > 0
GROUP BY 
CODPARC , RAZAOSOCIAL