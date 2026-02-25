select 
to_char(rat.dhbaixa,'YYYY') ANO,
to_char(rat.dhbaixa,'MM') MES,
to_char(rat.dhbaixa,'MM/YYYY') MES_ANO,
cus.codcencus,
cus.descrcencus,
CRN.CODNAT,
NAT.DESCRNAT,
nvl(sum(case when rat.recdesp = -1 then rat.vlrbaixa * -1 else rat.vlrbaixa end),0)vlrbaixa
from tsicus cus
left join TGFCRN CRN on cus.codcencus = CRN.codcencus
LEFT join VGFFINRAT rat on CRN.codnat = RAT.codnat
LEFT JOIN TGFNAT NAT ON RAT.CODNAT = NAT.CODNAT
where cus.codcencus >= 160000
GROUP BY
to_char(rat.dhbaixa,'YYYY'),
to_char(rat.dhbaixa,'MM'),
to_char(rat.dhbaixa,'MM/YYYY'),
cus.codcencus,
cus.descrcencus,
CRN.CODNAT,
NAT.DESCRNAT
ORDER BY 1,2