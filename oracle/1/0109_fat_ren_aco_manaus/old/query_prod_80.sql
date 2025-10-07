
    <snk:query var="fat_total">  
        SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
        SUM(vlrdev) AS vlrdev
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('D')
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
                SUM(vlrdev) AS vlrdev,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(vlrdev)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('D')
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
                vlrdev,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END AS codgrupai,
                CASE WHEN rn <= 4 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
                SUM(vlrdev) AS vlrdev
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END,
                CASE WHEN rn <= 4 THEN descrgrupo_nivel1 ELSE 'Outros' END
        )
        SELECT codgrupai AD_TPPROD,descrgrupo_nivel1 TIPOPROD,SUM(vlrdev)VLRDEV 
        FROM bas2
        GROUP BY codgrupai,descrgrupo_nivel1 
        ORDER BY SUM(vlrdev) DESC
    </snk:query> 



    <snk:query var="cip_total">  	
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codgrupai,
                codemp,
                empresa,
                SUM(vlrdev) AS vlrdev,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(vlrdev)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('D')
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
                vlrdev,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END AS codgrupai,
                codemp,
                empresa,
                SUM(vlrdev) AS vlrdev
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END,
                codemp,
                empresa
        )
        SELECT SUM(vlrdev) VLRCIP 
        FROM bas2
        WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 9999)) 
    </snk:query>    
    

    <snk:query var="cip_produto">  	
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codgrupai,
                codemp,
                empresa,
                SUM(vlrdev) AS vlrdev,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(vlrdev)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('D')
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
                vlrdev,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
                codemp,
                empresa,
                SUM(vlrdev) AS vlrdev
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                codemp,
                empresa
        )
        SELECT codgrupai,codemp,empresa,SUM(vlrdev)vlrdev 
        FROM bas2
        WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 9999)) 
        GROUP BY codgrupai,codemp,empresa 
        ORDER BY SUM(vlrdev) DESC
    </snk:query> 
    
    

    
<snk:query var="fat_ger">
    WITH bas AS (
        SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
            codemp,
            codgrupai,
            codvend,
            LEFT(vendedor, 8) AS vendedor,
            SUM(vlrdev) AS vlrdev,
            -- Soma total por codgrupai usando OVER (PARTITION BY)
            SUM(SUM(vlrdev)) OVER (PARTITION BY codgrupai) AS total_grupo
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('D')
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
            vlrdev,
            total_grupo,
            -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
            DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
        FROM bas
    ),
    bas2 AS (
        SELECT 
            CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END AS codgrupai,
            codvend,
            vendedor,
            SUM(vlrdev) AS vlrdev
        FROM bas1
        GROUP BY 
            CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END,
            codvend,
            vendedor
    )
    SELECT codgrupai,CODVEND,VENDEDOR,SUM(VLRDEV)VLRDEV 
    FROM bas2
    WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 9999)) 
    GROUP BY codgrupai,CODVEND,VENDEDOR 
    ORDER BY SUM(VLRDEV) DESC
</snk:query>    
    



<snk:query var="fat_produto">
    WITH bas AS (
        SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
            codemp,
            codgrupai,
            descrgrupo_nivel1,
            codprod,
            descrprod,
            SUM(vlrdev) AS vlrdev,
            -- Soma total por codgrupai usando OVER (PARTITION BY)
            SUM(SUM(vlrdev)) OVER (PARTITION BY codgrupai) AS total_grupo
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('D')
          AND AD_COMPOE_FAT = 'S'
          AND DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
          AND CODEMP IN (:P_EMPRESA)
          AND (NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
        GROUP BY codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod
    ),
    bas1 AS (
        SELECT
            codemp,
            codgrupai,
            descrgrupo_nivel1,
            codprod,
            descrprod,
            vlrdev,
            total_grupo,
            -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
            DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
        FROM bas
    ),
    bas2 AS (
        SELECT 
            codemp,
            CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END AS codgrupai,
            CASE WHEN rn <= 4 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
            codprod,
            descrprod,
            SUM(vlrdev) AS vlrdev
        FROM bas1
        GROUP BY 
            codemp,
            CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END,
            CASE WHEN rn <= 4 THEN descrgrupo_nivel1 ELSE 'Outros' END,
            codprod,                
            descrprod
    )
    SELECT codemp,codgrupai AD_TPPROD,descrgrupo_nivel1 TIPOPROD,codprod,descrprod,SUM(vlrdev)vlrdev 
    FROM bas2
    WHERE (codgrupai = :A_TPPROD OR (:A_TPPROD IS NULL AND codgrupai = 9999))
    GROUP BY codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod 
    ORDER BY SUM(vlrdev) DESC
</snk:query>

    <snk:query var="fat_prod_titulo">
        WITH bas AS (
            SELECT /*+ INDEX(vw_rentabilidade_aco idx_rent_dtneg_tipmov) */
                codemp,
                codgrupai,
                descrgrupo_nivel1,
                codprod,
                descrprod,
                SUM(vlrdev) AS vlrdev,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(vlrdev)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('D')
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
                vlrdev,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
            FROM bas
        ),
        bas2 AS (
            SELECT 
                codemp, 
                CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END AS AD_TPPROD,
                CASE WHEN rn <= 4 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
                codprod,
                descrprod, 
                SUM(vlrdev) AS vlrdev
            FROM bas1
            GROUP BY 
                codemp, 
                CASE WHEN rn <= 4 THEN codgrupai ELSE 9999 END,
                CASE WHEN rn <= 4 THEN descrgrupo_nivel1 ELSE 'Outros' END,
                codprod,
                descrprod
        )
        SELECT AD_TPPROD,descrgrupo_nivel1 
        FROM bas2
        WHERE (ad_tpprod = :A_TPPROD OR (:A_TPPROD IS NULL AND ad_tpprod = 9999)) 
          AND CODEMP IN (:P_EMPRESA)
        GROUP BY AD_TPPROD,descrgrupo_nivel1
    </snk:query>
