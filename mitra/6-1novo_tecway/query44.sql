SELECT
    ORDEM,
    HIERARQUIA,
    descricao,
    sinal,
    NOTA,
    VALOR_ATUAL * sinal AS VALOR_ATUAL,
    VALOR_ANTERIOR * sinal AS VALOR_ANTERIOR,
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
            WHEN d.HIERARQUIA = '3.1.3' THEN (
                SELECT
                    SUM(
                        CASE
                            WHEN t2.MES = :VAR_MES
                            THEN t2.bp_tecway*1000
                            ELSE 0
                        END
                    )
                    - (
                        SELECT
                            SUM(
                                CASE
                                    WHEN MES = :VAR_MES
                                    THEN DEBITO + CREDITO
                                    ELSE 0
                                END
                            ) * -1
                        FROM
                            DEBITO_CREDITO
                        WHERE
                            id_conta_contabil = '2.3.04.01.000004'
                    )
                FROM DET_DRE_TW d2
                LEFT JOIN CAD_CONTA_DRE_TW c2
                    ON c2.ID_DET_DRE_TW = d2.ID
                LEFT JOIN BP_TECWAY t2
                    ON t2.ID_CONTA_CONTABIL = c2.ID_CONTA_CONTABIL
                    AND (
                        :VAR_EMPRESA IS NULL
                        OR :VAR_EMPRESA = ''
                        OR FIND_IN_SET(t2.ID_EMPRESA, :VAR_EMPRESA)
                    )
                WHERE d2.ID_ESTR_DRE_TW = 7
                  AND d2.HIERARQUIA IN ('3.1.4', '3.1.5', '3.1.6')
            )
            ELSE
                SUM(
                    CASE
                        WHEN t.MES = :VAR_MES
                        THEN t.bp_tecway*1000
                        ELSE 0
                    END
                )
                - CASE
                      WHEN d.HIERARQUIA = '3.1.4' THEN (
                          SELECT
                              SUM(
                                  CASE
                                      WHEN MES = :VAR_MES
                                      THEN DEBITO + CREDITO
                                      ELSE 0
                                  END
                              ) * -1
                          FROM
                              DEBITO_CREDITO
                          WHERE
                              id_conta_contabil = '2.3.04.01.000004'
                      )
                      ELSE 0
                  END
        END AS VALOR_ATUAL,

        CASE
            WHEN d.HIERARQUIA = '3.1.3' THEN (
                SELECT
                    SUM(
                        CASE
                            WHEN t2.MES = DATE_FORMAT(
                                     STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                                     '%m/%Y'
                                 )
                            THEN t2.bp_tecway*1000
                            ELSE 0
                        END
                    )
                    - (
                        SELECT
                            SUM(
                                CASE
                                    WHEN MES = DATE_FORMAT(
                                                 STR_TO_DATE(
                                                     CONCAT('01/', :VAR_MES),
                                                     '%d/%m/%Y'
                                                 ) - INTERVAL 1 YEAR,
                                                 '%m/%Y'
                                             )
                                    THEN DEBITO + CREDITO
                                    ELSE 0
                                END
                            ) * -1
                        FROM
                            DEBITO_CREDITO
                        WHERE
                            id_conta_contabil = '2.3.04.01.000004'
                    )
                FROM DET_DRE_TW d2
                LEFT JOIN CAD_CONTA_DRE_TW c2
                    ON c2.ID_DET_DRE_TW = d2.ID
                LEFT JOIN BP_TECWAY t2
                    ON t2.ID_CONTA_CONTABIL = c2.ID_CONTA_CONTABIL
                    AND (
                        :VAR_EMPRESA IS NULL
                        OR :VAR_EMPRESA = ''
                        OR FIND_IN_SET(t2.ID_EMPRESA, :VAR_EMPRESA)
                    )
                WHERE d2.ID_ESTR_DRE_TW = 7
                  AND d2.HIERARQUIA IN ('3.1.4', '3.1.5', '3.1.6')
            )
            ELSE
                SUM(
                    CASE
                        WHEN t.MES = DATE_FORMAT(
                                 STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                                 '%m/%Y'
                             )
                        THEN t.bp_tecway*1000
                        ELSE 0
                    END
                )
                - CASE
                      WHEN d.HIERARQUIA = '3.1.4' THEN (
                          SELECT
                              SUM(
                                  CASE
                                      WHEN MES = DATE_FORMAT(
                                                   STR_TO_DATE(
                                                       CONCAT('01/', :VAR_MES),
                                                       '%d/%m/%Y'
                                                   ) - INTERVAL 1 YEAR,
                                                   '%m/%Y'
                                               )
                                      THEN DEBITO + CREDITO
                                      ELSE 0
                                  END
                              ) * -1
                          FROM
                              DEBITO_CREDITO
                          WHERE
                              id_conta_contabil = '2.3.04.01.000004'
                      )
                      ELSE 0
                  END
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