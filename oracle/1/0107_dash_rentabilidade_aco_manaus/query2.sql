select 
sum(case when dtneg between CAST('2025-08-01' AS datetime) and CAST('2025-08-31' AS datetime) then totalliq else 0 end) totalliq_atual,
sum(case when dtneg between DATEADD(month, -1, CAST('2025-08-01' AS datetime)) 
and DATEADD(day, 30, DATEADD(month, -1, CAST('2025-08-01' AS datetime))) then totalliq else 0 end) totalliq_anterior
from vw_rentabilidade_aco 

