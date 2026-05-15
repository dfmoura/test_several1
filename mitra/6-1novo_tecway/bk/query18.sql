-- RAIZ (DET_INICIAL_NOTAS): define dinamicamente o nivel de agregacao
-- Ex.: "1" ou "1.01"=1 nivel, "2" ou "1.01.02"=2 niveis, ... ate 10
-- Se vazio/NULL, usa 4 niveis (XX.XX.XX.XX)
SELECT
    ID_DET_INICIAL_NOTAS,
    id_agregado AS ID_CONTA_CONTABIL,
    CASE
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 1 THEN
            (
                SELECT imp.TATARAVO_CONTA_CONTABIL
                FROM IMP_CONTA_CONTABIL imp
                WHERE imp.ID_TATARAVO_CONTA_CONTABIL = id_agregado
                LIMIT 1
            )
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 2 THEN
            (
                SELECT imp.BISAVO_CONTA_CONTABIL
                FROM IMP_CONTA_CONTABIL imp
                WHERE imp.ID_BISAVO_CONTA_CONTABIL = id_agregado
                LIMIT 1
            )
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 3 THEN
            (
                SELECT imp.AVO_CONTA_CONTABIL
                FROM IMP_CONTA_CONTABIL imp
                WHERE imp.ID_AVO_CONTA_CONTABIL = id_agregado
                LIMIT 1
            )
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 4 THEN
            (
                SELECT imp.PAI_CONTA_CONTABIL
                FROM IMP_CONTA_CONTABIL imp
                WHERE imp.ID_PAI_CONTA_CONTABIL = id_agregado
                LIMIT 1
            )
        ELSE
            (
                SELECT imp.CONTA_CONTABIL
                FROM IMP_CONTA_CONTABIL imp
                WHERE imp.ID_CONTA_CONTABIL = id_agregado
                LIMIT 1
            )
    END AS DESCRICAO_CONTA,
    RAIZ,
    SUM(VALOR_ATUAL) AS VALOR_ATUAL,
    SUM(VALOR_ANTERIOR) AS VALOR_ANTERIOR
FROM (
    SELECT
        CASE
            WHEN RAIZ IS NULL OR TRIM(COALESCE(RAIZ, '')) = '' THEN SUBSTRING_INDEX(ID_CONTA_CONTABIL, '.', 4)
            WHEN RAIZ NOT LIKE '%.%' AND RAIZ REGEXP '^[0-9]+$' THEN
                SUBSTRING_INDEX(ID_CONTA_CONTABIL, '.', LEAST(GREATEST(CAST(RAIZ AS UNSIGNED), 1), 10))
            ELSE SUBSTRING_INDEX(
                ID_CONTA_CONTABIL,
                '.',
                LEAST(GREATEST((LENGTH(RAIZ) - LENGTH(REPLACE(RAIZ, '.', ''))) + 1, 1), 10)
            )
        END AS id_agregado,
        ID_DET_INICIAL_NOTAS,
        RAIZ,
        VALOR_ATUAL,
        VALOR_ANTERIOR
    FROM (
        SELECT
            c.ID_CONTA_CONTABIL,
            c.ID_DET_INICIAL_NOTAS,
            d.RAIZ,
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
          AND d.ID_INICIAL_NOTA = 7
        GROUP BY
            c.ID_CONTA_CONTABIL,
            c.ID_DET_INICIAL_NOTAS,
            d.RAIZ

        UNION ALL

        SELECT
            c.ID_CONTA_CONTABIL,
            c.ID_DET_INICIAL_NOTAS,
            d.RAIZ,
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
          AND d.ID_INICIAL_NOTA = 7
        GROUP BY
            c.ID_CONTA_CONTABIL,
            c.ID_DET_INICIAL_NOTAS,
            d.RAIZ
    ) x
) y
GROUP BY
    id_agregado,
    ID_DET_INICIAL_NOTAS,
    RAIZ
ORDER BY
    ID_DET_INICIAL_NOTAS,
    ID_CONTA_CONTABIL;
