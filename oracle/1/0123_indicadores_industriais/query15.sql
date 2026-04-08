SELECT ANO,
       MES,
       MES_ANO,
       ROUND(100 * AVG(TOTALUNID / NULLIF(QTDPREV, 0)), 2) AS PERCENTUAL
FROM (
    SELECT 
           V.TOTALUNID,
           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(last_day(TO_DATE(MET.DTREF)),'DD')) *
                    (ABS((CASE WHEN LEAST(LAST_DAY(V.REF_DT), TO_DATE('31/03/2026')) > last_day(TO_DATE(MET.DTREF)) THEN last_day(TO_DATE(MET.DTREF)) ELSE LEAST(LAST_DAY(V.REF_DT), TO_DATE('31/03/2026')) END -  		TRUNC(MET.DTREF,'MM')))+1)) AS QTDPREV
            FROM TGMMET MET
            WHERE MET.CODMETA = 8
            AND MET.DTREF BETWEEN GREATEST(TRUNC(V.REF_DT,'MM'), TRUNC(TO_DATE('01/03/2026'),'MM')) AND LEAST(LAST_DAY(V.REF_DT), TO_DATE('31/03/2026'))
            AND MET.CODPROD = V.CODPROD) AS QTDPREV,
           TO_CHAR(V.REF_DT,'YYYY') AS ANO,
           TO_CHAR(V.REF_DT,'MM') AS MES,
           TO_CHAR(V.REF_DT,'MM/YYYY') AS MES_ANO
    FROM (
        SELECT I.CODPROD,
               I.CODVOL,
               SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
               MIN(C.DTNEG) AS REF_DT
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
               I.CODVOL,
               TO_CHAR(C.DTNEG,'YYYY'),
               TO_CHAR(C.DTNEG,'MM'),
               TO_CHAR(C.DTNEG,'MM/YYYY')
    ) V

    UNION ALL

    SELECT 
           0 AS TOTALUNID,
           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(last_day(TO_DATE(MET.DTREF)),'DD')) *
                    (ABS((CASE WHEN LEAST(LAST_DAY(M_REP), TO_DATE('31/03/2026')) > last_day(TO_DATE(MET.DTREF)) THEN last_day(TO_DATE(MET.DTREF)) ELSE LEAST(LAST_DAY(M_REP), TO_DATE('31/03/2026')) END -  		TRUNC(MET.DTREF,'MM')))+1)) AS QTDPREV
            FROM TGMMET MET
            WHERE MET.CODMETA = 8
            AND MET.DTREF BETWEEN GREATEST(TRUNC(M_REP,'MM'), TRUNC(TO_DATE('01/03/2026'),'MM')) AND LEAST(LAST_DAY(M_REP), TO_DATE('31/03/2026'))
            AND MET.CODPROD = META_SEM_VENDA.CODPROD) AS QTDPREV,
           TO_CHAR(TRUNC(M_REP,'MM'),'YYYY') AS ANO,
           TO_CHAR(TRUNC(M_REP,'MM'),'MM') AS MES,
           TO_CHAR(TRUNC(M_REP,'MM'),'MM/YYYY') AS MES_ANO
    FROM (
        SELECT MAX(M.DTREF) AS M_REP,
               P.CODPROD,
               P.CODVOL
        FROM TGMMET M
        INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
        WHERE M.CODMETA = 8
          AND NVL(M.QTDPREV,0) <> 0
          AND M.DTREF BETWEEN TRUNC(TO_DATE('01/03/2026'),'MM') AND TO_DATE('31/03/2026')
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
               TRUNC(M.DTREF,'MM'),
               P.CODPROD,
               P.CODVOL
    ) META_SEM_VENDA
)
GROUP BY ANO, MES, MES_ANO
ORDER BY ANO, MES
