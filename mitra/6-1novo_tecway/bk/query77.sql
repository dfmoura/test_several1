SELECT
    ORDEM,
    HIERARQUIA,
    DESCRICAO,
    SINAL,
    NOTA,
    VALOR_ANO_ATUAL * sinal AS VALOR_ANO_ATUAL,
    VALOR_ANO_ANTERIOR * sinal AS VALOR_ANO_ANTERIOR,
    RECUO
FROM (
    SELECT
        ORDEM,
        HIERARQUIA,
        descricao,
        sinal,
        NOTA,
        CASE
            WHEN HIERARQUIA = '3.1' THEN
                (VALOR_ATUAL - VALOR_ANTERIOR) + COALESCE(SUM_23_24_ATUAL, 0)
            WHEN HIERARQUIA = '3.2' THEN
                (VALOR_ATUAL - VALOR_ANTERIOR)
            WHEN HIERARQUIA IN ('3.3', '3.4', '3.5') THEN
                (VALOR_ATUAL - VALOR_ANTERIOR)
            WHEN HIERARQUIA IN ('3.6', '3.7','3.8','3.9') THEN
                (VALOR_ATUAL - VALOR_ANTERIOR)
            WHEN HIERARQUIA = '10.1' THEN
                (VALOR_ATUAL - VALOR_ANTERIOR)
            WHEN HIERARQUIA IN ('4.1', '4.2') THEN
                (VALOR_ATUAL - VALOR_ANTERIOR)
            WHEN HIERARQUIA = '4.3' THEN
                (VALOR_ATUAL - VALOR_ANTERIOR) + COALESCE(SUM_10_1_ATUAL, 0) - COALESCE(SUM_21_ATUAL, 0)
                + COALESCE(SUM_24_ATUAL, 0)
            ELSE VALOR_ATUAL
        END AS VALOR_ANO_ATUAL,

        CASE
            WHEN HIERARQUIA = '3.1' THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR) + COALESCE(SUM_23_24_ANTERIOR, 0)
            WHEN HIERARQUIA = '3.2' THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR)
            WHEN HIERARQUIA IN ('3.3', '3.4', '3.5') THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR)
            WHEN HIERARQUIA IN ('3.6', '3.7','3.8','3.9') THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR)
            WHEN HIERARQUIA = '10.1' THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR)
            WHEN HIERARQUIA IN ('4.1', '4.2') THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR)
            WHEN HIERARQUIA = '4.3' THEN
                (VALOR_ANTERIOR - VALOR_ANTERIOR_ANTERIOR) + COALESCE(SUM_10_1_ANTERIOR, 0) + COALESCE(SUM_21_ANTERIOR, 0)
                + COALESCE(SUM_24_ANTERIOR, 0)
            ELSE VALOR_ANTERIOR
        END AS VALOR_ANO_ANTERIOR,

        RECUO
    FROM (
        SELECT
            a.*,
            SUM(
                CASE
                    WHEN a.HIERARQUIA IN ('2.3', '2.4') THEN a.VALOR_ATUAL
                    ELSE 0
                END
            ) OVER () AS SUM_23_24_ATUAL,

            SUM(
                CASE
                    WHEN a.HIERARQUIA IN ('2.3', '2.4') THEN a.VALOR_ANTERIOR
                    ELSE 0
                END
            ) OVER () AS SUM_23_24_ANTERIOR,

            SUM(
                CASE
                    WHEN a.HIERARQUIA = '10.1' THEN (a.VALOR_ATUAL - a.VALOR_ANTERIOR)*a.sinal
                    ELSE 0
                END
            ) OVER () AS SUM_10_1_ATUAL,

            SUM(
                CASE
                    WHEN a.HIERARQUIA = '10.1' THEN (a.VALOR_ANTERIOR - a.VALOR_ANTERIOR_ANTERIOR)*a.sinal
                    ELSE 0
                END
            ) OVER () AS SUM_10_1_ANTERIOR,

            SUM(
                CASE
                    WHEN a.HIERARQUIA = '2.1' THEN a.VALOR_ATUAL
                    ELSE 0
                END
            ) OVER () AS SUM_21_ATUAL,

            SUM(
                CASE
                    WHEN a.HIERARQUIA = '2.1' THEN a.VALOR_ANTERIOR
                    ELSE 0
                END
            ) OVER () AS SUM_21_ANTERIOR,

            SUM(
                CASE
                    WHEN a.HIERARQUIA = '2.4' THEN a.VALOR_ATUAL
                    ELSE 0
                END
            ) OVER () AS SUM_24_ATUAL,

            SUM(
                CASE
                    WHEN a.HIERARQUIA = '2.4' THEN a.VALOR_ANTERIOR
                    ELSE 0
                END
            ) OVER () AS SUM_24_ANTERIOR
        FROM (
            SELECT
                d.ORDEM,
                d.HIERARQUIA,
                d.descricao,
                d.sinal,
                d.RECUO,
                n.NOTA,

                CASE
                    WHEN d.HIERARQUIA = '1.1' THEN (
                        SELECT SUM(
                            CASE
                                WHEN MES = :VAR_MES THEN (DEBITO + CREDITO) * 0.001
                                ELSE 0
                            END
                        )
                        FROM IMP_DEBITO_CREDITO
                        WHERE ID_CONTA_CONTABIL IN (
                            '2.3.04.01.000004',
                            '2.3.04.01.000010'
                        )
                    )

                    WHEN d.HIERARQUIA = '2.10' THEN (
                        SELECT SUM(VALOR)
                        FROM OUTROS_DFC
                        WHERE MES = :VAR_MES
                          AND (
                              :VAR_EMPRESA IS NULL
                              OR :VAR_EMPRESA = ''
                              OR FIND_IN_SET(ID_EMPRESA, :VAR_EMPRESA)
                          )
                    )

                    ELSE
                        SUM(
                            CASE
                                WHEN t.MES = :VAR_MES THEN t.bp_tecway
                                ELSE 0
                            END
                        )
                END AS VALOR_ATUAL,

                CASE
                    WHEN d.HIERARQUIA = '1.1' THEN (
                        SELECT SUM(
                            CASE
                                WHEN MES = DATE_FORMAT(
                                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                                    '%m/%Y'
                                )
                                THEN (DEBITO + CREDITO) * 0.001
                                ELSE 0
                            END
                        )
                        FROM IMP_DEBITO_CREDITO
                        WHERE ID_CONTA_CONTABIL IN (
                            '2.3.04.01.000004',
                            '2.3.04.01.000010'
                        )
                    )

                    WHEN d.HIERARQUIA = '2.10' THEN (
                        SELECT SUM(VALOR)
                        FROM OUTROS_DFC
                        WHERE MES = DATE_FORMAT(
                            STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                            '%m/%Y'
                        )
                          AND (
                              :VAR_EMPRESA IS NULL
                              OR :VAR_EMPRESA = ''
                              OR FIND_IN_SET(ID_EMPRESA, :VAR_EMPRESA)
                          )
                    )

                    ELSE
                        SUM(
                            CASE
                                WHEN t.MES = DATE_FORMAT(
                                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                                    '%m/%Y'
                                )
                                THEN t.bp_tecway
                                ELSE 0
                            END
                        )
                END AS VALOR_ANTERIOR,

                CASE
                    WHEN d.HIERARQUIA = '1.1' THEN (
                        SELECT SUM(
                            CASE
                                WHEN MES = DATE_FORMAT(
                                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 2 YEAR,
                                    '%m/%Y'
                                )
                                THEN (DEBITO + CREDITO) * 0.001
                                ELSE 0
                            END
                        )
                        FROM IMP_DEBITO_CREDITO
                        WHERE ID_CONTA_CONTABIL IN (
                            '2.3.04.01.000004',
                            '2.3.04.01.000010'
                        )
                    )

                    WHEN d.HIERARQUIA = '2.10' THEN (
                        SELECT SUM(VALOR)
                        FROM OUTROS_DFC
                        WHERE MES = DATE_FORMAT(
                            STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 2 YEAR,
                            '%m/%Y'
                        )
                          AND (
                              :VAR_EMPRESA IS NULL
                              OR :VAR_EMPRESA = ''
                              OR FIND_IN_SET(ID_EMPRESA, :VAR_EMPRESA)
                          )
                    )

                    ELSE
                        SUM(
                            CASE
                                WHEN t.MES = DATE_FORMAT(
                                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 2 YEAR,
                                    '%m/%Y'
                                )
                                THEN t.bp_tecway
                                ELSE 0
                            END
                        )
                END AS VALOR_ANTERIOR_ANTERIOR

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
            ) n ON n.ID_DET_DRE_TW = d.ID

            WHERE d.ID_ESTR_DRE_TW = 10

            GROUP BY
                d.ORDEM,
                d.HIERARQUIA,
                d.descricao,
                d.sinal,
                d.RECUO,
                n.NOTA
        ) a
    ) w
) B
ORDER BY ORDEM;