WITH DRE AS (
    SELECT
        DRE1.CODIGO,
        DRE1.DESCRICAO,
        DRE1.AD_TPPROD,
        DRE2.CODNAT,
        DRE1.TIPMOV
    FROM
        AD_DREGERFIN DRE1
        INNER JOIN AD_DREGERFINDETALHE DRE2 ON DRE1.CODIGO = DRE2.CODIGO
)
SELECT
    DRE.CODIGO,
    DRE.DESCRICAO,
    SUM(
        ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC
    ) AS VLRFAT
FROM
    TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER
    AND TOP.DHALTER = (
        SELECT
            MAX(DHALTER)
        FROM
            TGFTOP
        WHERE
            CODTIPOPER = CAB.CODTIPOPER
    )
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
    INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
    INNER JOIN DRE ON PRO.AD_TPPROD = DRE.AD_TPPROD
    AND CAB.CODNAT = DRE.CODNAT
    AND CAB.TIPMOV = DRE.TIPMOV
WHERE
    TOP.GOLSINAL = -1
    AND (
        CAB.DTNEG BETWEEN '01-01-2024'
        AND '31-01-2024'
    ) --:P_PERIODO.INI AND  :P_PERIODO.FIN)
    --AND (CAB.CODEMP IN :P_EMPRESA)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
GROUP BY
    DRE.CODIGO,
    DRE.DESCRICAO