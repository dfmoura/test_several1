    <snk:query var="fat_tipo">  
        WITH CTE AS (
            SELECT 
                codgrupai,
                descrgrupo_nivel1,
                SUM(totalliq) AS totalliq,
                ROW_NUMBER() OVER (ORDER BY SUM(totalliq) DESC) AS rn
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('V', 'D')
              AND ATIVO_TOP = 'S'
              AND AD_COMPOE_FAT = 'S'
              AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
              AND CODEMP IN (:P_EMPRESA)
            GROUP BY codgrupai,descrgrupo_nivel1
        )
        SELECT 
            CASE 
                WHEN rn <= 6 THEN codgrupai
                ELSE 9999
            END AS AD_TPPROD,
            CASE 
                WHEN rn <= 6 THEN descrgrupo_nivel1
                ELSE 'Outros'
            END AS TIPOPROD,
            SUM(totalliq) AS VLRFAT
        FROM CTE
        GROUP BY CASE 
                    WHEN rn <= 6 THEN codgrupai
                    ELSE 9999
                 END,
                 CASE 
                     WHEN rn <= 6 THEN descrgrupo_nivel1
                     ELSE 'Outros'
                 END
        ORDER BY SUM(totalliq) DESC
    </snk:query> 
















    <snk:query var="fat_produto">
    SELECT 
    codemp,codgrupai AD_TPPROD,descrgrupo_nivel1,codprod,descrprod,codvend,vendedor,SUM(totalliq) AS TOTALLIQ
    FROM vw_rentabilidade_aco
    where
    tipmov IN ('V', 'D')
    AND ATIVO_TOP = 'S'
    AND AD_COMPOE_FAT = 'S'
    AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    AND CODEMP IN (:P_EMPRESA)
    AND codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 30000)
    group by codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod,codvend,vendedor    
</snk:query>



    <snk:query var="fat_produto">
    SELECT 
    codemp,codgrupai AD_TPPROD,descrgrupo_nivel1,codprod,descrprod,codvend,vendedor,SUM(totalliq) AS TOTALLIQ
    FROM vw_rentabilidade_aco
    where
    tipmov IN ('V', 'D')
    AND ATIVO_TOP = 'S'
    AND AD_COMPOE_FAT = 'S'
    AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    AND CODEMP IN (:P_EMPRESA)
    AND (
        codgrupai = :A_TPPROD 
        OR (:A_TPPROD IS NULL AND codgrupai = 30000)
        OR (:A_TPPROD = 9999 AND codgrupai NOT IN (
            SELECT codgrupai 
            FROM (
                SELECT 
                    codgrupai,
                    ROW_NUMBER() OVER (ORDER BY SUM(totalliq) DESC) AS rn
                FROM vw_rentabilidade_aco 
                WHERE tipmov IN ('V', 'D')
                  AND ATIVO_TOP = 'S'
                  AND AD_COMPOE_FAT = 'S'
                  AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                  AND CODEMP IN (:P_EMPRESA)
                GROUP BY codgrupai
            ) ranked
            WHERE rn <= 6
        ))
    )
    group by codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod,codvend,vendedor    
    </snk:query>