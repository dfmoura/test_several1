select


PRO.CODPROD,
PRO.DESCRPROD,
PRO.CODGRUPOPROD,
PRO.MARCA,
exc.vlrvenda,
exc.tipo,
exc.modbaseicms,
exc.nutab,
tab.codtab,
nta.nometab,
tab.dtvigor,
tab.percentual,
tab.ad_descper


from tgfpro pro
inner join tgfgru gru on pro.codgrupoprod = gru.codgrupoprod
left join tgfexc exc on pro.codprod = exc.codprod
left join tgftab tab on exc.nutab = tab.nutab
left join tgfnta nta on tab.codtab = nta.codtab
where SUBSTR(PRO.CODGRUPOPROD, 1, 1) = 1 and nta.ativo = 'S'