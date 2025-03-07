SELECT
*
FROM (

SELECT 
DENSE_RANK() OVER ( ORDER BY nunota, numnota, sequencia) AS grupo,
D.*
FROM (
SELECT
	    'DADOS XML' Origem,
        f.nunota,
        emp.codemp,
        TO_NUMBER(f.nNF)NUMNOTA,
        f.dhEmissao,
        /*f.mod,*/
	    TO_NUMBER(f.nitem) sequencia,
        TO_NUMBER(f.cfop)cfop,
        TO_NUMBER(f.CST)CST,
        f.ncm,
        TO_NUMBER(f.cProd)codprod,
        f.xProd descrprod,
        f.uTrib codvol,
        TO_NUMBER(f.qCom)qtdneg,
        TO_NUMBER(REPLACE(f.vUnCom, '.', ','))vlrunit,
        TO_NUMBER(REPLACE(f.vProd, '.', ','))vlrtot,
        TO_NUMBER(REPLACE(f.vBC, '.', ','))baseicms,
        TO_NUMBER(REPLACE(f.pICMS, '.', ','))aliqicms,
        TO_NUMBER(REPLACE(f.vICMS, '.', ','))vlricms,
	    f.uf
FROM (
    SELECT 
        t.nunota,
        t.CNPJ,
        t.nNF,
        t.dhEmi,
        to_date(TO_CHAR(TO_TIMESTAMP_TZ(t.dhEmi, 'YYYY-MM-DD"T"HH24:MI:SS TZH:TZM'), 'DD/MM/YYYY'), 'DD/MM/YYYY') AS dhEmissao,
        t.mod,
        x.nitem,
        x.cfop,
        x.CST,
        x.ncm,
        x.cProd,
        x.xProd,
        x.uTrib,
        x.qCom,
        x.vUnCom,
        x.vProd,
        NVL(x.vBC, '0') AS vBC,
        NVL(x.pICMS, '0') AS pICMS,
        NVL(x.vICMS, '0') AS vICMS,
	    t.uf
    FROM (
        SELECT 
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/emit/CNPJ/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS CNPJ,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/nNF/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS nNF,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/dhEmi/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS dhEmi,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/mod/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS mod,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/dest/enderDest/UF/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS UF,
            xml,
            nunota
        FROM tgfnfe
        ORDER BY chavenfe DESC
    ) t,
    XMLTABLE(
        XMLNAMESPACES(DEFAULT 'http://www.portalfiscal.inf.br/nfe'),
        '/NFe/infNFe/det'
        PASSING XMLTYPE(t.xml)
        COLUMNS
            nitem  VARCHAR2(50) PATH '@nItem',
            cfop   VARCHAR2(50) PATH 'prod/CFOP',
            ncm    VARCHAR2(50) PATH 'prod/NCM',
            cProd  VARCHAR2(50) PATH 'prod/cProd',
            xProd  VARCHAR2(50) PATH 'prod/xProd',
            uTrib  VARCHAR2(10) PATH 'prod/uTrib',
            qCom   VARCHAR2(20) PATH 'prod/qCom',
            vUnCom VARCHAR2(20) PATH 'prod/vUnCom',
            vProd  VARCHAR2(20) PATH 'prod/vProd',
            CST    VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/CST | imposto/ICMS/ICMS51/CST | imposto/ICMS/ICMS20/CST | imposto/ICMS/ICMS60/CST| imposto/ICMS/ICMS00/CST| imposto/ICMS/ICMS90/CST',
            vBC    VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/vBC | imposto/ICMS/ICMS51/vBC | imposto/ICMS/ICMS20/vBC | imposto/ICMS/ICMS60/vBC| imposto/ICMS/ICMS00/vBC| imposto/ICMS/ICMS90/vBC',
            pICMS  VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/pICMS | imposto/ICMS/ICMS51/pICMS | imposto/ICMS/ICMS20/pICMS | imposto/ICMS/ICMS60/pICMS| imposto/ICMS/ICMS00/pICMS| imposto/ICMS/ICMS90/pICMS',
            vICMS  VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/vICMS | imposto/ICMS/ICMS51/vICMS | imposto/ICMS/ICMS20/vICMS | imposto/ICMS/ICMS60/vICMS| imposto/ICMS/ICMS00/vICMS| imposto/ICMS/ICMS90/vICMS'
    ) x
)f
inner join tsiemp emp on f.CNPJ = emp.cgc
WHERE 
dhemissao between :P_PERIODO.INI and :P_PERIODO.FIN
AND (nunota = :P_NUNOTA OR :P_NUNOTA IS NULL)
and codemp in :P_EMPRESA


UNION ALL


select 
'DADOS SISTEMA' Origem,
cab.nunota,
cab.codemp,
cab.numnota,

cab.dtfatur dhEmissao,

ite.sequencia,
ite.codcfo cfop,
ite.codtrib cst,
pro.ncm,
ite.codprod,
pro.descrprod,
ite.codvol,

ite.qtdneg,
ite.vlrunit,
ite.vlrtot,
ite.baseicms,
ite.aliqicms,
ite.vlricms,
ufs.uf
from tgfcab cab
inner join tgfite ite on cab.nunota = ite.nunota
inner join tgfpro pro on ite.codprod = pro.codprod
inner join tgfpar par on cab.codparc = par.codparc
inner join tsicid cid on par.codcid = cid.codcid
inner join tsiufs ufs on cid.uf = ufs.coduf
WHERE 
cab.dtfatur between :P_PERIODO.INI and :P_PERIODO.FIN
AND (cab.nunota = :P_NUNOTA OR :P_NUNOTA IS NULL)
and cab.codemp in :P_EMPRESA
and cab.tipmov = 'V'
)D

)

ORDER BY grupo,origem,nunota, numnota, sequencia