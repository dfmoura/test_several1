SELECT 
    codemp,
    codgrupai,
    descrgrupo_nivel1,
    codprod,
    descrprod,
    SUM(totalliq) AS totalliq,
    -- Soma total por codgrupai usando OVER (PARTITION BY)
    SUM(SUM(totalliq)) OVER (PARTITION BY codgrupai) AS total_grupo,
    -- Percentual do produto em relação ao grupo
    CASE 
        WHEN SUM(SUM(totalliq)) OVER (PARTITION BY codgrupai) > 0 
        THEN (SUM(totalliq) * 100.0) / SUM(SUM(totalliq)) OVER (PARTITION BY codgrupai)
        ELSE 0 
    END AS percentual_grupo,
    -- Ranking dentro do grupo por valor
    ROW_NUMBER() OVER (PARTITION BY codgrupai ORDER BY SUM(totalliq) DESC) AS ranking_grupo
FROM vw_rentabilidade_aco 
WHERE tipmov IN ('V', 'D')
  AND ATIVO_TOP = 'S'
  AND AD_COMPOE_FAT = 'S'
  AND DTNEG BETWEEN '01/08/2025' AND '12/08/2025'
GROUP BY codemp, codgrupai, descrgrupo_nivel1, codprod, descrprod
ORDER BY codgrupai, SUM(totalliq) DESC
