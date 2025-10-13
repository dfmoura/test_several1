-- Query para apresentar o saldo de estoque do último dia de cada mês
-- dentro de um intervalo de datas informado pelo usuário
-- Parâmetros: :DATA_INICIO e :DATA_FIM (formato DD/MM/YYYY)

SELECT CODPROD,
       DESCRPROD,
       DESCRGRUPOPROD,
       ESTOQUE,
       TO_CHAR(ULTIMO_DIA_MES, 'MM/YYYY') AS PERIODO,
       ULTIMO_DIA_MES
FROM
  (SELECT PRO.CODPROD,
          PRO.DESCRPROD,
          GRU.DESCRGRUPOPROD,
          EST.CODEMP,
          EST.CODLOCAL,
          EST.CONTROLE,
          -- Gera o último dia de cada mês no intervalo
          LAST_DAY(ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), LEVEL - 1)) AS ULTIMO_DIA_MES,
          -- Calcula o estoque considerando movimentações posteriores à data
          SUM(EST.ESTOQUE) - NVL(
                                   (SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
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
                                         WHERE DTNEG > LAST_DAY(ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), LEVEL - 1)))), 0) AS ESTOQUE,
          
          ROW_NUMBER() OVER (PARTITION BY PRO.CODPROD, 
                                        LAST_DAY(ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), LEVEL - 1))
                            ORDER BY EST.DTVAL DESC) AS RN
   FROM TGFEST EST,
        TGFPRO PRO,
        TGFLOC LOC,
        TGFGRU GRU,
        -- Gera uma linha para cada mês no intervalo de datas
        (SELECT LEVEL AS MES_NUM
         FROM DUAL
         CONNECT BY LEVEL <= MONTHS_BETWEEN(TRUNC(:DATA_FIM, 'MM'), TRUNC(:DATA_INICIO, 'MM')) + 1) MESES
   WHERE EST.CODPROD = PRO.CODPROD
     AND EST.CODLOCAL = LOC.CODLOCAL
     AND GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
     -- Filtra apenas registros de estoque válidos para o período
     AND EST.DTVAL <= LAST_DAY(ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), MESES.MES_NUM - 1))
   GROUP BY PRO.CODPROD,
            PRO.DESCRPROD,
            GRU.DESCRGRUPOPROD,
            EST.CODLOCAL,
            EST.CONTROLE,
            EST.CODPROD,
            EST.CODEMP,
            EST.DTVAL,
            LAST_DAY(ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), MESES.MES_NUM - 1)))
WHERE ESTOQUE <> 0
  AND RN = 1  -- Pega apenas o último saldo de cada mês
ORDER BY CODPROD, ULTIMO_DIA_MES;

-- INSTRUÇÕES DE USO:
-- 1. Substitua :DATA_INICIO pela data inicial do período (ex: '01/01/2025')
-- 2. Substitua :DATA_FIM pela data final do período (ex: '31/12/2025')
-- 3. A query retornará o saldo de estoque do último dia de cada mês no intervalo
-- 4. Os resultados são agrupados por produto e período (mês/ano)
-- 5. Apenas produtos com estoque diferente de zero são exibidos

-- EXEMPLO DE USO:
-- Para consultar o estoque de janeiro a dezembro de 2025:
-- :DATA_INICIO = '01/01/2025'
-- :DATA_FIM = '31/12/2025'
