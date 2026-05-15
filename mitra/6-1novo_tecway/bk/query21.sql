-- Base: todas as descrições cadastradas (SUB_DET) para o inicial_nota 7 (BP e DRE)
SELECT
    s.ID,
    s.ID_DET_INICIAL_NOTAS,
    s.DESCRICAO AS DESCRICAO_CONTA,
    COALESCE(SUM(x.VALOR_ATUAL), 0) AS VALOR_ATUAL,
    COALESCE(SUM(x.VALOR_ANTERIOR), 0) AS VALOR_ANTERIOR
FROM SUB_DET_INICIAL_NOTAS s
INNER JOIN DET_INICIAL_NOTAS d
    ON d.ID = s.ID_DET_INICIAL_NOTAS
   AND d.ID_INICIAL_NOTA = 7
   AND d.TIPO IN ('BP', 'DRE')
LEFT JOIN (

    SELECT
        c.ID_SUB_DET_INICIAL_NOTAS,
        d.ID AS ID_DET_INICIAL_NOTAS,
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
    INNER JOIN SUB_DET_INICIAL_NOTAS s
        ON s.ID_DET_INICIAL_NOTAS = d.ID
    INNER JOIN CONTA_SUB_DET_INICIAL_NOTAS c
        ON c.ID_SUB_DET_INICIAL_NOTAS = s.ID
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
        c.ID_SUB_DET_INICIAL_NOTAS,
        d.ID

    UNION ALL

    SELECT
        c.ID_SUB_DET_INICIAL_NOTAS,
        d.ID AS ID_DET_INICIAL_NOTAS,
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
    INNER JOIN SUB_DET_INICIAL_NOTAS s
        ON s.ID_DET_INICIAL_NOTAS = d.ID
    INNER JOIN CONTA_SUB_DET_INICIAL_NOTAS c
        ON c.ID_SUB_DET_INICIAL_NOTAS = s.ID
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
        c.ID_SUB_DET_INICIAL_NOTAS,
        d.ID
) x
    ON x.ID_SUB_DET_INICIAL_NOTAS = s.ID
   AND x.ID_DET_INICIAL_NOTAS = s.ID_DET_INICIAL_NOTAS
GROUP BY
    s.ID,
    s.ID_DET_INICIAL_NOTAS,
    s.DESCRICAO
ORDER BY
    s.ID_DET_INICIAL_NOTAS,
    s.ID

