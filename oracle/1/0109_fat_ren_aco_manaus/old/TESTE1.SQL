SELECT 
vw.DTNEG,
vw.NUNOTA,
vw.CODPROD,
vw.VLRUNIT,
SUM(vw.VLRDESC) AS VLRDESC,
-- Coluna com o último preço de tabela válido para o produto na data da negociação
ISNULL(tab_preco.VLRVENDA, 0) AS ULTIMO_PRECO_TABELA
FROM vw_rentabilidade_aco vw
LEFT JOIN (
    SELECT 
        PRO.CODPROD,
        EXC.VLRVENDA,
        TAB.DTVIGOR,
        ROW_NUMBER() OVER (PARTITION BY PRO.CODPROD ORDER BY TAB.DTVIGOR DESC) AS RN
    FROM TGFPRO PRO
    LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
    LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
    LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
    WHERE NTA.ATIVO = 'S' AND PRO.ATIVO = 'S'
) tab_preco ON vw.CODPROD = tab_preco.CODPROD 
            AND tab_preco.DTVIGOR <= vw.DTNEG
            AND tab_preco.RN = 1
WHERE vw.tipmov IN ('V', 'D')
  AND vw.AD_COMPOE_FAT = 'S'
  AND vw.DTNEG BETWEEN '01/08/2025' and '20/08/2025'
  AND vw.CODEMP = 11
GROUP BY
vw.DTNEG,
vw.NUNOTA,
vw.CODPROD,
vw.VLRUNIT,
tab_preco.VLRVENDA;