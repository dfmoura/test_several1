WITH TOT AS (
    SELECT TO_CHAR(CAB.dtmov, 'YYYY/MM') AS MES_ANO_VENDA,
           SUM(
               CASE
                   WHEN CAB.tipmov = 'D' THEN (ITE.vlrtot - ITE.vlrdesc - ITE.vlrrepred) * -1
                   ELSE (ITE.vlrtot - ITE.vlrdesc - ITE.vlrrepred)
               END
           ) AS FaturamentoMensal
    FROM tsiemp EMP
    INNER JOIN tgfcab CAB ON EMP.codemp = CAB.codemp
    INNER JOIN tgfite ITE ON CAB.nunota = ITE.nunota
    INNER JOIN tgftop TOP ON CAB.codtipoper = TOP.codtipoper AND CAB.dhtipoper = TOP.dhalter
    WHERE TOP.atualest <> 'N'
    AND CAB.tipmov IN ('V', 'D')
    AND CAB.statusnota = 'L'
    AND (CAB.statusnfe = 'A' OR CAB.statusnfe = 'T' OR CAB.statusnfe IS NULL)
    AND ((TOP.atualfin <> 0 AND TOP.tipatualfin = 'I') OR TOP.codtipoper IN (1112, 1113))
     	AND ((CAB.DTMOV >= :P_PERIODO.INI AND CAB.DTMOV <= :P_PERIODO.FIN)
 	OR (:P_PERIODO.INI IS NULL AND :P_PERIODO.FIN IS NULL)) 
    GROUP BY TO_CHAR(CAB.dtmov, 'YYYY/MM')
),
TOT_MARCA AS (
    SELECT TO_CHAR(CAB.dtmov, 'YYYY/MM') AS MES_ANO_VENDA,
           SUM(
               CASE
                   WHEN CAB.tipmov = 'D' THEN (ITE.vlrtot - ITE.vlrdesc - ITE.vlrrepred) * -1
                   ELSE (ITE.vlrtot - ITE.vlrdesc - ITE.vlrrepred)
               END
           ) AS FaturamentoMensal
    FROM tsiemp EMP
    INNER JOIN tgfcab CAB ON EMP.codemp = CAB.codemp
    INNER JOIN tgfite ITE ON CAB.nunota = ITE.nunota
    INNER JOIN tgfpro PRO ON ITE.codprod = PRO.codprod
    INNER JOIN tgftop TOP ON CAB.codtipoper = TOP.codtipoper AND CAB.dhtipoper = TOP.dhalter
    WHERE TOP.atualest <> 'N'
    AND CAB.tipmov IN ('V', 'D')
    AND CAB.statusnota = 'L'
    AND (CAB.statusnfe = 'A' OR CAB.statusnfe = 'T' OR CAB.statusnfe IS NULL)
    AND ((TOP.atualfin <> 0 AND TOP.tipatualfin = 'I') OR TOP.codtipoper IN (1112, 1113))
    AND PRO.marca IN (SELECT marca FROM tgfpro WHERE codprod IN (SELECT codmarca FROM ad_grumarcaite WHERE codgru IN :P_CODGRU))
 	AND ((CAB.DTMOV >= :P_PERIODO.INI AND CAB.DTMOV <= :P_PERIODO.FIN)
 	OR (:P_PERIODO.INI IS NULL AND :P_PERIODO.FIN IS NULL))  
    GROUP BY TO_CHAR(CAB.dtmov, 'YYYY/MM')
)

SELECT TOT.MES_ANO_VENDA,
       (TOT_MARCA.FaturamentoMensal / TOT.FaturamentoMensal)*100 AS PERC_FATMENSAL,
       ((SUM(TOT_MARCA.FaturamentoMensal) OVER (ORDER BY TO_DATE(TOT.MES_ANO_VENDA, 'YYYY/MM')))/
       (SUM(TOT.FaturamentoMensal) OVER (ORDER BY TO_DATE(TOT.MES_ANO_VENDA, 'YYYY/MM'))))*100 AS ACUMULADO_PERC_FatMensalMarca
FROM TOT
INNER JOIN TOT_MARCA ON TOT.MES_ANO_VENDA = TOT_MARCA.MES_ANO_VENDA
ORDER BY TOT.MES_ANO_VENDA
