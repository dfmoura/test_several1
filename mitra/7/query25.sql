WITH base_bal AS (
    SELECT
        CTACTB,
        SUM(
            CASE
                WHEN REFERENCIA <= TIMESTAMP(LAST_DAY(DATE(:VAR_DATA_REF_DRE)))
                    THEN VLRLANC
                ELSE 0
            END
        ) AS soma_ate_atu,
        SUM(
            CASE
                WHEN REFERENCIA <= TIMESTAMP(
                    LAST_DAY(
                        DATE_SUB(
                            DATE(:VAR_DATA_REF_DRE),
                            INTERVAL 1 YEAR
                        )
                    )
                )
                    THEN VLRLANC
                ELSE 0
            END
        ) AS soma_ate_ant
    FROM IMP_BASE_BALANCETE
    WHERE
        CODEMP = :VAR_EMPRESA_DRE
        AND REFERENCIA <= TIMESTAMP(LAST_DAY(DATE(:VAR_DATA_REF_DRE)))
    GROUP BY
        CTACTB
)

SELECT
    DET.ORDEM,
    DET.NOME_GRUPO,

    SUM(
        CASE
            WHEN DETREF.REFERENCIA = DATE(:VAR_DATA_REF_DRE)
                THEN IFNULL(
                    IFNULL(B.soma_ate_atu, 0) * DETCTACTB.SINAL,
                    0
                )
            ELSE 0
        END
    ) AS VLRLANC_ATU,

    SUM(
        CASE
            WHEN DETREF.REFERENCIA = DATE_SUB(
                DATE(:VAR_DATA_REF_DRE),
                INTERVAL 1 YEAR
            )
                THEN IFNULL(
                    IFNULL(B.soma_ate_ant, 0) * DETCTACTB.SINAL,
                    0
                )
            ELSE 0
        END
    ) AS VLRLANC_ANT

FROM ESTR_DEMONSTRATIVOS EST

INNER JOIN DET_DEMONSTRATIVO DET
    ON EST.ID = DET.ID_ESTR_DEMONSTRATIVO

INNER JOIN DET_DEMONSTRATIVO_REFERENCIA DETREF
    ON DET.ID = DETREF.ID_DET_DEMONSTRATIVO

LEFT JOIN DET_DEMONSTRATIVO_CTACTB DETCTACTB
    ON DETREF.ID = DETCTACTB.ID_DET_DEMONSTRATIVO_REFERENCIA

LEFT JOIN base_bal B
    ON B.CTACTB = DETCTACTB.PADRAO_CTACTB

WHERE
    DETREF.REFERENCIA IN (
        DATE(:VAR_DATA_REF_DRE),
        DATE_SUB(
            DATE(:VAR_DATA_REF_DRE),
            INTERVAL 1 YEAR
        )
    )
    AND EST.ID = 1

GROUP BY
    DET.ORDEM,
    DET.NOME_GRUPO

ORDER BY
    DET.ORDEM;