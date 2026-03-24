WITH Q AS (
SELECT
    MARCA,
    SUM(QTDPREV) AS QTDPREV,
    SUM(QTDREAL) AS QTDREAL,
    CASE 
        WHEN SUM(QTDPREV) = 0 THEN 0 
        ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) 
    END AS PERC,
    SUM(VLR_PREV) AS VLR_PREV,
    SUM(VLR_REAL) AS VLR_REAL,
    CASE 
        WHEN SUM(VLR_PREV) = 0 THEN 0 
        ELSE NVL(SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0), 0) 
    END AS PERC_VLR,
    NVL(SUM(VLR_REAL) / NULLIF(SUM(QTDREAL), 0), 0) AS TICKET_MEDIO,
    NVL(SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0), 0) AS TICKET_MEDIO_META,
    CASE
        WHEN NVL(SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0), 0) = 0 THEN 0
        ELSE (
            (
                NVL(SUM(VLR_REAL) / NULLIF(SUM(QTDREAL), 0), 0)
                - NVL(SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0), 0)
            )
            / NVL(SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0), 0)
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
        CLASCOMERCIAL,
        NOMECID,
        UF,
        MARCA,
        CODGRUPOPROD,
        SUM(QTDPREV) AS QTDPREV,
        SUM(QTDREAL) AS QTDREAL,
        SUM(NVL(VLR_PREV, 0)) AS VLR_PREV,
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
            X.CLASCOMERCIAL,
            X.MARCA,
            X.CODGRUPOPROD,
            SUM(QTDPREV) AS QTDPREV,
            SUM(QTDREAL) AS QTDREAL,
            SUM(QTDPREV * PRECOLT) AS VLR_PREV,
            SUM(NVL(VLRREAL, 0)) AS VLR_REAL,
            NOMECID,
            UF
        FROM (
            SELECT
                MET.CODMETA,
                MET.DTREF,
                VEN.CODVEND,
                VEN.APELIDO,
                VEN.AD_VENDEDOR_MATRIZ,
                NVL(VEN.CODGER, 0) AS CODGER,
                NVL(MET.CODPARC, 0) AS CODPARC,
                NVL(PAR.RAZAOSOCIAL, 0) AS PARCEIRO,
                F_DESCROPC('TGFPAR','AD_CLASCOMERCIAL', PAR.AD_CLASCOMERCIAL) AS CLASCOMERCIAL,
                NVL(MET.MARCA, 0) AS MARCA,
                NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                NVL(VGF.CODCENCUS, 0) AS CODCENCUS,
                NVL(MET.QTDPREV, 0) AS QTDPREV,
                SUM(NVL(VGF.QTD, 0)) AS QTDREAL,
                NVL(PRC.VLRVENDALT, 0) AS PRECOLT,
                SUM(NVL(VGF.VLR, 0)) AS VLRREAL,
                CID.NOMECID,
                EST.UF
            FROM TGFMET MET
            LEFT JOIN (
                SELECT DESCRICAO, AD_GRUPOPROD, CODIGO
                FROM (
                    SELECT 
                        DESCRICAO,
                        AD_GRUPOPROD,
                        CODIGO,
                        ROW_NUMBER() OVER (PARTITION BY DESCRICAO ORDER BY ROWID) AS RN
                    FROM TGFMAR
                )
                WHERE RN = 1
            ) MAR 
                ON MAR.DESCRICAO = MET.MARCA

            LEFT JOIN VGF_VENDAS_SATIS VGF 
                ON MET.DTREF = TRUNC(VGF.DTMOV, 'MM')
                AND MET.CODVEND = VGF.CODVEND
                AND MET.CODPARC = VGF.CODPARC
                AND MET.MARCA = VGF.MARCA
                AND VGF.BONIFICACAO = 'N'
                AND TRUNC(VGF.DTMOV) BETWEEN CAST('01/07/2025' AS DATE) 
                                         AND CAST('31/12/2025' AS DATE)
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
            LEFT JOIN TSICID CID ON PAR.CODCID = CID.CODCID
            LEFT JOIN TSIUFS EST ON CID.UF = EST.CODUF
            --WHERE (VGF.CODCENCUS = :P_CR OR :P_CR IS NULL)
            GROUP BY
                MET.CODMETA,
                MET.DTREF,
                VEN.CODVEND,
                VEN.APELIDO,
                VEN.AD_VENDEDOR_MATRIZ,
                NVL(VEN.CODGER, 0),
                NVL(MET.CODPARC, 0),
                NVL(PAR.RAZAOSOCIAL, 0),
                NVL(MET.MARCA, 0),
                NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD),
                NVL(VGF.CODCENCUS, 0),
                NVL(MET.QTDPREV, 0),
                NVL(PRC.VLRVENDALT, 0),
                F_DESCROPC('TGFPAR','AD_CLASCOMERCIAL', PAR.AD_CLASCOMERCIAL),
                CID.NOMECID,
                EST.UF
        ) X
        LEFT JOIN TGFVEN VEN1 
            ON CASE 
                WHEN /*:VENDEDOR_MATRIZ*/ 'N' = 'S' 
                    THEN NVL(X.AD_VENDEDOR_MATRIZ, X.CODVEND)
                ELSE X.CODVEND
            END = VEN1.CODVEND
        WHERE
            X.CODMETA = 4 --:P_CODMETA
            AND TRUNC(X.DTREF, 'MM') BETWEEN TRUNC(CAST('01/07/2025' AS DATE), 'MM')
                                        AND TRUNC(CAST('31/12/2025' AS DATE), 'MM')
