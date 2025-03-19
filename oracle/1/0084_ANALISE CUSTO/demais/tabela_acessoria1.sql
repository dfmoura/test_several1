SELECT
    CODVEND, CODNAT, DESCRNAT,
    SUM(VLRDESP) VLRDESP,
    SUM(CASE WHEN VLRREAL = 0 THEN 0 ELSE VLRDESP / NULLIF(VLRREAL, 0) * -1 * 100 END) AS PERC_VLR
FROM (
    SELECT
        CASE WHEN :VENDEDOR_MATRIZ = 'S' THEN NVL(V.AD_VENDEDOR_MATRIZ, V.CODVEND) ELSE V.CODVEND END CODVEND,
        V.CODNAT,
        V.DESCRNAT,
        SUM(V.VLRDESP) VLRDESP,
        SUM(V.VLRREAL) VLRREAL
    FROM (
        WITH CUS4 AS (
            SELECT
                CODNAT, DESCRNAT, AD_VENDEDOR_RESP, SUM(VLRDESP) AS VLRDESP
            FROM (
                    SELECT
                        NVL(DHBAIXA, DTENTSAI) AS DATA,
                        AD_VENDEDOR_RESP,
                        CODCENCUS,
                        DESCRCENCUS,
                        GRAU,
                        ANALITICO,
                        AD_APELIDO,
                        CODNAT,
                        DESCRNAT,
                        VLRDESDOB_REC,
                        VLRDESDOB_DESP,
                        VLRDESDOB,
                        VLRJURO,
                        VLRMULTA,
                        VLRDESC,
                        VLRBAIXA_REC,
                        VLRBAIXA_DESP,
                        VLRBAIXA,
                        VLRREC,
                        VLRDESP
                    FROM (
                        SELECT 
                            X.DTENTSAI,
                            X.DHBAIXA,
                            NVL(CUS1.AD_VENDEDOR_RESP, 0) AS AD_VENDEDOR_RESP,
                            CUS1.CODCENCUS,
                            CASE 
                                WHEN CUS1.GRAU IN (2, 3, 4, 5) THEN CUS1.GRAU || LPAD('_', CUS1.GRAU - 1, '_') || CUS1.DESCRCENCUS
                                ELSE CUS1.GRAU || '_' || CUS1.DESCRCENCUS 
                            END AS DESCRCENCUS,
                            CUS1.GRAU,
                            CUS1.ANALITICO,
                            CUS1.AD_APELIDO,
                            X.CODNAT,
                            X.DESCRNAT,
                            NVL(SUM(CASE WHEN X.RECDESP = 1 THEN X.VLRDESDOB ELSE 0 END), 0) AS VLRDESDOB_REC,
                            NVL(SUM(CASE WHEN X.RECDESP = -1 THEN X.VLRDESDOB ELSE 0 END), 0) AS VLRDESDOB_DESP,
                            NVL(SUM(X.VLRDESDOB), 0) AS VLRDESDOB,
                            NVL(SUM(X.VLRJURO), 0) AS VLRJURO,
                            NVL(SUM(X.VLRMULTA), 0) AS VLRMULTA,
                            NVL(SUM(X.VLRDESC), 0) AS VLRDESC,
                            NVL(SUM(CASE WHEN X.RECDESP = 1 THEN X.VLRBAIXA ELSE 0 END), 0) AS VLRBAIXA_REC,
                            NVL(SUM(CASE WHEN X.RECDESP = -1 THEN X.VLRBAIXA ELSE 0 END), 0) AS VLRBAIXA_DESP,
                            NVL(SUM(X.VLRBAIXA), 0) AS VLRBAIXA,
                            NVL(SUM(CASE 
                                WHEN X.CODNAT = 1010000 AND X.RECDESP = 1 THEN X.VLRDESDOB 
                                WHEN X.CODNAT <> 1010000 AND X.RECDESP = 1 THEN X.VLRBAIXA 
                                ELSE 0 END), 0) AS VLRREC,
                            NVL(SUM(CASE 
                                WHEN X.CODNAT = 2020202 AND X.RECDESP IN (-1, 0) THEN X.VLRDESDOB 
                                WHEN X.CODNAT <> 2020202 AND X.RECDESP = -1 THEN X.VLRBAIXA 
                                ELSE 0 END), 0) AS VLRDESP
                        FROM TSICUS CUS1
                        LEFT JOIN VGF_RESULTADO2_SATIS X ON X.CODCENCUS = CUS1.CODCENCUS
                        INNER JOIN TGFNAT NAT ON X.CODNAT = NAT.CODNAT
                        WHERE (
                            (X.CODCENCUS NOT LIKE '6%' AND X.RECDESP <> 1 AND X.CODNAT = 2020202 AND X.PROVISAO = 'S' AND (X.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN))
                            OR
                            (X.CODCENCUS LIKE '6%' AND X.RECDESP <> 1 AND X.CODNAT = 2020202 AND X.PROVISAO = 'N' AND (X.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN))
                            OR
                            (X.RECDESP NOT IN (1, 0) AND X.CODNAT NOT IN (2020202, 1010000) AND PROVISAO = 'N' 
                            AND (X.DHBAIXA BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN))
                        )
                        AND X.CODNAT NOT IN (1010000, 1020000, 6010100, 6010200)
                        AND (X.CODNAT IN :P_NATUREZA)
                        AND X.CODCENCUS LIKE '9%'
                        GROUP BY
                            X.DTENTSAI,
                            X.DHBAIXA,
                            NVL(CUS1.AD_VENDEDOR_RESP, 0),
                            CUS1.CODCENCUS,
                            CUS1.DESCRCENCUS,
                            CUS1.GRAU,
                            CUS1.ANALITICO,
                            CUS1.AD_APELIDO,
                            X.CODNAT,
                            X.DESCRNAT
                    )
                    WHERE 
                    (
                        (:P_DTENTSAI = 2 AND DTENTSAI BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
                        OR
                        (:P_DTENTSAI = 1 AND DHBAIXA BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
                    )
            )
            GROUP BY AD_VENDEDOR_RESP, CODNAT, DESCRNAT
        )
        SELECT 
            A.CODVEND,
            AD_VENDEDOR_MATRIZ,
            APELIDO,
            CODNAT,
            DESCRNAT,
            SUM(QTDPREV) AS QTDPREV,
            SUM(QTDREAL) AS QTDREAL,
            CASE WHEN SUM(QTDPREV) = 0 THEN 100 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC,
            SUM(QTDPREV * PRECOLT) AS VLR_PREV,
            SUM(VLRREAL) AS VLRREAL,
            CASE WHEN SUM(QTDPREV * PRECOLT) = 0 THEN 100 ELSE NVL(SUM(VLRREAL) * 100 / NULLIF(SUM(QTDPREV * PRECOLT), 0), 0) END AS PERC_VLR,
            NVL(CUS4.VLRDESP, 0) AS VLRDESP
        FROM (
            SELECT MET.DTREF, MET.CODVEND, MET.CODPARC, MET.MARCA, NVL(VGF.CODCENCUS, 0) AS CODCENCUS, NVL(MET.QTDPREV, 0) AS QTDPREV, 
            SUM(NVL(VGF.QTD, 0)) AS QTDREAL, NVL(PRC.VLRVENDALT, 0) AS PRECOLT, SUM(NVL(VGF.VLR, 0)) AS VLRREAL
            FROM TGFMET MET
            LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV, 'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
            LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
            WHERE MET.CODMETA = :P_CODMETA
            AND MET.DTREF BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND ((:P_NTEMMETA = 'S' AND (MET.QTDPREV <> 0 OR MET.QTDREAL <> 0)) OR :P_NTEMMETA = 'N')
            AND (VGF.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)
            GROUP BY MET.DTREF, MET.CODVEND, MET.CODPARC, MET.MARCA, NVL(VGF.CODCENCUS, 0), NVL(MET.QTDPREV, 0), NVL(PRC.VLRVENDALT, 0)
        ) A
        INNER JOIN TGFVEN VEN ON A.CODVEND = VEN.CODVEND
        LEFT JOIN TGFPAR PAR ON A.CODPARC = PAR.CODPARC
        LEFT JOIN CUS4 ON A.CODVEND = CUS4.AD_VENDEDOR_RESP
        WHERE
            (VEN.CODVEND IN :P_CODVEND)
            AND (VEN.CODGER IN :P_COORD)
            AND (PAR.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
            AND (A.MARCA IN :P_MARCA)
        GROUP BY A.CODVEND, APELIDO, CODNAT, DESCRNAT, NVL(CUS4.VLRDESP, 0), AD_VENDEDOR_MATRIZ
    ) V
    WHERE 
    ((:VENDEDOR_MATRIZ = 'S' AND NVL(V.AD_VENDEDOR_MATRIZ, V.CODVEND) = :A_CODVEND)
    OR (:VENDEDOR_MATRIZ <> 'S' AND V.CODVEND = :A_CODVEND))
    AND
    (
        (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
    )
    GROUP BY V.CODVEND, V.CODNAT, V.DESCRNAT, V.AD_VENDEDOR_MATRIZ
)
GROUP BY CODVEND, CODNAT, DESCRNAT
ORDER BY 2