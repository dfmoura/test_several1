
/*Gerir entregas - tempo de entrega*/

select distinct vgf.codemp,vgf.nunota,vgf.numnota,vgf.codvend,vgf.apelido, vgf.codparc,vgf.nomeparc,sum(vgf.qtd)qtd,sum(vgf.vlr)vlr,
cab.codtipoper,TOP.DESCROPER,

vgf.dtneg,cab.AD_DTENTREGAEFETIVA,
       TRUNC(cab.AD_DTENTREGAEFETIVA - vgf.dtneg) AS dias_entrega

from VGF_VENDAS_SATIS vgf
inner join tgfcab cab on vgf.nunota = cab.nunota
INNER JOIN TGFTOP TOP ON (
CAB.CODTIPOPER = TOP.CODTIPOPER
AND CAB.DHTIPOPER = (SELECT MAX(TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER)
)
where 
cab.AD_DTENTREGAEFETIVA is not null and vgf.tipmov in ('V') and cab.AD_DTENTREGAEFETIVA >=vgf.dtneg 
group by
vgf.codemp,vgf.nunota,vgf.numnota,vgf.codvend,vgf.apelido, vgf.codparc,vgf.nomeparc,vgf.dtneg,cab.AD_DTENTREGAEFETIVA,cab.codtipoper,TOP.DESCROPER