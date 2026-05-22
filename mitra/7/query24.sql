WITH BASELAN AS (
    SELECT
        CODEMP,
        REFERENCIA,
        CTACTB,
        VLRLANC
    FROM IMP_BASE_BALANCETE
    WHERE CODEMP = :VAR_EMPRESA_DRE
      AND REFERENCIA <= :VAR_DATA_REF_DRE
),

CONTAS_GRUPO AS (
    SELECT DISTINCT
        NTE.ID,
        NTE.REFERENCIA,
        NTE.CODEMP,
        NTE_DET.ID AS ID_GRU,
        NTE_DET.NOTA,
        NTE_DET_GRU.ID AS ID_GRUPO,
        NTE_CTB.ID_NOTAS_EXPLICATIVAS_GRUPOS_REFER,
        NTE_DET_GRU.DESCRICAO,
        NTE_CTB.PADRAO_CTACTB,
        NTE_CTB.SINAL
    FROM NOTAS_EXPLICATIVAS_CAB NTE

    INNER JOIN NOTAS_EXPLICATIVAS_DET NTE_DET
        ON NTE.ID = NTE_DET.ID_NOTAS_EXPLICATIVAS_CAB

    INNER JOIN NOTAS_EXPLICATIVAS_GRUPOS NTE_DET_GRU
        ON NTE_DET.ID = NTE_DET_GRU.ID_NOTAS_EXPLICATIVAS_DET

    INNER JOIN NOTAS_EXPLICATIVAS_GRUPOS_REFER NTE_CTB_REF
        ON NTE_DET_GRU.ID = NTE_CTB_REF.ID_NOTAS_EXPLICATIVAS_GRUPOS

    INNER JOIN NOTAS_EXPLICATIVAS_GRUPOS_CONTAS NTE_CTB
        ON NTE_CTB_REF.ID = NTE_CTB.ID_NOTAS_EXPLICATIVAS_GRUPOS_REFER

    WHERE NTE.CODEMP = :VAR_EMPRESA_DRE
      AND NTE.REFERENCIA IN (
            :VAR_DATA_REF_DRE,
            DATE_SUB(:VAR_DATA_REF_DRE, INTERVAL 1 YEAR)
        )
)

SELECT
    COALESCE(
        MAX(
            CASE
                WHEN CG.REFERENCIA = :VAR_DATA_REF_DRE
                    THEN CG.ID
            END
        ),
        MAX(
            CASE
                WHEN CG.REFERENCIA = DATE_SUB(
                    :VAR_DATA_REF_DRE,
                    INTERVAL 1 YEAR
                )
                    THEN CG.ID
            END
        )
    ) AS ID,

    :VAR_DATA_REF_DRE AS REFERENCIA,
    CG.CODEMP,

    COALESCE(
        MAX(
            CASE
                WHEN CG.REFERENCIA = :VAR_DATA_REF_DRE
                    THEN CG.ID_GRU
            END
        ),
        MAX(
            CASE
                WHEN CG.REFERENCIA = DATE_SUB(
                    :VAR_DATA_REF_DRE,
                    INTERVAL 1 YEAR
                )
                    THEN CG.ID_GRU
            END
        )
    ) AS ID_GRU,

    CG.NOTA,

    COALESCE(
        MAX(
            CASE
                WHEN CG.REFERENCIA = :VAR_DATA_REF_DRE
                    THEN CG.ID_GRUPO
            END
        ),
        MAX(
            CASE
                WHEN CG.REFERENCIA = DATE_SUB(
                    :VAR_DATA_REF_DRE,
                    INTERVAL 1 YEAR
                )
                    THEN CG.ID_GRUPO
            END
        )
    ) AS ID_GRUPO,

    CG.DESCRICAO,

    (
        SUM(
            CASE
                WHEN CG.REFERENCIA = :VAR_DATA_REF_DRE
                 AND BAS.REFERENCIA <= :VAR_DATA_REF_DRE
                    THEN BAS.VLRLANC * CG.SINAL
                ELSE 0
            END
        ) / 1000
    ) AS VALOR_ANO_ATUAL,

    (
        SUM(
            CASE
                WHEN CG.REFERENCIA = DATE_SUB(
                    :VAR_DATA_REF_DRE,
                    INTERVAL 1 YEAR
                )
                 AND BAS.REFERENCIA <= DATE_SUB(
                    :VAR_DATA_REF_DRE,
                    INTERVAL 1 YEAR
                )
                    THEN BAS.VLRLANC * CG.SINAL
                ELSE 0
            END
        ) / 1000
    ) AS VALOR_ANO_ANTERIOR

FROM CONTAS_GRUPO CG

INNER JOIN BASELAN BAS
    ON CG.PADRAO_CTACTB = BAS.CTACTB

GROUP BY
    CG.CODEMP,
    CG.NOTA,
    CG.DESCRICAO

ORDER BY
    CAST(SUBSTRING_INDEX(CONCAT(CG.NOTA, '.0.0.0'), '.', 1) AS UNSIGNED),
    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(CONCAT(CG.NOTA, '.0.0.0'), '.', 2), '.', -1) AS UNSIGNED),
    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(CONCAT(CG.NOTA, '.0.0.0'), '.', 3), '.', -1) AS UNSIGNED),
    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(CONCAT(CG.NOTA, '.0.0.0'), '.', 4), '.', -1) AS UNSIGNED),
    ID_GRUPO;
