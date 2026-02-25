-- FILTRAR_ESTOQUE_POSITIVO: 'S' = só registros com ESTOQUE > 0; 'N' ou NULL = não aplica filtro (mantém ESTOQUE <> 0)
SELECT CODPROD,
       DESCRPROD,
       DESCRGRUPOPROD,
       CODEMP,
       ESTOQUE,
       DTVAL,
       DESCRLOCAL,
       CUSUNIT,
       LOTE,
       CUSTOTAL
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
                                         WHERE DTNEG > :DATAPERIODO)),0) AS ESTOQUE,
          
          LOC.DESCRLOCAL,

     (SELECT CUS.CUSMEDICM
      FROM TGFCUS CUS
      WHERE CUS.CODEMP = EST.CODEMP
        AND CUS.CODPROD = EST.CODPROD
        AND CUS.DTATUAL =
          (SELECT MAX(C.DTATUAL)
           FROM TGFCUS C
           WHERE C.CODEMP = CUS.CODEMP
             AND C.CODPROD = CUS.CODPROD
             AND C.DTATUAL <= :DATAPERIODO)) AS CUSUNIT,
          EST.CONTROLE AS LOTE,
          (SUM(EST.ESTOQUE) - NVL(
                                    (SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE)
                                     FROM TGFITE ITE
                                     WHERE ITE.RESERVA = 'N'
                                       AND EST.CODEMP = ITE.CODEMP
                                       AND ITE.CODPROD = EST.CODPROD
                                       AND ITE.CODLOCALORIG = EST.CODLOCAL
                                       AND ITE.CONTROLE = EST.CONTROLE
                                       AND ITE.ATUALESTOQUE <> 0
                                       AND ITE.NUNOTA IN
                                         (SELECT NUNOTA
                                          FROM TGFCAB
                                          WHERE DTNEG > :DATAPERIODO)),0)) *
     (SELECT CUS.CUSMEDICM
      FROM TGFCUS CUS
      WHERE CUS.CODEMP = EST.CODEMP
        AND CUS.CODPROD = EST.CODPROD
        AND CUS.DTATUAL =
          (SELECT MAX(C.DTATUAL)
           FROM TGFCUS C
           WHERE C.CODEMP = CUS.CODEMP
             AND C.CODPROD = CUS.CODPROD
             AND C.DTATUAL <= :DATAPERIODO)) AS custotal
   FROM TGFEST EST,
        TGFPRO PRO,
        TGFLOC LOC,
        TGFGRU GRU
   WHERE EST.CODPROD = PRO.CODPROD
     AND EST.CODLOCAL = LOC.CODLOCAL
     AND GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
     AND PRO.CODGRUPOPROD IN :CODGRUPOPROD
     AND EST.CODLOCAL IN :CODLOCAL
   GROUP BY PRO.CODPROD,
            PRO.DESCRPROD,
            GRU.DESCRGRUPOPROD,
            LOC.DESCRLOCAL,
            EST.CONTROLE,
            EST.CODLOCAL,
            EST.CODPROD,
            EST.CODEMP,
            EST.DTVAL)
WHERE ESTOQUE <> 0
  AND (NVL(:FILTRAR_ESTOQUE_POSITIVO, 'N') = 'N' OR ESTOQUE > 0)
ORDER BY 2