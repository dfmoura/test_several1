select 
sum(case when dtneg between '01/08/2025' and '31/08/2025' then totalliq else 0 end) totalliq_atual,
sum(case when dtneg between add_months('01/08/2025', -1) 
and add_months('01/08/2025', -1) + ('31/08/2025' - '01/08/2025') then totalliq else 0 end) totalliq_anterior
from vw_rentabilidade_aco 

