SELECT
    CODVEND,
    APELIDO,
    SUM(QTDPREV) AS QTDPREV,
    SUM(QTDREAL) AS QTDREAL,
    SUM(QTDPREV * PRECOLT) AS VLR_PREV,
    SUM(VLRREAL) AS VLRREAL,
    CASE
        WHEN SUM(QTDPREV) = 0 THEN 100
        ELSE SUM(QTDREAL) * 100 / SUM(QTDPREV)
    END AS PERC
FROM
    (
        SELECT
            MET.DTREF,
            MET.CODVEND,
            VEN.APELIDO,
            MET.CODPARC,
            PAR.RAZAOSOCIAL,
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
        WHERE
            MET.CODMETA = :P_CODMETA
            AND MET.DTREF >= :P_PERIODO.INI
            AND MET.DTREF <= :P_PERIODO.FIN
            AND (
                MET.CODVEND = :P_CODVEND
                OR :P_CODVEND IS NULL
            )
            AND (
                MET.CODPARC = :P_CODPARC
                OR :P_CODPARC IS NULL
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
        GROUP BY
            MET.DTREF,
            MET.CODVEND,
            VEN.APELIDO,
            MET.CODPARC,
            PAR.RAZAOSOCIAL,
            MET.MARCA,
            MET.QTDPREV,
            MET.QTDREAL,
            NVL(PRC.VLRVENDALT, 0)
    )
GROUP BY
    CODVEND,
    APELIDO
ORDER BY
    APELIDO ASC,
    "QTDREAL" DESC