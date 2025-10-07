-- Query para apresentar o último saldo do estoque mês a mês
-- Utiliza DTNEG para demonstrar o período do intervalo de datas

SELECT CODPROD,
       DESCRPROD,
       DESCRGRUPOPROD,
       ESTOQUE,
       TO_CHAR(DTNEG, 'MM/YYYY') AS DATA_PERIODO
FROM
  (SELECT PRO.CODPROD,
          PRO.DESCRPROD,
          GRU.DESCRGRUPOPROD,
          EST.CODEMP,
          CAB.DTNEG,
          -- Calcula o estoque considerando movimentações posteriores à data de negociação
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
                                         WHERE DTNEG > CAB.DTNEG)),0) AS ESTOQUE,
          
          ROW_NUMBER() OVER (PARTITION BY PRO.CODPROD, 
                                        TO_CHAR(CAB.DTNEG, 'MM/YYYY') 
                            ORDER BY CAB.DTNEG DESC) AS RN
   FROM TGFEST EST,
        TGFPRO PRO,
        TGFLOC LOC,
        TGFGRU GRU,
        TGFCAB CAB
   WHERE EST.CODPROD = PRO.CODPROD
     AND EST.CODLOCAL = LOC.CODLOCAL
     AND GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
     AND CAB.DTNEG BETWEEN '01/01/2025' and '31/08/2025'--:DATA_INICIO AND :DATA_FIM  -- Parâmetros para intervalo de datas
   GROUP BY PRO.CODPROD,
            PRO.DESCRPROD,
            GRU.DESCRGRUPOPROD,
            EST.CODLOCAL,
            EST.CONTROLE,
            EST.CODPROD,
            EST.CODEMP,
            CAB.DTNEG)
WHERE ESTOQUE <> 0
  AND RN = 1  -- Pega apenas o último saldo de cada mês
ORDER BY CODPROD, DATA_PERIODO

-- Comentários sobre os parâmetros:
-- :DATA_INICIO - Data inicial do período (formato: DD/MM/YYYY)
-- :DATA_FIM - Data final do período (formato: DD/MM/YYYY)
-- 
-- A query agrupa os dados por produto e mês/ano, apresentando:
-- - CODPROD: Código do produto
-- - DESCRPROD: Descrição do produto  
-- - DESCRGRUPOPROD: Descrição do grupo do produto
-- - ESTOQUE: Saldo final do estoque no período
-- - DATA_PERIODO: Mês/ano no formato MM/YYYY baseado no DTNEG