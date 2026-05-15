SELECT
    ORDEM,
    HIERARQUIA,
    descricao,
    sinal,
    NOTA,
    VALOR_ATUAL * sinal * 1000 AS VALOR_ATUAL,
    VALOR_ANTERIOR * sinal * 1000 AS VALOR_ANTERIOR,
    RECUO
FROM (
    SELECT
        d.ORDEM,
        d.HIERARQUIA,
        d.descricao,
        d.sinal,
        d.RECUO,
        n.NOTA,

        SUM(
            CASE
                -- 3.1.3 em diante (3.1.3, 3.1.4, 3.1.6): ATUAL = próximo ano
                WHEN d.HIERARQUIA IN ('3.1.3', '3.1.4', '3.1.6')
                     AND t.MES = DATE_FORMAT(
                         STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') + INTERVAL 1 YEAR,
                         '%m/%Y'
                     )
                THEN t.bp_tecway

                -- 3.1.1, 3.1.2, 3.1.5: ATUAL = mês atual
                WHEN d.HIERARQUIA NOT IN ('3.1.3', '3.1.4', '3.1.6')
                     AND t.MES = :VAR_MES
                THEN t.bp_tecway

                ELSE 0
            END
        ) AS VALOR_ATUAL,

        SUM(
            CASE
                -- 3.1.4 e 3.1.6: ANTERIOR = mês atual
                WHEN d.HIERARQUIA IN ('3.1.4', '3.1.6')
                     AND t.MES = :VAR_MES
                THEN t.bp_tecway

                -- 3.1.1, 3.1.2, 3.1.3, 3.1.5: ANTERIOR = ano anterior
                WHEN d.HIERARQUIA NOT IN ('3.1.4', '3.1.6')
                     AND t.MES = DATE_FORMAT(
                         STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                         '%m/%Y'
                     )
                THEN t.bp_tecway

                ELSE 0
            END
        ) AS VALOR_ANTERIOR

    FROM DET_DRE_TW d

    LEFT JOIN CAD_CONTA_DRE_TW c
        ON c.ID_DET_DRE_TW = d.ID

    LEFT JOIN BP_TECWAY t
        ON t.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
        AND (
            :VAR_EMPRESA IS NULL
            OR :VAR_EMPRESA = ''
            OR FIND_IN_SET(t.ID_EMPRESA, :VAR_EMPRESA)
        )

    LEFT JOIN (
        SELECT
            ID_DET_DRE_TW,
            MAX(NOTA) AS NOTA
        FROM DET_NOTAS
        WHERE MES = :VAR_MES
          AND (
                :VAR_EMPRESA IS NULL
                OR :VAR_EMPRESA = ''
                OR FIND_IN_SET(EMPRESA, :VAR_EMPRESA)
          )
        GROUP BY ID_DET_DRE_TW
    ) n
        ON n.ID_DET_DRE_TW = d.ID

    WHERE d.ID_ESTR_DRE_TW = 7

    GROUP BY
        d.ORDEM,
        d.HIERARQUIA,
        d.descricao,
        d.sinal,
        d.RECUO,
        n.NOTA
) a

ORDER BY ORDEM;