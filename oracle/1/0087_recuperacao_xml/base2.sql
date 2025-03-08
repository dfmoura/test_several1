SELECT
    DENSE_RANK() OVER (ORDER BY trunc(dhemissao), codemp, codparc, NUMNOTA, Sequencia) AS grupo,
    B.Origem,
    B.chaveacesso,
    B.codemp,
    B.nunota,
    B.NUMNOTA,
    B.dhEmissao,
    B.codparc,
    B.razaosocial,
    B.UF,
    B.CNPJ_CPF,
    B.sequencia,
    B.CFOP,
    B.CST,
    B.ncm,
    B.codprod,
    B.descrprod,
    B.codvol,
    B.qtdneg,
    B.vlrunit,
    B.vlrtot,
    B.baseicms,
    B.aliqicms,
    B.vlricms

FROM (
    SELECT *
    FROM (
        SELECT 
            r.Origem,
            r.chaveacesso,
            r.codemp,
            r.nunota,
            r.NUMNOTA,
            r.dhEmissao,
            r.sequencia,
            r.CFOP,
            r.CST,
            r.ncm,
            r.codprod,
            r.descrprod,
            r.codvol,
            r.qtdneg,
            r.vlrunit,
            r.vlrtot,
            r.baseicms,
            r.aliqicms,
            r.vlricms,
            r.CNPJ_CPF,
            par.codparc,
            par.razaosocial,
            r.UF
        FROM (
            SELECT  
                c.Origem,
                c.chaveacesso,
                c.codemp,
                c.nunota,
                c.nNF NUMNOTA,
                c.dhEmissao,
                TO_NUMBER(c.nItem) sequencia,
                TO_NUMBER(c.CFOP) CFOP,
                TO_NUMBER(c.CST) CST,
                c.ncm,
                c.cProd codprod,
                c.xProd descrprod,
                c.uTrib codvol,
                TO_NUMBER(REPLACE(c.qCom, '.', ',')) qtdneg,
                TO_NUMBER(REPLACE(c.vUnCom, '.', ',')) vlrunit,
                TO_NUMBER(REPLACE(c.vProd, '.', ',')) vlrtot,
                TO_NUMBER(REPLACE(c.vBC, '.', ',')) baseicms,
                TO_NUMBER(REPLACE(c.pICMS, '.', ',')) aliqicms,
                TO_NUMBER(REPLACE(c.vICMS, '.', ',')) vlricms,
                c.CNPJ_CPF,
                c.UF
            FROM (
                SELECT
                    'DADOS XML' Origem,
                    t.chaveacesso,
                    t.codemp,
                    t.nunota,
                    t.nNF,
                    t.dhEmi AS dhEmissao,
                    t.mod,
                    p.nItem,
                    p.CFOP,
                    p.CST,
                    p.ncm,
                    p.cProd,
                    p.xProd,
                    p.uTrib,
                    p.qCom,
                    p.vUnCom,
                    p.vProd,
                    NVL(p.vBC, '0') AS vBC,
                    NVL(p.pICMS, '0') AS pICMS,
                    NVL(p.vICMS, '0') AS vICMS,
                    t.CNPJ_CPF,
                    t.UF
                FROM 
                (SELECT 
                    EXTRACT(XMLTYPE(xml), '/*').GETROOTELEMENT() AS tag_raiz,
                    XMLTYPE(xml).EXTRACT('/nfeProc/NFe/infNFe/emit/CNPJ/text() | /nfeProc/NFe/infNFe/emit/CPF/text()').getStringVal() AS CNPJ_CPF,
                    XMLTYPE(xml).EXTRACT('/nfeProc/NFe/infNFe/ide/nNF/text()').getStringVal() AS nNF,
                    DHEMISS AS dhEmi,
                    XMLTYPE(xml).EXTRACT('/nfeProc/NFe/infNFe/ide/mod/text()').getStringVal() AS mod,
                    XMLTYPE(xml).EXTRACT('/nfeProc/NFe/infNFe/emit/enderEmit/UF/text()').getStringVal() AS UF,
                    codemp,
                    chaveacesso,
                    nunota,
                    xml
                FROM TGFIXN
                WHERE xml IS NOT NULL AND TIPO = 'N'
                ORDER BY chaveacesso DESC) t,
                XMLTABLE('/nfeProc/NFe/infNFe/det' PASSING XMLTYPE(t.xml)
                COLUMNS 
                    nItem   VARCHAR2(50)  PATH '@nItem',
                    CFOP    VARCHAR2(10)  PATH 'prod/CFOP',
                    ncm     VARCHAR2(50)  PATH 'prod/NCM',
                    cProd   VARCHAR2(50)  PATH 'prod/cProd',
                    xProd   VARCHAR2(50)  PATH 'prod/xProd',
                    uTrib   VARCHAR2(10)  PATH 'prod/uTrib',
                    qCom    VARCHAR2(20)  PATH 'prod/qCom',
                    vUnCom  VARCHAR2(20)  PATH 'prod/vUnCom',
                    vProd   VARCHAR2(20)  PATH 'prod/vProd',
                    CST     VARCHAR2(10)  PATH 'imposto/ICMS/ICMS40/CST | imposto/ICMS/ICMS51/CST | imposto/ICMS/ICMS20/CST | imposto/ICMS/ICMS60/CST| imposto/ICMS/ICMS00/CST| imposto/ICMS/ICMS90/CST',
                    vBC     VARCHAR2(10)  PATH 'imposto/ICMS/ICMS40/vBC | imposto/ICMS/ICMS51/vBC | imposto/ICMS/ICMS20/vBC | imposto/ICMS/ICMS60/vBC| imposto/ICMS/ICMS00/vBC| imposto/ICMS/ICMS90/vBC',
                    pICMS   VARCHAR2(10)  PATH 'imposto/ICMS/ICMS40/pICMS | imposto/ICMS/ICMS51/pICMS | imposto/ICMS/ICMS20/pICMS | imposto/ICMS/ICMS60/pICMS| imposto/ICMS/ICMS00/pICMS| imposto/ICMS/ICMS90/pICMS',
                    vICMS   VARCHAR2(10)  PATH 'imposto/ICMS/ICMS40/vICMS | imposto/ICMS/ICMS51/vICMS | imposto/ICMS/ICMS20/vICMS | imposto/ICMS/ICMS60/vICMS| imposto/ICMS/ICMS00/vICMS| imposto/ICMS/ICMS90/vICMS'
                ) p
            )c
        ) r
        LEFT JOIN tgfpar par ON r.CNPJ_CPF = par.cgc_cpf AND par.ativo = 'S'

        UNION ALL

        SELECT 
            'DADOS SISTEMA' Origem,
            cab.CHAVENFE CHAVEACESSO,
            cab.codemp,
            cab.nunota,
            TO_CHAR(cab.numnota) numnota,
            cab.dtneg dhemissao,
            ite.sequencia,
            ite.codcfo cfop,
            ite.codtrib cst,
            pro.ncm,
            TO_CHAR(ite.codprod) codprod,
            pro.descrprod,
            ite.codvol,
            ite.qtdneg,
            ite.vlrunit,
            ite.vlrtot,
            ite.baseicms,
            ite.aliqicms,
            ite.vlricms,
            par.CGC_CPF CNPJ_CPF,
            cab.codparc,
            par.razaosocial,
            ufs.uf
        FROM tgfcab cab
        INNER JOIN tgfite ite ON cab.nunota = ite.nunota
        INNER JOIN tgfpro pro ON ite.codprod = pro.codprod
        INNER JOIN tgfpar par ON cab.codparc = par.codparc
        INNER JOIN tsicid cid ON par.codcid = cid.codcid
        INNER JOIN tsiufs ufs ON cid.uf = ufs.coduf
        WHERE 
            cab.codtipoper IN (SELECT DISTINCT codtipoper FROM tgftop WHERE NFE = 'T')
    )
    WHERE 

    dhemissao BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    AND (nunota = :P_NUNOTA OR :P_NUNOTA IS NULL)
    AND codemp IN :P_EMPRESA

) B
ORDER BY 
    grupo,
    trunc(dhemissao),
    codemp,
    codparc,
    NUMNOTA,
    sequencia