/*
            AND (
                (:P_NTEMMETA = 'S' AND (X.QTDPREV <> 0 OR X.QTDREAL <> 0 OR X.VLRREAL <> 0))
                OR :P_NTEMMETA = 'N'
            )
            AND (X.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)
            AND (X.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
            AND (X.CODVEND IN :P_CODVEND)
            AND (X.CODGER IN :P_COORD)
            AND (X.MARCA IN :P_MARCA)
*/

            AND (
                X.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO)
                OR X.CODVEND IN (
                    SELECT VEN.CODVEND
                    FROM TGFVEN VEN, TSIUSU USU
                    WHERE USU.CODVEND = VEN.CODGER
                      AND USU.CODUSU = STP_GET_CODUSULOGADO
                )
                OR X.CODVEND IN (
                    SELECT VEN.CODVEND
                    FROM TGFVEN VEN, TSIUSU USU
                    WHERE USU.CODVEND = VEN.AD_COORDENADOR
                      AND USU.CODUSU = STP_GET_CODUSULOGADO
                )
                OR (
                    SELECT AD_GESTOR_META 
                    FROM TSIUSU 
                    WHERE CODUSU = STP_GET_CODUSULOGADO
                ) = 'S'
            )
        GROUP BY
            X.DTREF,
            X.CODMETA,
            VEN1.CODVEND,
            VEN1.APELIDO,
            VEN1.CODGER,
            X.CODPARC,
            X.PARCEIRO,
            X.CLASCOMERCIAL,
            X.MARCA,
            X.CODGRUPOPROD,
            NOMECID,
            UF
    )
    GROUP BY
        DTREF,
        CODMETA,
        CODVEND,
        APELIDO,
        CODGER,
        CODPARC,
        PARCEIRO,
        CLASCOMERCIAL,
        MARCA,
        NOMECID,
        UF,
        CODGRUPOPROD
)
GROUP BY
MARCA
),
BI AS (
    SELECT
        MAR.DESCRICAO AS MARCA,
        LISTAGG(TO_CHAR(DET.CLASSIFICACAO), ', ') WITHIN GROUP (ORDER BY DET.CLASSIFICACAO) AS CLASSIFICACAO,
        LISTAGG(F_DESCROPC('AD_DETCOMERCMARCA', 'ESTADO', DET.ESTADO), ', ') WITHIN GROUP (ORDER BY DET.ESTADO) AS ESTADO,
        LISTAGG(F_DESCROPC('AD_DETCOMERCMARCA', 'TIPO', DET.TIPO), ', ') WITHIN GROUP (ORDER BY DET.TIPO) AS TIPO,
        LISTAGG(F_DESCROPC('AD_DETCOMERCMARCA', 'APLICACAO', DET.APLICACAO), ', ') WITHIN GROUP (ORDER BY DET.APLICACAO) AS APLICACAO
    FROM TGFMAR MAR
    LEFT JOIN AD_DETCOMERCMARCA DET ON MAR.CODIGO = DET.CODMARCA
    GROUP BY
        MAR.DESCRICAO
)
SELECT
    Q.MARCA,
    Q.QTDPREV,
    Q.QTDREAL,
    Q.PERC,
    Q.VLR_PREV,
    Q.VLR_REAL,
    Q.PERC_VLR,
    Q.TICKET_MEDIO,
    Q.TICKET_MEDIO_META,
    Q.VAR_PERC_TICKET_MEDIO,
    BI.CLASSIFICACAO,
    BI.ESTADO,
    BI.TIPO,
    BI.APLICACAO
FROM Q
LEFT JOIN BI ON BI.MARCA = Q.MARCA
ORDER BY
    Q.PERC_VLR DESC