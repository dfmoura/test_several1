SELECT DISTINCT *
FROM (
    SELECT 
        t.nunota,
        t.CNPJ,
        t.nNF,
        t.dhEmi,
        t.mod,
        x.cfop,
        x.CST, -- Adicionando o CST na seleção
        x.ncm,
        x.cProd,
        x.xProd,
        x.uTrib,
        x.qCom,
        x.vUnCom,
        x.vProd,
        NVL(x.vBC, '0') AS vBC, -- Adicionando o vBC e substituindo nulo por '0'
        NVL(x.pICMS, '0') AS pICMS,
        NVL(x.vICMS, '0') AS vICMS
    FROM (
        SELECT 
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/emit/CNPJ/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS CNPJ,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/nNF/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS nNF,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/dhEmi/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS dhEmi,
            XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/mod/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS mod,
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
            cfop   VARCHAR2(50) PATH 'prod/CFOP',
            ncm    VARCHAR2(50) PATH 'prod/NCM',
            cProd  VARCHAR2(50) PATH 'prod/cProd',
            xProd  VARCHAR2(50) PATH 'prod/xProd',
            uTrib  VARCHAR2(10) PATH 'prod/uTrib',
            qCom   VARCHAR2(20) PATH 'prod/qCom',
            vUnCom VARCHAR2(20) PATH 'prod/vUnCom',
            vProd  VARCHAR2(20) PATH 'prod/vProd',
            CST    VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/CST | imposto/ICMS/ICMS51/CST | imposto/ICMS/ICMS20/CST | imposto/ICMS/ICMS60/CST| imposto/ICMS/ICMS00/CST',
            vBC    VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/vBC | imposto/ICMS/ICMS51/vBC | imposto/ICMS/ICMS20/vBC | imposto/ICMS/ICMS60/vBC| imposto/ICMS/ICMS00/vBC',
            pICMS    VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/pICMS | imposto/ICMS/ICMS51/pICMS | imposto/ICMS/ICMS20/pICMS | imposto/ICMS/ICMS60/pICMS| imposto/ICMS/ICMS00/pICMS',
            vICMS    VARCHAR2(10) PATH 'imposto/ICMS/ICMS40/vICMS | imposto/ICMS/ICMS51/vICMS | imposto/ICMS/ICMS20/vICMS | imposto/ICMS/ICMS60/vICMS| imposto/ICMS/ICMS00/vICMS'
    ) x
)
WHERE nunota = 80531