            SELECT
	      CODVEND,APELIDO,
              SUM(QTDREAL) AS QTD_REAL,
              SUM(QTDPREV) AS QTD_PREV,
              SUM(VLRREAL) AS VLR_REAL,
              SUM(VLRPREV) AS VLR_PREV
            FROM (
              SELECT 
                MET.DTREF,
                NVL(VGF.CODVEND,0) CODVEND,
                NVL(VGF.APELIDO,'SEM VENDEDOR') APELIDO,
                SUM(NVL(VGF.QTD, 0)) AS QTDREAL,
                NVL(MET.QTDPREV, 0) AS QTDPREV,
                SUM(NVL(VGF.VLR, 0)) AS VLRREAL,
                NVL(MET.QTDPREV, 0) * NVL(PRC.VLRVENDALT, 0) AS VLRPREV
              FROM TGFMET MET
              LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
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
              WHERE MET.CODMETA = 4 
                AND MET.DTREF BETWEEN '${dtInicio}' AND '${dtFim}'

                ${parceirosIn}
                ${vendedoresIn}
                ${marcasIn}
                ${gruposIn}
                ${crsIn}

              GROUP BY MET.DTREF,NVL(VGF.CODVEND,0),NVL(VGF.APELIDO,'SEM VENDEDOR'), NVL(MET.QTDPREV, 0), NVL(PRC.VLRVENDALT, 0)
            )
            GROUP BY 
              CODVEND,APELIDO
            ORDER BY 2,1