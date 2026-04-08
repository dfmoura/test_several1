SELECT ROUND(100 * AVG(TOTALUNID / NULLIF(QTDPREV, 0)), 2) AS PERCENTUAL
FROM (
    SELECT 
           SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(last_day(TO_DATE(MET.DTREF)),'DD')) *
                    (ABS((CASE WHEN TO_DATE('31/03/2026') > last_day(TO_DATE(MET.DTREF)) THEN last_day(TO_DATE(MET.DTREF)) ELSE TO_DATE('31/03/2026') END -  		TRUNC(MET.DTREF,'MM')))+1)) AS QTDPREV
            FROM TGMMET MET
            WHERE MET.CODMETA = 8
            AND MET.DTREF BETWEEN TRUNC(TO_DATE('01/03/2026'),'MM') AND '31/03/2026'
            AND MET.CODPROD = I.CODPROD) AS QTDPREV
    FROM TGFCAB C
    INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
    INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
    WHERE C.TIPMOV = 'F'
      AND C.CODTIPOPER IN (
                            SELECT
                            TOP.CODTIPOPER
                            FROM TGFTOP TOP
                            WHERE 
                            TOP.TIPMOV = 'F'
                            AND DHALTER = (SELECT MAX(T.DHALTER) FROM TGFTOP T WHERE T.CODTIPOPER = TOP.CODTIPOPER)
                          )
      AND C.DTNEG BETWEEN '01/03/2026' and '31/03/2026'
      AND I.USOPROD = 'V'
    GROUP BY
           I.CODPROD,
           I.CODVOL

    UNION ALL

    SELECT 
           0 AS TOTALUNID,
           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(last_day(TO_DATE(MET.DTREF)),'DD')) *
                    (ABS((CASE WHEN TO_DATE('31/03/2026') > last_day(TO_DATE(MET.DTREF)) THEN last_day(TO_DATE(MET.DTREF)) ELSE TO_DATE('31/03/2026') END -  		TRUNC(MET.DTREF,'MM')))+1)) AS QTDPREV
            FROM TGMMET MET
            WHERE MET.CODMETA = 8
            AND MET.DTREF BETWEEN TRUNC(TO_DATE('01/03/2026'),'MM') AND '31/03/2026'
            AND MET.CODPROD = P.CODPROD) AS QTDPREV
    FROM TGMMET M
    INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
    WHERE M.CODMETA = 8
      AND NVL(M.QTDPREV,0) <> 0
      AND NOT EXISTS (SELECT 1 FROM TGFITE I, TGFCAB C WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
      AND C.CODTIPOPER IN (
                            SELECT
                            TOP.CODTIPOPER
                            FROM TGFTOP TOP
                            WHERE 
                            TOP.TIPMOV = 'F'
                            AND DHALTER = (SELECT MAX(T.DHALTER) FROM TGFTOP T WHERE T.CODTIPOPER = TOP.CODTIPOPER)
                          )
    AND C.DTNEG BETWEEN '01/03/2026' and '31/03/2026' AND I.USOPROD = 'V')
    GROUP BY
           P.CODPROD,
           P.CODVOL
)
