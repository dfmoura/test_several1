SELECT
    TO_CHAR(rat.dhbaixa, 'YYYY') AS ano,
    TO_CHAR(rat.dhbaixa, 'MM') AS mes,
    TO_CHAR(rat.dhbaixa, 'MM/YYYY') AS mes_ano,
    cus.AD_FC_CATEGORIA,
    F_DESCROPC('TSICUS','AD_FC_CATEGORIA',cus.AD_FC_CATEGORIA) DESC_FC_CATEGORIA,
    cus.codcencus,
    cus.descrcencus,
    crn.codnat,
    nat.descrnat,
    NVL(
        SUM(
            CASE 
                WHEN rat.recdesp = -1 
                    THEN rat.vlrbaixa * -1 
                ELSE rat.vlrbaixa 
            END
        ), 0
    ) AS vlrbaixa
FROM tsicus cus
LEFT JOIN tgfcrn crn 
       ON cus.codcencus = crn.codcencus
LEFT JOIN vgffinrat rat 
       ON crn.codnat = rat.codnat
LEFT JOIN tgfnat nat 
       ON rat.codnat = nat.codnat
WHERE cus.codcencus BETWEEN 160000 AND 350000
  AND rat.dhbaixa IS NOT NULL
  AND TRUNC(rat.dhbaixa) BETWEEN 
        TO_DATE('01/01/2026', 'DD/MM/YYYY') 
    AND TO_DATE('31/03/2026', 'DD/MM/YYYY')
GROUP BY
    TO_CHAR(rat.dhbaixa,'YYYY'),
    TO_CHAR(rat.dhbaixa,'MM'),
    TO_CHAR(rat.dhbaixa,'MM/YYYY'),
    cus.AD_FC_CATEGORIA,
    F_DESCROPC('TSICUS','AD_FC_CATEGORIA',cus.AD_FC_CATEGORIA),
    cus.codcencus,
    cus.descrcencus,
    crn.codnat,
    nat.descrnat
ORDER BY
    1, 2, 4, 6