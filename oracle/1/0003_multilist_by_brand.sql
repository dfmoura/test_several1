/*
P_CODGRU
Grupo Marca


SQL:

*/



SELECT 
ad_gruite.codgru value,
ad_gruite.codgru||' - '||ad_grucab.descrgru label
FROM ad_grumarcaite ad_gruite
inner join AD_GRUMARCACAB ad_grucab on ad_gruite.codgru = ad_grucab.codgru
group by
ad_gruite.codgru,
ad_grucab.descrgru







