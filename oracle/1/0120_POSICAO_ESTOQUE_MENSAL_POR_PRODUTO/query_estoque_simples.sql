-- Query simplificada para saldo de estoque por mês em intervalo de datas
-- Parâmetros: :DATA_INICIO e :DATA_FIM (formato DD/MM/YYYY)

WITH MESES_INTERVALO AS (
    -- Gera todos os meses entre as datas informadas
    SELECT ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), LEVEL - 1) AS DATA_MES,
           LAST_DAY(ADD_MONTHS(TRUNC(:DATA_INICIO, 'MM'), LEVEL - 1)) AS ULTIMO_DIA_MES
    FROM DUAL
    CONNECT BY LEVEL <= MONTHS_BETWEEN(TRUNC(:DATA_FIM, 'MM'), TRUNC(:DATA_INICIO, 'MM')) + 1
),
ESTOQUE_BASE AS (
    -- Busca o estoque base para cada produto
    SELECT PRO.CODPROD,
           PRO.DESCRPROD,
           GRU.DESCRGRUPOPROD,
           EST.CODEMP,
           EST.CODLOCAL,
           EST.CONTROLE,
           SUM(EST.ESTOQUE) AS ESTOQUE_BASE
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
             EST.CODEMP,
             EST.CODLOCAL,
             EST.CONTROLE
)
SELECT EB.CODPROD,
       EB.DESCRPROD,
       EB.DESCRGRUPOPROD,
       MI.ULTIMO_DIA_MES,
       TO_CHAR(MI.ULTIMO_DIA_MES, 'MM/YYYY') AS PERIODO,
       -- Calcula o estoque final considerando movimentações posteriores
       EB.ESTOQUE_BASE - NVL(
           (SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
            FROM TGFITE ITE
            WHERE ITE.RESERVA = 'N'
              AND ITE.CODEMP = EB.CODEMP
              AND ITE.CODPROD = EB.CODPROD
              AND ITE.CODLOCALORIG = EB.CODLOCAL
              AND ITE.CONTROLE = EB.CONTROLE
              AND ITE.ATUALESTOQUE <> 0
              AND ITE.NUNOTA IN
                (SELECT NUNOTA
                 FROM TGFCAB
                 WHERE DTNEG > MI.ULTIMO_DIA_MES)), 0) AS ESTOQUE
FROM ESTOQUE_BASE EB
CROSS JOIN MESES_INTERVALO MI
WHERE EB.ESTOQUE_BASE - NVL(
           (SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
            FROM TGFITE ITE
            WHERE ITE.RESERVA = 'N'
              AND ITE.CODEMP = EB.CODEMP
              AND ITE.CODPROD = EB.CODPROD
              AND ITE.CODLOCALORIG = EB.CODLOCAL
              AND ITE.CONTROLE = EB.CONTROLE
              AND ITE.ATUALESTOQUE <> 0
              AND ITE.NUNOTA IN
                (SELECT NUNOTA
                 FROM TGFCAB
                 WHERE DTNEG > MI.ULTIMO_DIA_MES)), 0) <> 0
ORDER BY EB.CODPROD, MI.ULTIMO_DIA_MES;

-- INSTRUÇÕES DE USO:
-- 1. Substitua :DATA_INICIO pela data inicial (ex: '01/01/2025')
-- 2. Substitua :DATA_FIM pela data final (ex: '31/12/2025')
-- 3. A query retorna o saldo de estoque do último dia de cada mês
-- 4. Utiliza CTE (Common Table Expression) para melhor performance
-- 5. Apenas produtos com estoque diferente de zero são exibidos

-- EXEMPLO PRÁTICO:
-- Para consultar estoque de janeiro a dezembro de 2025:
-- :DATA_INICIO = '01/01/2025'
-- :DATA_FIM = '31/12/2025'
-- 
-- Resultado: Uma linha por produto/mês com o saldo do último dia do mês
