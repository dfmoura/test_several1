                SELECT
                    NVL(DHBAIXA, DTENTSAI) AS DATA,
                    AD_VENDEDOR_RESP,
                    CODCENCUS,
                    DESCRCENCUS,
                    GRAU,
                    ANALITICO,
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
                FROM TSICUS CUS1
                LEFT JOIN VGF_RESULTADO2_SATIS X ON X.CODCENCUS = CUS1.CODCENCUS
                INNER JOIN TGFNAT NAT ON X.CODNAT = NAT.CODNAT
                WHERE
                (X.CODCENCUS NOT LIKE '6%' AND X.RECDESP <> 1 AND X.CODNAT = 2020202 AND X.PROVISAO = 'S' AND (X.DTNEG BETWEEN '01/02/2025' AND '28/02/2025'))
                /*
                (
                    (X.CODCENCUS NOT LIKE '6%' AND X.RECDESP <> 1 AND X.CODNAT = 2020202 AND X.PROVISAO = 'S' AND (X.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN))
                    OR
                    (X.CODCENCUS LIKE '6%' AND X.RECDESP <> 1 AND X.CODNAT = 2020202 AND X.PROVISAO = 'N' AND (X.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN))
                    OR
                    (X.RECDESP NOT IN (1, 0) AND X.CODNAT NOT IN (2020202, 1010000) AND PROVISAO = 'N' AND (X.DHBAIXA BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN))
                )
                */
                AND X.CODNAT NOT IN (1010000, 1020000, 6010100, 6010200)
                --AND (X.CODNAT IN :P_NATUREZA)
                AND X.CODCENCUS LIKE '9%'
                GROUP BY 
                    CUS1.DHBAIXA, 
                    CUS1.DTENTSAI,
                    CUS1.AD_VENDEDOR_RESP,
                    CUS1.CODCENCUS,
                    CUS1.DESCRCENCUS,
                    CUS1.GRAU,
                    CUS1.ANALITICO,
                    NAT.CODNAT,
                    NAT.DESCRNAT