SELECT
    ORDEM,
    HIERARQUIA,
    descricao,
    sinal,
    NOTA,
    VALOR_ATUAL * sinal AS VALOR_ANO_ATUAL,
    VALOR_ANTERIOR * sinal AS VALOR_ANO_ANTERIOR,
    RECUO
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
                SELECT
                        SUM(
                            CASE
                                WHEN MES = :VAR_MES
                                THEN (DEBITO + CREDITO)*0.001
                                ELSE 0
                            END
                        )
                FROM IMP_DEBITO_CREDITO
                WHERE ID_CONTA_CONTABIL IN (
                    '2.3.04.01.000004',
                    '2.3.04.01.000010'
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
                SELECT
                        SUM(
                            CASE
                                WHEN MES = DATE_FORMAT(
                                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                                    '%m/%Y'
                                )
                                THEN (DEBITO + CREDITO)*0.001
                                ELSE 0
                            END
                    )
                FROM IMP_DEBITO_CREDITO
                WHERE ID_CONTA_CONTABIL IN (
                    '2.3.04.01.000004',
                    '2.3.04.01.000010'
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
        END AS VALOR_ANTERIOR

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