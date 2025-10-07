select * from TCSCON
where NUMCONTRATO in (213,297,379,524,526,525,117)

select sum(vlrdesdob)vlrdesdob, count(vlrdesdob)count from tgffin
where 
recdesp = 1
and provisao = 'N'
and dhbaixa is null
and codemp = 1

