SELECT
    d.ORDEM,
    d.HIERARQUIA,
    d.descricao,


  
  
    SUM(
        CASE
            WHEN t.MES = :VAR_MES
                THEN t.bp_tecway
            ELSE 0
        END
    ) AS VALOR_ATUAL,
    SUM(
        CASE
            WHEN t.MES = DATE_FORMAT(
                STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                '%m/%Y'
            )
                THEN t.bp_tecway
            ELSE 0
        END
    ) AS VALOR_ANTERIOR
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
WHERE d.ID_ESTR_DRE_TW = 6
GROUP BY
    d.ORDEM,
    d.HIERARQUIA,
    d.descricao
ORDER BY
    d.ORDEM