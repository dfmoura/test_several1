select 
cus.codcencus,
cus.descrcencus,
CRN.CODNAT,
nvl(sum(case when rat.recdesp = -1 then rat.vlrbaixa * -1 else rat.vlrbaixa end),0)vlrbaixa
from tsicus cus
left join TGFCRN CRN on cus.codcencus = CRN.codcencus
LEFT join VGFFINRAT rat on CRN.codnat = RAT.codnat
where cus.codcencus >= 160000
GROUP BY
cus.codcencus,
cus.descrcencus,
CRN.CODNAT