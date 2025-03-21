SELECT
    CAB.DTMOV,
    CAB.DTNEG,
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.NUNOTA || ' / ' || CAB.NUMNOTA AS NRO,
    CAB.CODEMP,
    CAB.AD_OBSINTERNA,
    EMP.RAZAOSOCIAL AS EMPRESA,
    EMP.CODEMP || '-' || EMP.RAZAOSOCIAL AS EMP,
    EMP.CODEMP || '-' || EMP.RAZAOABREV AS NOMEFANTASIAEMP,
    EMP.CGC AS CPFCNPJ,
    EMP.INSCESTAD AS IE,
    EMP.TELEFONE AS TEL,
    EMP.FAX AS FAX,
    CAB.CODVEND,
    VEN.APELIDO,
    CAB.CODVEND || ' - ' || VEN.APELIDO AS VEND,
    VEN.CODGER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.CODPARC || ' - ' || PAR.NOMEPARC AS PARC,
    PAR.NOMEPARC,
    UFS.UF || ' - ' || UFS.DESCRICAO AS UF,
    ITE.CODPROD || ' - ' || PRO.DESCRPROD AS PROD,
    ITE.CODPROD AS CODPROD,
    PRO.DESCRPROD AS DESCRPROD,
    PRO.MARCA,
    CASE
        WHEN PRO.MARCA IS NULL THEN 'MARCA NÃO CADASTRADA'
        ELSE PRO.MARCA
    END AS MARCA1,
    PRO.CODGRUPOPROD,
    GRU.DESCRGRUPOPROD,
    ITE.CODVOL AS VOL,
    CAB.CODTIPOPER,
    CAB.CODTIPOPER || '-' || TOP.DESCROPER AS TOP,
    TOP.DESCROPER,
    TOP.ATUALEST,
    TOP.ATUALFIN,
    TOP.TIPATUALFIN,
    CAB.STATUSNFE,
    CAB.TIPMOV,
    TOP.BONIFICACAO,
    CAB.CODCENCUS,
    CUS.AD_APELIDO,
    CUS.DESCRCENCUS,
    PRO.AD_QTDVOLLT,
    CASE
        WHEN CAB.TIPMOV = 'D' THEN (ITE.QTDNEG * PRO.AD_QTDVOLLT) * -1
        ELSE (ITE.QTDNEG * PRO.AD_QTDVOLLT)
    END AS QTD,
    CASE
        WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED) * -1
        ELSE (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED)
    END AS VLR,
    CASE
        WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
        ELSE (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
    END AS VLRCUSICM1,
    CASE
        WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
        ELSE (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
    END AS VLRCUSGER1,
    CASE
        WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSSEMICM * ITE.QTDNEG) * -1
        ELSE (CUS1.CUSSEMICM * ITE.QTDNEG)
    END AS VLRCUSICM2,
    CASE
        WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSGER * ITE.QTDNEG) * -1
        ELSE (CUS1.CUSGER * ITE.QTDNEG)
    END AS VLRCUSGER2
FROM
    TSIEMP EMP
INNER JOIN TGFCAB CAB ON EMP.CODEMP = CAB.CODEMP
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
INNER JOIN TSIUFS UFS ON CID.UF = UFS.CODUF
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
INNER JOIN TSICUS CUS ON CUS.CODCENCUS = CAB.CODCENCUS
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER
    AND CAB.DHTIPOPER = (SELECT MAX(TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER)
LEFT JOIN TGFCUS CUS1 ON CUS1.CODPROD = ITE.CODPROD
    AND CUS1.CODEMP = CAB.CODEMP
    AND CUS1.DTATUAL <= CAB.DTNEG
WHERE
    TOP.ATUALEST <> 'N'
    AND (
        (TOP.ATUALFIN <> 0 AND TOP.TIPATUALFIN = 'I')
        OR TOP.CODTIPOPER IN (1112, 1113)
        OR TOP.BONIFICACAO = 'S'
    )
    AND CAB.TIPMOV IN ('V', 'D')
    AND CAB.STATUSNOTA = 'L'
    AND (CAB.STATUSNFE = 'A' OR CAB.STATUSNFE = 'T' OR CAB.STATUSNFE = 'S' OR CAB.STATUSNFE IS NULL)
    AND (CUS1.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG AND C.CODEMP = CAB.CODEMP) OR CUS1.DTATUAL IS NULL)