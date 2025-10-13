
SELECT CODPROD,
       DESCRPROD,
       DESCRGRUPOPROD,
       
       SUM(ESTOQUE)ESTOQUE,
       SUM(ESTOQUE1)ESTOQUE1,
       SUM(ESTOQUE2)ESTOQUE2
--       SUM(ESTOQUE * AD_QTDVOLLT) AS EST_LT
FROM
  (SELECT PRO.CODPROD,
          PRO.DESCRPROD,
          GRU.DESCRGRUPOPROD,
          EST.CODEMP,
          EST.DTVAL,
          SUM(EST.ESTOQUE) - NVL(
                                   (SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE)
                                    FROM TGFITE ITE
                                    WHERE ITE.RESERVA = 'N'
                                      AND ITE.CODEMP = EST.CODEMP
                                      AND ITE.CODPROD = EST.CODPROD
                                      AND ITE.CODLOCALORIG = EST.CODLOCAL
                                      AND ITE.CONTROLE = EST.CONTROLE
                                      AND ITE.ATUALESTOQUE <> 0
                                      AND ITE.NUNOTA IN
                                        (SELECT NUNOTA
                                         FROM TGFCAB
                                         WHERE DTNEG > '26/09/2025')),0) AS ESTOQUE,
          SUM(EST.ESTOQUE) - NVL(
                                   (SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE)
                                    FROM TGFITE ITE
                                    WHERE ITE.RESERVA = 'N'
                                      AND ITE.CODEMP = EST.CODEMP
                                      AND ITE.CODPROD = EST.CODPROD
                                      AND ITE.CODLOCALORIG = EST.CODLOCAL
                                      AND ITE.CONTROLE = EST.CONTROLE
                                      AND ITE.ATUALESTOQUE <> 0
                                      AND ITE.NUNOTA IN
                                        (SELECT NUNOTA
                                         FROM TGFCAB
                                         WHERE DTNEG > '31/08/2025')),0) AS ESTOQUE1,
          SUM(EST.ESTOQUE) - NVL(
                                   (SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE)
                                    FROM TGFITE ITE
                                    WHERE ITE.RESERVA = 'N'
                                      AND ITE.CODEMP = EST.CODEMP
                                      AND ITE.CODPROD = EST.CODPROD
                                      AND ITE.CODLOCALORIG = EST.CODLOCAL
                                      AND ITE.CONTROLE = EST.CONTROLE
                                      AND ITE.ATUALESTOQUE <> 0
                                      AND ITE.NUNOTA IN
                                        (SELECT NUNOTA
                                         FROM TGFCAB
                                         WHERE DTNEG > '31/07/2025')),0) AS ESTOQUE2
          --PRO.AD_QTDVOLLT

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
            LOC.DESCRLOCAL,
            EST.CONTROLE,
            EST.CODLOCAL,
            EST.CODPROD,
            EST.CODEMP,
            EST.DTVAL,
            PRO.AD_QTDVOLLT)
WHERE ESTOQUE <> 0
GROUP BY

CODPROD,
DESCRPROD,
DESCRGRUPOPROD

ORDER BY 2