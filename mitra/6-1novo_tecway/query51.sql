SELECT
    d.ORDEM,
    d.HIERARQUIA,
    d.descricao AS DESCRICAO,
    n.NOTA,
    d.sinal,

    SUM(
        CASE
            WHEN t.MES = :VAR_MES
                THEN t.DRE_TECWAY * d.sinal
            ELSE 0
        END
    ) AS VALOR_ANO_ATUAL,

    SUM(
        CASE
            WHEN t.MES = DATE_FORMAT(
                DATE_SUB(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y'),
                    INTERVAL 1 YEAR
                ),
                '%m/%Y'
            )
                THEN t.DRE_TECWAY * d.sinal
            ELSE 0
        END
    ) AS VALOR_ANO_ANTERIOR

FROM DET_DRE_TW d

LEFT JOIN CAD_CONTA_DRE_TW c
    ON c.ID_DET_DRE_TW = d.ID

LEFT JOIN DRE_TECWAY t
    ON t.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL

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

WHERE d.ID_ESTR_DRE_TW = 8
  AND t.MES IN (
        :VAR_MES,
        DATE_FORMAT(
            DATE_SUB(
                STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y'),
                INTERVAL 1 YEAR
            ),
            '%m/%Y'
        )
  )
  AND t.ID_EMPRESA = :VAR_EMPRESA

GROUP BY
    d.ORDEM,
    d.HIERARQUIA,
    d.descricao,
    n.NOTA,
    d.sinal

ORDER BY
    d.ORDEM;