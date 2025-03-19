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