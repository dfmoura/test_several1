SELECT
    SUM(QTDPREV) AS QTDPREV,
    SUM(QTDREAL) AS QTDREAL,
    SUM(QTDPREV * PRECOLT) AS VLR_PREV,
    SUM(NVL(VLRREAL, 0)) AS VLR_REAL,
    CASE
        WHEN SUM(QTDPREV) = 0 THEN 100
        ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0)
    END AS PERC,
    CASE
        WHEN SUM(QTDPREV * PRECOLT) = 0 THEN 100
        ELSE NVL(
            SUM(VLRREAL) * 100 / NULLIF(SUM(QTDPREV * PRECOLT), 0),
            0
        )
    END AS PERC_VLR
FROM
    (
        SELECT
            MET.DTREF,
            MET.CODVEND,
            VEN.APELIDO,
            MET.CODPARC,
            PAR.RAZAOSOCIAL,
            PAR.CGC_CPF,
            MET.MARCA,
            MET.QTDPREV,
            MET.QTDREAL,
            NVL(PRC.VLRVENDALT, 0) AS PRECOLT,
            SUM(
                CASE
                    WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED) * -1
                    ELSE (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED)
                END
            ) AS VLRREAL
        FROM
            TGMMET MET
            LEFT JOIN TGFVEN VEN ON (MET.CODVEND = VEN.CODVEND)
            LEFT JOIN TGFPAR PAR ON (MET.CODPARC = PAR.CODPARC)
            LEFT JOIN AD_PRECOMARCA PRC ON (
                MET.MARCA = PRC.MARCA
                AND PRC.CODMETA = MET.CODMETA
                AND PRC.DTREF = '01/07/2023'
            )
            LEFT JOIN TGFCAB CAB ON CAB.CODVEND = VEN.CODVEND
            AND TRUNC(DTMOV, 'MM') = MET.DTREF
            AND CAB.TIPMOV IN ('V', 'D')
            AND CAB.STATUSNOTA = 'L'
            AND (
                CAB.STATUSNFE = 'A'
                OR CAB.STATUSNFE = 'T'
                OR CAB.STATUSNFE IS NULL
            )
            AND CAB.CODPARC = MET.CODPARC
            AND (
                SELECT
                    COUNT(TOP.CODTIPOPER)
                FROM
                    TGFTOP TOP
                WHERE
                    TOP.CODTIPOPER = CAB.CODTIPOPER
                    AND TOP.DHALTER = (
                        SELECT
                            MAX(DHALTER)
                        FROM
                            TGFTOP
                        WHERE
                            CODTIPOPER = CAB.CODTIPOPER
                    )
                    AND TOP.ATUALEST <> 'N'
                    AND TOP.GOLSINAL = -1
            ) > 0
            LEFT JOIN TGFPRO PRO ON PRO.MARCA = MET.MARCA
            LEFT JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            AND PRO.CODPROD = ITE.CODPROD
            LEFT JOIN AD_VGFMARCA VGMAR ON PRO.MARCA = VGMAR.MARCA
            LEFT JOIN AD_GRUMARCAITE MARITE ON VGMAR.SEQ = MARITE.CODMARCA
            LEFT JOIN AD_GRUMARCACAB MARCAB ON MARITE.CODGRU = MARCAB.CODGRU
        WHERE
            MET.CODMETA = :P_CODMETA
            AND MET.DTREF BETWEEN :P_PERIODO.INI
            AND :P_PERIODO.FIN
            AND MET.CODVEND IN :P_CODVEND
            AND (
                MET.CODPARC = :P_CODPARC
                OR :P_CODPARC IS NULL
            )
            AND (
                PRO.MARCA IN (
                    SELECT
                        MARCA
                    FROM
                        TGFPRO
                    WHERE
                        CODPROD IN :P_MARCA
                )
            )
            AND (
                (
                    :P_NTEMMETA = 'S'
                    AND (
                        MET.QTDPREV <> 0
                        OR MET.QTDREAL <> 0
                    )
                )
                OR :P_NTEMMETA = 'N'
            )
            AND (
                PRO.CODGRUPOPROD = :P_GRUPOPROD
                OR :P_GRUPOPROD IS NULL
            )
            AND CAB.CODEMP IN :P_EMPRESA
            AND (
                CAB.CODCENCUS = :P_CR
                OR :P_CR IS NULL
            )
        GROUP BY
            MET.DTREF,
            MET.CODVEND,
            VEN.APELIDO,
            MET.CODPARC,
            PAR.RAZAOSOCIAL,
            MET.MARCA,
            MET.QTDPREV,
            MET.QTDREAL,
            NVL(PRC.VLRVENDALT, 0),
            PAR.CGC_CPF
    )