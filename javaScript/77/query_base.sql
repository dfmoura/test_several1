SELECT LATITUDE,LONGETUDE,CIDADE,ESTADO,PAIS,SUM(QTDREAL)QTDREAL,SUM(QTDPREV)QTDPREV,SUM(VLRREAL)VLRREAL,SUM(VLRPREV)VLRPREV
             FROM(

            WITH NIVEL_BASE AS (
                SELECT 
                    NVL(MET.CODMETA, 0) AS CODMETA,
                    MET.DTREF AS DTREF,
                    NVL(MET.CODVEND, 0) AS CODVEND,
                    NVL(VEN.APELIDO, 'SEM_VENDEDOR') AS APELIDO,
                    NVL(VEN.CODGER, 0) AS CODGER,
                    NVL(MET.CODPARC, 0) AS CODPARC,
                    NVL(PAR.RAZAOSOCIAL, 'SEM_PARCEIRO') AS PARCEIRO,
                    NVL(MET.MARCA, 'SEM_MARCA') AS MARCA,
                    NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                    NVL(VGF.CODCENCUS, 0) AS CODCENCUS,
                    NVL(COO.LATITUDE, 0) AS LATITUDE,
                    NVL(COO.LONGETUDE, 0) AS LONGETUDE,
                    NVL(COO.MUNICIPALITY, 'SEM_CIDADE') AS CIDADE,
                    NVL(COO.ESTADO, 'SEM_ESTADO') AS ESTADO,
                    NVL(COO.PAIS, 'SEM_PAIS') AS PAIS,
                    NVL(MET.QTDPREV, 0) AS QTDPREV,
                    NVL(PRC.VLRVENDALT, 0) AS PRECOLT,
                    SUM(NVL(VGF.QTD, 0)) AS QTDREAL,
                    SUM(NVL(VGF.VLR, 0)) AS VLRREAL
                FROM TGFMET MET
                LEFT JOIN TGFMAR MAR 
                    ON MAR.DESCRICAO = MET.MARCA
                LEFT JOIN VGF_VENDAS_SATIS VGF 
                    ON MET.DTREF = TRUNC(VGF.DTMOV, 'MM')
                   AND MET.CODVEND = VGF.CODVEND
                   AND MET.CODPARC = VGF.CODPARC
                   AND MET.MARCA = VGF.MARCA
                   AND VGF.BONIFICACAO = 'N'
                LEFT JOIN AD_PRECOMARCA PRC 
                    ON MET.MARCA = PRC.MARCA
                   AND PRC.CODMETA = MET.CODMETA
                   AND PRC.DTREF = (
                        SELECT MAX(DTREF)
                        FROM AD_PRECOMARCA
                        WHERE CODMETA = MET.CODMETA
                          AND DTREF <= MET.DTREF
                          AND MARCA = MET.MARCA
                   )
                LEFT JOIN TGFPAR PAR 
                    ON MET.CODPARC = PAR.CODPARC
                LEFT JOIN TGFVEN VEN 
                    ON MET.CODVEND = VEN.CODVEND
                LEFT JOIN AD_LATLONGPARC COO 
                    ON MET.CODPARC = COO.CODPARC
                WHERE MET.CODMETA = 4 AND MET.DTREF BETWEEN '01/10/2025' AND '31/10/2025'
                GROUP BY 
                    NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD),
                    NVL(MET.CODMETA, 0),
                    MET.DTREF,
                    NVL(MET.CODVEND, 0),
                    NVL(VEN.APELIDO, 'SEM_VENDEDOR'),
                    NVL(VEN.CODGER, 0),
                    NVL(MET.CODPARC, 0),
                    NVL(PAR.RAZAOSOCIAL, 'SEM_PARCEIRO'),
                    NVL(MET.MARCA, 'SEM_MARCA'),
                    NVL(VGF.CODCENCUS, 0),
                    NVL(COO.LATITUDE, 0),
                    NVL(COO.LONGETUDE, 0),
                    NVL(COO.MUNICIPALITY, 'SEM_CIDADE'),
                    NVL(COO.ESTADO, 'SEM_ESTADO'),
                    NVL(COO.PAIS, 'SEM_PAIS'),
                    NVL(MET.QTDPREV, 0),
                    NVL(PRC.VLRVENDALT, 0)
            )
            SELECT 
                CODMETA,
                DTREF,
                CODVEND,
                APELIDO,
                CODGER,
                CODPARC,
                PARCEIRO,
                MARCA,
                CODGRUPOPROD,
                CODCENCUS,
                LATITUDE,
                LONGETUDE,
                CIDADE,
                ESTADO,
                PAIS,
                QTDPREV,
                QTDREAL,

                VLRREAL,
                
                SUM(NVL(QTDPREV, 0) * NVL(PRECOLT, 0)) AS VLRPREV
            FROM NIVEL_BASE

            GROUP BY 
                CODMETA,
                DTREF,
                CODVEND,
                APELIDO,
                CODGER,
                CODPARC,
                PARCEIRO,
                MARCA,
                CODGRUPOPROD,
                CODCENCUS,
                LATITUDE,
                LONGETUDE,
                CIDADE,
                ESTADO,
                PAIS,
                QTDPREV,
                QTDREAL,
                VLRREAL
            ORDER BY 
                CODMETA, DTREF, CODVEND, CODPARC
            )GROUP BY LATITUDE,LONGETUDE,CIDADE,ESTADO,PAIS