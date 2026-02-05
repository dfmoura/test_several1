/*Gerir entregas - qualidade na entrega*/

select distinct
vgf.CODEMP,
vgf.NUNOTA,
vgf.NUMNOTA,
vgf.CODPARC,
vgf.nomeparc,
vgf.DTNEG,
vgf.DTMOV,

cab.AD_FEEDBACK

FROM VGF_VENDAS_SATIS vgf
inner join tgfcab cab on vgf.nunota = cab.nunota

WHERE cab.AD_FEEDBACK is not null

group by
vgf.CODEMP,
vgf.NUNOTA,
vgf.NUMNOTA,
vgf.CODPARC,
vgf.nomeparc,
vgf.DTNEG,
vgf.DTMOV,
cab.AD_FEEDBACK

order by vgf.nunota desc




------------------------------------------


/*tem testa tambem com o agrupamento percenual */


SELECT 
    AD_FEEDBACK,
    COUNT(*) AS total,
    ROUND(
        COUNT(*) / SUM(COUNT(*)) OVER () * 100,
        2
    ) AS perc
FROM (
    SELECT DISTINCT
        vgf.CODEMP,
        vgf.NUNOTA,
        vgf.NUMNOTA,
        vgf.CODPARC,
        vgf.nomeparc,
        vgf.DTNEG,
        vgf.DTMOV,
        cab.AD_FEEDBACK
    FROM VGF_VENDAS_SATIS vgf
    INNER JOIN tgfcab cab ON vgf.nunota = cab.nunota
    WHERE cab.AD_FEEDBACK IS NOT NULL
)
GROUP BY AD_FEEDBACK
ORDER BY AD_FEEDBACK
