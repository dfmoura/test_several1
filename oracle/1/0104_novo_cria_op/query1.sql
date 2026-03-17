                SELECT 
                    IDIPROC,
                    IDIATV,
                    TO_CHAR(DHINICIO, 'DD/MM/YYYY') AS DTFAB,
                    CODPRODPA,
                    DESCRPROD,
                    CODREGMAPA,
                    AD_DENSIDADE,
                    AD_GARANTIAS,
                        DHINICIO,
                        DHFINAL,
                    NROLOTE,
                    QTDPRODUZIR
                FROM (  
                    SELECT 
                        TPRIATV.IDIPROC AS IDIPROC,
                        TPRIATV.IDIATV AS IDIATV,
                        TPRIATV.DHINICIO AS DHINICIO,
                        TPRIATV.DHFINAL AS DHFINAL,
                        TPRIPA.CODPRODPA,
                        TGFPRO.DESCRPROD,
                        CASE 
                            WHEN TGFPRO.CODREGMAPA IS NULL OR TGFPRO.CODREGMAPA = 'NA'
                            THEN 'NA'
                            ELSE TGFPRO.CODREGMAPA
                        END AS CODREGMAPA,
                        TGFPRO.AD_DENSIDADE,
                        TGFPRO.AD_GARANTIAS,
                        TPRIPA.NROLOTE,
                        TPRIPA.QTDPRODUZIR
                    FROM TPRIATV
                    LEFT JOIN TPRIPA ON TPRIATV.IDIPROC = TPRIPA.IDIPROC
                    LEFT JOIN TGFPRO ON TPRIPA.CODPRODPA = TGFPRO.CODPROD,
                    TPRATV R2_Atividade,
                    TPREFX R0_ElementoFluxo,
                    TPRIPROC R1_CabecalhoInstanciaProcesso
                    WHERE R2_Atividade.IDEFX = R0_ElementoFluxo.IDEFX
                      AND TPRIATV.IDIPROC = R1_CabecalhoInstanciaProcesso.IDIPROC
                      AND TPRIATV.IDEFX = R2_Atividade.IDEFX
                      AND R0_ElementoFluxo.TIPO IN (1101, 1109, 1110)
                      AND R1_CabecalhoInstanciaProcesso.STATUSPROC NOT IN ('C', 'S', 'AP', 'P', 'P2')
                      AND TPRIATV.DHINICIO IS NOT NULL
                      AND TPRIATV.DHFINAL IS NULL
                      AND NOT EXISTS (
                        SELECT 1 FROM TPREIATV EIATV
                        WHERE EIATV.IDIATV = TPRIATV.IDIATV
                          AND EIATV.TIPO = 'P'
                          AND EIATV.DHFINAL IS NULL
                      )
                )
                ORDER BY IDIPROC ASC
                