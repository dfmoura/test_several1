-- IMP_CONTA_CONTABIL: CONTA(5 níveis), PAI(4), AVO(3), BISAVO(2), TATARAVO(1)
-- Nível do ID = (LENGTH - LENGTH(REPLACE(.,''))) + 1
SELECT
    id_agregado AS ID_CONTA_CONTABIL,
    CASE
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 1 THEN
            (SELECT imp.TATARAVO_CONTA_CONTABIL FROM IMP_CONTA_CONTABIL imp WHERE imp.ID_TATARAVO_CONTA_CONTABIL = id_agregado LIMIT 1)
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 2 THEN
            (SELECT imp.BISAVO_CONTA_CONTABIL FROM IMP_CONTA_CONTABIL imp WHERE imp.ID_BISAVO_CONTA_CONTABIL = id_agregado LIMIT 1)
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 3 THEN
            (SELECT imp.AVO_CONTA_CONTABIL FROM IMP_CONTA_CONTABIL imp WHERE imp.ID_AVO_CONTA_CONTABIL = id_agregado LIMIT 1)
        WHEN (LENGTH(id_agregado) - LENGTH(REPLACE(id_agregado, '.', ''))) + 1 = 4 THEN
            (SELECT imp.PAI_CONTA_CONTABIL FROM IMP_CONTA_CONTABIL imp WHERE imp.ID_PAI_CONTA_CONTABIL = id_agregado LIMIT 1)
        ELSE
            (SELECT imp.CONTA_CONTABIL FROM IMP_CONTA_CONTABIL imp WHERE imp.ID_CONTA_CONTABIL = id_agregado LIMIT 1)
    END AS DESCRICAO_CONTA,
    SUM(VALOR_ATUAL) AS VALOR_ATUAL,
    SUM(VALOR_ANTERIOR) AS VALOR_ANTERIOR
FROM (
    SELECT
        SUBSTRING_INDEX(ID_CONTA_CONTABIL, '.', 4) AS id_agregado,
        VALOR_ATUAL,
        VALOR_ANTERIOR
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
      AND c.ID_DET_INICIAL_NOTAS = :VAR_REGISTRO_ID
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
      AND c.ID_DET_INICIAL_NOTAS = :VAR_REGISTRO_ID
    GROUP BY c.ID_CONTA_CONTABIL
) x
) y
GROUP BY id_agregado;
