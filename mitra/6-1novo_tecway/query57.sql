WITH TOTAL_BP AS (
    SELECT DISTINCT
        MES,
        ID_CONTA_CONTABIL,
        SUM(BP_TECWAY) AS VALOR
    FROM BP_TECWAY
    WHERE
        MES IN (
            :VAR_MES,
            CONCAT(
                SUBSTRING(:VAR_MES, 1, 2),
                '/',
                CAST(SUBSTRING(:VAR_MES, 4, 4) AS UNSIGNED) - 1
            )
        )
        AND ID_EMPRESA IN (:VAR_EMPRESA)
    GROUP BY
        MES,
        ID_CONTA_CONTABIL
),

TOTAL_DRE AS (
    SELECT DISTINCT
        MES,
        ID_CONTA_CONTABIL,
        SUM(DRE_TECWAY) AS VALOR
    FROM DRE_TECWAY
    WHERE
        MES IN (
            :VAR_MES,
            CONCAT(
                SUBSTRING(:VAR_MES, 1, 2),
                '/',
                CAST(SUBSTRING(:VAR_MES, 4, 4) AS UNSIGNED) - 1
            )
        )
        AND ID_EMPRESA IN (:VAR_EMPRESA)
    GROUP BY
        MES,
        ID_CONTA_CONTABIL
)

SELECT DISTINCT
    SUB.ID_DET_INICIAL_NOTAS,
    SUB.DESCRICAO AS DESCRICAO_CONTA,

    SUM(
        CASE
            WHEN DETINI.TIPO = 'BP'
                AND TOTAL_BP.MES = :VAR_MES
                THEN TOTAL_BP.VALOR

            WHEN DETINI.TIPO = 'DRE'
                AND TOTAL_DRE.MES = :VAR_MES
                THEN TOTAL_DRE.VALOR

            ELSE 0
        END
    ) AS VALOR_ATUAL,

    SUM(
        CASE
            WHEN DETINI.TIPO = 'BP'
                AND TOTAL_BP.MES = CONCAT(
                    SUBSTRING(:VAR_MES, 1, 2),
                    '/',
                    CAST(SUBSTRING(:VAR_MES, 4, 4) AS UNSIGNED) - 1
                )
                THEN TOTAL_BP.VALOR

            WHEN DETINI.TIPO = 'DRE'
                AND TOTAL_DRE.MES = CONCAT(
                    SUBSTRING(:VAR_MES, 1, 2),
                    '/',
                    CAST(SUBSTRING(:VAR_MES, 4, 4) AS UNSIGNED) - 1
                )
                THEN TOTAL_DRE.VALOR

            ELSE 0
        END
    ) AS VALOR_ANTERIOR

FROM INICIAL_NOTAS INI

INNER JOIN DET_INICIAL_NOTAS DETINI
    ON INI.ID = DETINI.ID_INICIAL_NOTA

INNER JOIN SUB_DET_INICIAL_NOTAS SUB
    ON DETINI.ID = SUB.ID_DET_INICIAL_NOTAS

INNER JOIN CONTA_SUB_DET_INICIAL_NOTAS CONTA
    ON SUB.ID = CONTA.ID_SUB_DET_INICIAL_NOTAS

LEFT JOIN TOTAL_BP
    ON CONTA.ID_CONTA_CONTABIL = TOTAL_BP.ID_CONTA_CONTABIL

LEFT JOIN TOTAL_DRE
    ON CONTA.ID_CONTA_CONTABIL = TOTAL_DRE.ID_CONTA_CONTABIL

WHERE
    INI.MES_REFERENCIA = :VAR_MES

GROUP BY
    SUB.ID_DET_INICIAL_NOTAS,
    SUB.DESCRICAO

ORDER BY
    SUB.ID;