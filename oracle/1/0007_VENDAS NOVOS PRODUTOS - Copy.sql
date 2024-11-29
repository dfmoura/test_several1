SELECT     ad_gruite.codgru,
           ad_grucab.descrgru,
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
    INNER JOIN ad_grumarcaite AD_GRUITE ON ITE.codprod = AD_GRUITE.codmarca
    INNER JOIN ad_grumarcacab AD_GRUCAB ON AD_GRUITE.codgru = AD_GRUCAB.codgru
    WHERE TOP.atualest <> 'N'
    AND CAB.tipmov IN ('V', 'D')
    AND CAB.statusnota = 'L'
    AND (CAB.statusnfe = 'A' OR CAB.statusnfe = 'T' OR CAB.statusnfe IS NULL)
    AND ((TOP.atualfin <> 0 AND TOP.tipatualfin = 'I') OR TOP.codtipoper IN (1112, 1113))
    AND ((CAB.DTMOV >= :P_PERIODO.INI AND CAB.DTMOV <= :P_PERIODO.FIN)
     OR (:P_PERIODO.INI IS NULL AND :P_PERIODO.FIN IS NULL)) 
    AND AD_GRUITE.codgru IN :P_CODGRU
    GROUP BY ad_gruite.codgru, ad_grucab.descrgru
    ORDER BY 1