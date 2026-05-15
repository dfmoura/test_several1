SELECT
    ORDEM,
    HIERARQUIA,
    descricao,
    sinal,
    NOTA,
    VALOR_ATUAL * sinal * 1000 AS VALOR_ANO_ATUAL,
    VALOR_ANTERIOR * sinal * 1000 AS VALOR_ANO_ANTERIOR,
    RECUO
FROM (
    SELECT
        d.ORDEM,
        d.HIERARQUIA,
        d.descricao,
        d.sinal,
        d.RECUO,
        n.NOTA,
        
        COALESCE(
            MAX(
                CASE
                    WHEN d.HIERARQUIA = '5.4' THEN (
                        SELECT SUM(b.BP_TECWAY)
                        FROM BP_TECWAY b
                        WHERE b.ID_CONTA_CONTABIL = '2.3.04.01.000009'
                          AND b.MES = :VAR_MES
                          AND b.ID_HISTORICO > 0
                          AND (
                              :VAR_EMPRESA IS NULL
                              OR :VAR_EMPRESA = ''
                              OR FIND_IN_SET(b.ID_EMPRESA, :VAR_EMPRESA)
                          )
                    )
                END
            ),
            0
        )
        + SUM(
            CASE
                WHEN d.HIERARQUIA NOT IN ('5.4')
                     AND d.HIERARQUIA IN ('1.1')
                     AND t.MES = DATE_FORMAT(
                         STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') + INTERVAL 1 YEAR,
                         '%m/%Y'
                     )
                    THEN t.bp_tecway

                WHEN d.HIERARQUIA NOT IN ('5.4', '1.1')
                     AND t.MES = :VAR_MES
                    THEN t.bp_tecway

                ELSE 0
            END
        ) AS VALOR_ATUAL,

        COALESCE(
            MAX(
                CASE
                    WHEN d.HIERARQUIA = '5.4' THEN (
                        SELECT SUM(b2.BP_TECWAY)
                        FROM BP_TECWAY b2
                        WHERE b2.ID_CONTA_CONTABIL = '2.3.04.01.000009'
                          AND b2.ID_HISTORICO > 0
                          AND STR_TO_DATE(CONCAT('01/', b2.MES), '%d/%m/%Y') =
                              DATE_SUB(
                                  STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y'),
                                  INTERVAL 1 YEAR
                              )
                          AND (
                              :VAR_EMPRESA IS NULL
                              OR :VAR_EMPRESA = ''
                              OR FIND_IN_SET(b2.ID_EMPRESA, :VAR_EMPRESA)
                          )
                    )
                END
            ),
            0
        )
        + SUM(
            CASE
                WHEN d.HIERARQUIA NOT IN ('5.4')
                     AND d.HIERARQUIA IN ('1.1')
                     AND t.MES = :VAR_MES
                    THEN t.bp_tecway

                WHEN d.HIERARQUIA NOT IN ('5.4', '1.1')
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

    WHERE d.ID_ESTR_DRE_TW = 10

    GROUP BY
        d.ORDEM,
        d.HIERARQUIA,
        d.descricao,
        d.sinal,
        d.RECUO,
        n.NOTA

) a

ORDER BY ORDEM;