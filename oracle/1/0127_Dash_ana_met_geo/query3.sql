select 
marca, 
CODPROD,
DESCRPROD,
sum(vlr) vlr,
sum(qtd) qtd
from VGF_VENDAS_SATIS
where dtmov between '01/07/2025' and '30/06/2026'
and codparc = 300
and marca = 'FULLAND'
group by 
marca, 
CODPROD,
DESCRPROD