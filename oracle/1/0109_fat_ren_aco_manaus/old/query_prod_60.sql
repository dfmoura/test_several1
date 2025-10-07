    <snk:query var="fat_total">  
        SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
        SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRFAT
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('V', 'D')
          AND AD_COMPOE_FAT = 'S'
          AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
          AND CODEMP IN (:P_EMPRESA)
          AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
    </snk:query> 

    <snk:query var="fat_tipo">  
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codgrupai,
                descrgrupo_nivel1,
                SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRFAT,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(VLRNOTA)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('V', 'D')
              AND AD_COMPOE_FAT = 'S'
              AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
              AND CODEMP IN (:P_EMPRESA)
              AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
            GROUP BY codgrupai,descrgrupo_nivel1
        ),
        bas1 AS (
            SELECT 
                codgrupai,
                descrgrupo_nivel1,
                VLRFAT,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
                CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
                SUM(VLRFAT) AS VLRFAT
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END
        )
        SELECT codgrupai AD_TPPROD,descrgrupo_nivel1 TIPOPROD,SUM(VLRFAT)VLRFAT 
        FROM bas2
        GROUP BY codgrupai,descrgrupo_nivel1 
        ORDER BY SUM(VLRFAT) DESC
    </snk:query> 



    <snk:query var="cip_total">  	
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codgrupai,
                codemp,
                empresa,
                SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRNOTA,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(VLRNOTA)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('V', 'D')
              AND AD_COMPOE_FAT = 'S'
              AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
              AND CODEMP IN (:P_EMPRESA)
              AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
            GROUP BY codemp, codgrupai, empresa
        ),
        bas1 AS (
            SELECT 
                codgrupai,
                codemp,
                empresa,
                VLRNOTA,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
                codemp,
                empresa,
                SUM(VLRNOTA) AS VLRNOTA
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                codemp,
                empresa
        )
        SELECT SUM(VLRNOTA)VLRCIP 
        FROM bas2
        WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 30000)) 
    </snk:query>    
    

    <snk:query var="cip_produto">  	
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codgrupai,
                codemp,
                empresa,
                SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRNOTA,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(VLRNOTA)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('V', 'D')
              AND AD_COMPOE_FAT = 'S'
              AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
              AND CODEMP IN (:P_EMPRESA)
              AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
            GROUP BY codemp, codgrupai, empresa
        ),
        bas1 AS (
            SELECT 
                codgrupai,
                codemp,
                empresa,
                VLRNOTA,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
                codemp,
                empresa,
                SUM(VLRNOTA) AS VLRNOTA
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                codemp,
                empresa
        )
        SELECT codgrupai,codemp,empresa,SUM(VLRNOTA)VLRFAT 
        FROM bas2
        WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 30000)) 
        GROUP BY codgrupai,codemp,empresa 
        ORDER BY SUM(VLRNOTA) DESC
    </snk:query> 
    
    

    
<snk:query var="fat_ger">
    WITH bas AS (
        SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
            codemp,
            codgrupai,
            codvend,
            LEFT(vendedor, 8) AS vendedor,
            SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRNOTA,
            -- Soma total por codgrupai usando OVER (PARTITION BY)
            SUM(SUM(VLRNOTA)) OVER (PARTITION BY codgrupai) AS total_grupo
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('V', 'D')
          AND AD_COMPOE_FAT = 'S'
          AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
          AND CODEMP IN (:P_EMPRESA)
          AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
        GROUP BY codemp, codgrupai, codvend, vendedor
    ),
    bas1 AS (
        SELECT 
            codemp,
            codgrupai,
            codvend,
            vendedor,
            VLRNOTA,
            total_grupo,
            -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
            DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
        FROM bas
    ),
    bas2 AS (
        SELECT 
            CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
            codvend,
            vendedor,
            SUM(VLRNOTA) AS VLRNOTA
        FROM bas1
        GROUP BY 
            CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
            codvend,
            vendedor
    )
    SELECT codgrupai,CODVEND,VENDEDOR,SUM(VLRNOTA)VLRFAT 
    FROM bas2
    WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 30000)) 
    GROUP BY codgrupai,CODVEND,VENDEDOR 
    ORDER BY SUM(VLRNOTA) DESC
</snk:query>    
    



<snk:query var="fat_produto">
    WITH bas AS (
        SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
            codemp,
            codgrupai,
            descrgrupo_nivel1,
            codprod,
            descrprod,
            SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRNOTA,
            -- Soma total por codgrupai usando OVER (PARTITION BY)
            SUM(SUM(VLRNOTA)) OVER (PARTITION BY codgrupai) AS total_grupo
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('V', 'D')
          AND AD_COMPOE_FAT = 'S'
          AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
          AND CODEMP IN (:P_EMPRESA)
          AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
        GROUP BY codemp, codgrupai, descrgrupo_nivel1, codprod, descrprod
    ),
    bas1 AS (
        SELECT 
            codemp,
            codgrupai,
            descrgrupo_nivel1,
            codprod,
            descrprod,
            VLRNOTA,
            total_grupo,
            -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
            DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
        FROM bas
    ),
    bas2 AS (
        SELECT 
            codemp, 
            CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS AD_TPPROD,
            CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
            codprod,
            descrprod, 
            SUM(VLRNOTA) AS VLRNOTA
        FROM bas1
        GROUP BY 
            codemp, 
            CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
            CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END,
            codprod,
            descrprod
    )
    SELECT * 
    FROM bas2
    WHERE (ad_tpprod = :A_TPPROD OR (:A_TPPROD IS NULL AND ad_tpprod = 30000)) 
      AND CODEMP IN (:P_EMPRESA)
</snk:query>

    <snk:query var="fat_prod_titulo">
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codemp,
                codgrupai,
                descrgrupo_nivel1,
                codprod,
                descrprod,
                SUM(VLRNOTA)-SUM(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END) AS VLRNOTA,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(VLRNOTA)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('V', 'D')
              AND AD_COMPOE_FAT = 'S'
              AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
              AND CODEMP IN (:P_EMPRESA)
              AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
            GROUP BY codemp, codgrupai, descrgrupo_nivel1, codprod, descrprod
        ),
        bas1 AS (
            SELECT 
                codemp,
                codgrupai,
                descrgrupo_nivel1,
                codprod,
                descrprod,
                VLRNOTA,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                codemp, 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS AD_TPPROD,
                CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
                codprod,
                descrprod, 
                SUM(VLRNOTA) AS VLRNOTA
            FROM bas1
            GROUP BY 
                codemp, 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END,
                codprod,
                descrprod
        )
        SELECT AD_TPPROD,descrgrupo_nivel1 
        FROM bas2
        WHERE (ad_tpprod = :A_TPPROD OR (:A_TPPROD IS NULL AND ad_tpprod = 30000)) 
          AND CODEMP IN (:P_EMPRESA)
        GROUP BY AD_TPPROD,descrgrupo_nivel1
    </snk:query>