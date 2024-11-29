--Criar um relatório de reservas pendentes de faturamento por empresa e hotel.
--O relatório apresenta o valor total a faturar de cada hotel/empresa de uma forma mais intuitiva que a tela.
select
    res.codres,
    res.empresafat,
    emp.nomefantasia,
    res.STATUSSOL,
    res.statusres,
    res.statusfat,
    res.hotelsug,
    res.codparchotel,
    par.razaosocial,
    res.codparc,
    par1.razaosocial as razaosocial1,
    res.checkout - res.checkin as dias,
    res.valor,
    (res.checkout - res.checkin) * res.valor as valortotal
from
    ad_reservas res
    left join tgfpar par on res.codparchotel = par.codparc
    inner join tgfpar par1 on res.codparc = par1.codparc
    left join tsiemp emp on res.empresafat = emp.codemp
where
    res.statusfat = 1
    and res.STATUSSOL = 2
    and res.statusres = 2