WITH CTE AS (
SELECT 
codgrupai AD_TPPROD,codprod,descrprod,codvend,vendedor,SUM(totalliq) AS VLRFAT,ROW_NUMBER() OVER (ORDER BY SUM(totalliq) DESC) AS rn
FROM vw_rentabilidade_aco
where 
tipmov IN ('V', 'D')
AND ATIVO_TOP = 'S'
AND AD_COMPOE_FAT = 'S'
and dtneg BETWEEN '01/08/2025' 
                   AND '31/08/2025' 
group by codgrupai,codprod,descrprod,codvend,vendedor

    )
    SELECT 
        CASE 
            WHEN rn <= 6 THEN AD_TPPROD
            ELSE 9999
        END AS AD_TPPROD,
        CASE 
            WHEN rn <= 6 THEN codvend
            ELSE 9999
        END AS codvend,
        CASE 
            WHEN rn <= 6 THEN vendedor
            ELSE 'Outros'
        END AS vendedor,

        SUM(VLRFAT) AS VLRFAT
    FROM CTE
    GROUP BY 
        CASE 
            WHEN rn <= 6 THEN AD_TPPROD
            ELSE 9999
        END,
        CASE 
            WHEN rn <= 6 THEN codvend
            ELSE 9999
        END,
        CASE 
            WHEN rn <= 6 THEN vendedor
            ELSE 'Outros'
        END



    ORDER BY SUM(VLRFAT) DESC
    
