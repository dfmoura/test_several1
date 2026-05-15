    SELECT
      d.ORDEM,
d.HIERARQUIA,
      d.descricao,
      sum(bp_tecway) valor
    FROM DET_DRE_TW d
        LEFT JOIN CAD_CONTA_DRE_TW c  ON c.ID_DET_DRE_TW = d.ID
        LEFT JOIN BP_TECWAY t ON t.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
           

    WHERE d.ID_ESTR_DRE_TW = 6 AND t.MES = '12/2024'  AND NUMLOTE <> 8888
    GROUP BY
      d.ORDEM,
      d.HIERARQUIA,
      d.descricao
ORDER BY d.ORDEM 

/*
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA
           AND (
                :VAR_EMPRESA IS NULL
                OR :VAR_EMPRESA = ''
                OR FIND_IN_SET(t.ID_EMPRESA, :VAR_EMPRESA)
           )

*/