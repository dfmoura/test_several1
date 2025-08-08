select 
    sum(case when dtneg between '01/08/2025' and '31/08/2025' then totalliq else 0 end) as totalliq_atual,
    sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
    and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end) as totalliq_anterior,
    case 
        when sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
        and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end) = 0 then null
        else round(((sum(case when dtneg between '01/08/2025' and '31/08/2025' then totalliq else 0 end) - 
          sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
          and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end)) * 100.0 / 
         sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
         and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end)), 2)
    end as variacao_percentual
from vw_rentabilidade_aco 
where tipmov = 'V' and ATIVO_TOP = 'S' and AD_COMPOE_FAT = 'S'