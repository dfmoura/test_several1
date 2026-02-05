SELECT 
    R.CODPARC,
    R.PARCEIRO,
    R.MARCA,
    R.QTDPREV,
    R.QTDREAL,
    R.PERC,
    R.VLR_PREV,
    R.VLR_REAL,
    R.PERC_VLR,
    R.TICKET_MEDIO,
    R.TICKET_MEDIO_META,
    R.VAR_PERC_TICKET_MEDIO,
    A.CODUSU,
    U.NOMEUSU,
    SYSDATE AS DATA_ATUAL
FROM (


SELECT CODPARC, PARCEIRO, MARCA
            , SUM(QTDPREV) AS QTDPREV
            , SUM(QTDREAL) AS QTDREAL
            , CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
            , SUM(VLR_PREV)  AS VLR_PREV, SUM(VLR_REAL)  AS VLR_REAL
            , CASE WHEN SUM(VLR_PREV) = 0 THEN 0 ELSE NVL(SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0), 0) END AS PERC_VLR
            , NVL(SUM(VLR_REAL)/NULLIF(SUM(QTDREAL),0),0) TICKET_MEDIO
            , NVL(SUM(VLR_PREV)/NULLIF(SUM(QTDPREV),0),0) TICKET_MEDIO_META
            , CASE 
                WHEN NVL(SUM(VLR_PREV)/NULLIF(SUM(QTDPREV),0),0) = 0 THEN 0
                ELSE (
                  (NVL(SUM(VLR_REAL)/NULLIF(SUM(QTDREAL),0),0) - NVL(SUM(VLR_PREV)/NULLIF(SUM(QTDPREV),0),0))
                  / NVL(SUM(VLR_PREV)/NULLIF(SUM(QTDPREV),0),0)
                ) * 100
              END AS VAR_PERC_TICKET_MEDIO
          FROM (
            SELECT
              DTREF,
              CODMETA,
              CODVEND,
              APELIDO,
              CODGER,
              CODPARC,
              PARCEIRO,
              MARCA,
              CODGRUPOPROD,
              SUM(QTDPREV) AS QTDPREV,
              SUM(QTDREAL) AS QTDREAL,
              SUM(NVL(VLR_PREV,0)) AS VLR_PREV,
              SUM(NVL(VLR_REAL, 0)) AS VLR_REAL
            FROM (
              SELECT
                X.DTREF,
                X.CODMETA,
                VEN1.CODVEND,
                VEN1.APELIDO,
                VEN1.CODGER,
                X.CODPARC,
                X.PARCEIRO,
                X.MARCA,
                X.CODGRUPOPROD,
                SUM(QTDPREV) AS QTDPREV,
                SUM(QTDREAL) AS QTDREAL,
                SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                SUM(NVL(VLRREAL, 0)) AS VLR_REAL
              FROM (
                SELECT
                  MET.CODMETA,
                  MET.DTREF, 
                  VEN.CODVEND,
                  VEN.APELIDO,
                  VEN.AD_VENDEDOR_MATRIZ,
                  NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                  NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                  NVL(MET.MARCA,0) AS MARCA,
                  NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                  NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                  NVL(MET.QTDPREV,0) AS QTDPREV, 
                  SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                  NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                  SUM(NVL(VGF.VLR,0)) AS VLRREAL
                FROM TGFMET MET
                LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                LEFT JOIN VGF_VENDAS_SATIS VGF 
                  ON MET.DTREF = TRUNC(VGF.DTMOV,'MM')
                  AND MET.CODVEND = VGF.CODVEND
                  AND MET.CODPARC = VGF.CODPARC
                  AND MET.MARCA = VGF.MARCA
                  AND VGF.BONIFICACAO = 'N'
                  ${realDateFilter}
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
                LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                WHERE (${selectedCrs && selectedCrs.length > 0 ? `VGF.CODCENCUS IN (${selectedCrs.join(',')})` : '1=1'})
                GROUP BY 
                  MET.CODMETA,
                  MET.DTREF,
                  VEN.CODVEND,
                  VEN.APELIDO,
                  VEN.AD_VENDEDOR_MATRIZ,
                  NVL(VEN.CODGER,0),
                  NVL(MET.CODPARC,0),
                  NVL(PAR.RAZAOSOCIAL,0),
                  NVL(MET.MARCA,0),
                  NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD),
                  NVL(VGF.CODCENCUS,0),
                  NVL(MET.QTDPREV,0),
                  NVL(PRC.VLRVENDALT,0)
              ) X
              LEFT JOIN TGFVEN VEN1 
                ON CASE 
                     WHEN '${vendedorMatrizFlag}' = 'S' 
                     THEN NVL(X.AD_VENDEDOR_MATRIZ,X.CODVEND) 
                     ELSE X.CODVEND 
                   END = VEN1.CODVEND
              WHERE 
                X.CODMETA = 4
                ${prevDateFilter}
                AND (X.QTDPREV <> 0 OR X.QTDREAL <> 0 OR X.VLRREAL <> 0)
                ${grupoFilter}
                ${coordFilter}
                ${marcaFilter}
                ${crFilter}
                AND (
                  X.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO)
                  OR X.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                  OR X.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                  OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S'
                )
              GROUP BY
                X.DTREF,
                X.CODMETA,
                VEN1.CODVEND,
                VEN1.APELIDO,
                VEN1.CODGER,
                X.CODPARC,
                X.PARCEIRO,
                X.MARCA,
                X.CODGRUPOPROD
            )
            GROUP BY
              DTREF,
              CODMETA,
              CODVEND,
              APELIDO,
              CODGER,
              CODPARC,
              PARCEIRO,
              MARCA,
              CODGRUPOPROD
          )
          WHERE (CODPARC = ${codParc})
            AND (CODVEND = ${codVend})
          GROUP BY CODPARC, PARCEIRO, MARCA
) R

CROSS JOIN (
    SELECT STP_GET_CODUSULOGADO AS CODUSU
    FROM DUAL
) A
INNER JOIN TSIUSU U 
    ON A.CODUSU = U.CODUSU

ORDER BY 7 DESC