SELECT
    SUBSTRING_INDEX(ID_CONTA_CONTABIL, '.', 4) AS ID_CONTA_CONTABIL,
    SUM(VALOR_ATUAL) AS VALOR_ATUAL,
    SUM(VALOR_ANTERIOR) AS VALOR_ANTERIOR
FROM (
    SELECT
        c.ID_CONTA_CONTABIL,
        SUM(
            CASE
                WHEN b.MES = :VAR_MES THEN b.BP_TECWAY
                ELSE 0
            END
        ) AS VALOR_ATUAL,
        SUM(
            CASE
                WHEN b.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                ) THEN b.BP_TECWAY
                ELSE 0
            END
        ) AS VALOR_ANTERIOR
    FROM DET_INICIAL_NOTAS d
    INNER JOIN CONTAS_DET_INICIAL_NOTAS c
        ON c.ID_DET_INICIAL_NOTAS = d.ID
    INNER JOIN BP_TECWAY b
        ON b.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
       AND (
            :VAR_EMPRESA IS NULL
            OR :VAR_EMPRESA = ''
            OR FIND_IN_SET(b.ID_EMPRESA, :VAR_EMPRESA)
       )
    WHERE d.TIPO = 'BP'
    GROUP BY c.ID_CONTA_CONTABIL

    UNION ALL

    SELECT
        c.ID_CONTA_CONTABIL,
        SUM(
            CASE
                WHEN dr.MES = :VAR_MES THEN dr.DRE_TECWAY
                ELSE 0
            END
        ) AS VALOR_ATUAL,
        SUM(
            CASE
                WHEN dr.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                ) THEN dr.DRE_TECWAY
                ELSE 0
            END
        ) AS VALOR_ANTERIOR
    FROM DET_INICIAL_NOTAS d
    INNER JOIN CONTAS_DET_INICIAL_NOTAS c
        ON c.ID_DET_INICIAL_NOTAS = d.ID
    INNER JOIN DRE_TECWAY dr
        ON dr.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
       AND (
            :VAR_EMPRESA IS NULL
            OR :VAR_EMPRESA = ''
            OR FIND_IN_SET(dr.ID_EMPRESA, :VAR_EMPRESA)
       )
    WHERE d.TIPO = 'DRE'
    GROUP BY c.ID_CONTA_CONTABIL
) x
GROUP BY SUBSTRING_INDEX(ID_CONTA_CONTABIL, '.', 4);
