SELECT
CODVEND,
VENDEDOR,
MES,
ORDEM,
MES1,
SUM(QTDPREV1) AS QTDPREV1,
SUM(QTDREAL1) AS QTDREAL1,
SUM(VLRPREV1) AS VLRPREV1,
SUM(VLRREAL1) AS VLRREAL1,
SUM(QTDPREV2) AS QTDPREV2,
SUM(QTDREAL2) AS QTDREAL2,
SUM(VLRPREV2) AS VLRPREV2,
SUM(VLRREAL2) AS VLRREAL2

FROM
(


SELECT
(CASE 
    WHEN :P_AGRUP_COORDENADOR = 'S' THEN VEN3.CODGER
    ELSE B.CODVEND END) AS CODVEND,
  (CASE
    WHEN :P_AGRUP_COORDENADOR = 'S' THEN VEN3.APELIDO
    ELSE B.APELIDO END) AS VENDEDOR,
MES,
QTDPREV1,
QTDREAL1,
VLRPREV1,
VLRREAL1,
QTDPREV2,
QTDREAL2,
VLRPREV2,
VLRREAL2,	
ORDEM,
MES1
FROM
(


SELECT
CODVEND,
APELIDO,
MAX(MES) AS MES,
SUM(QTDPREV1) AS QTDPREV1,
SUM(QTDREAL1) AS QTDREAL1,
SUM(VLRPREV1) AS VLRPREV1,
SUM(VLRREAL1) AS VLRREAL1,
SUM(QTDPREV2) AS QTDPREV2,
SUM(QTDREAL2) AS QTDREAL2,
SUM(VLRPREV2) AS VLRPREV2,
SUM(VLRREAL2) AS VLRREAL2,

CASE 
WHEN MES = '07' THEN 1
WHEN MES = '08' THEN 2
WHEN MES = '09' THEN 3
WHEN MES = '10' THEN 4
WHEN MES = '11' THEN 5
WHEN MES = '12' THEN 6
WHEN MES = '01' THEN 7
WHEN MES = '02' THEN 8
WHEN MES = '03' THEN 9
WHEN MES = '04' THEN 10
WHEN MES = '05' THEN 11
WHEN MES = '06' THEN 12
ELSE 0 END AS ORDEM,
CASE 
WHEN MES = '07' THEN 'JUL'
WHEN MES = '08' THEN 'AGO'
WHEN MES = '09' THEN 'SET'
WHEN MES = '10' THEN 'OUT'
WHEN MES = '11' THEN 'NOV'
WHEN MES = '12' THEN 'DEZ'
WHEN MES = '01' THEN 'JAN'
WHEN MES = '02' THEN 'FEV'
WHEN MES = '03' THEN 'MAR'
WHEN MES = '04' THEN 'ABR'
WHEN MES = '05' THEN 'MAI'
WHEN MES = '06' THEN 'JUN'
ELSE '0' END AS MES1  


FROM
(


SELECT

CODVEND,
APELIDO,
CASE WHEN MES1 <> '0' THEN MES1 ELSE MES2 END AS MES,
SUM(QTDPREV1) AS QTDPREV1,
SUM(QTDREAL1) AS QTDREAL1,
SUM(VLRPREV1) AS VLRPREV1,
SUM(VLRREAL1) AS VLRREAL1,
SUM(QTDPREV2) AS QTDPREV2,
SUM(QTDREAL2) AS QTDREAL2,
SUM(VLRPREV2) AS VLRPREV2,
SUM(VLRREAL2) AS VLRREAL2

FROM
(

SELECT 
A.CODVEND,
APELIDO,
(CASE WHEN SAFRA1 = 'SAFRA1'THEN MES1 ELSE '0' END) AS MES1,
SUM(CASE WHEN SAFRA1 = 'SAFRA1'THEN QTDPREV ELSE 0 END) AS QTDPREV1,
SUM(CASE WHEN SAFRA1 = 'SAFRA1'THEN QTDREAL ELSE 0 END) AS QTDREAL1,
SUM(CASE WHEN SAFRA1 = 'SAFRA1'THEN (QTDPREV * PRECOLT) ELSE 0 END) AS VLRPREV1,
SUM(CASE WHEN SAFRA1 = 'SAFRA1'THEN VLRREAL ELSE 0 END) AS VLRREAL1,
'0' AS MES2,
0 AS QTDPREV2,
0 AS QTDREAL2,
0 AS VLRPREV2,
0 AS VLRREAL2

FROM
(

SELECT MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(MET.CODPARC,0) AS CODPARC, NVL(MET.MARCA,0) AS MARCA,
NVL(VGF.CODCENCUS,0) AS CODCENCUS, NVL(MET.QTDPREV,0) AS QTDPREV, SUM(NVL(VGF.QTD,0)) AS QTDREAL,
NVL(PRC.VLRVENDALT,0)AS PRECOLT, SUM(NVL(VGF.VLR,0)) AS VLRREAL,
MAX(CASE WHEN (MET.DTREF BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN) THEN 'SAFRA1' END) AS SAFRA1,
MAX(CASE WHEN (MET.DTREF BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN) THEN TO_CHAR(MET.DTREF,'MM') END) AS MES1


FROM TGFMET MET
LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))

WHERE 
MET.CODMETA = :P_CODMETA
AND MET.DTREF BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND ((:P_NTEMMETA = 'S' AND (MET.QTDPREV <> 0 OR MET.QTDREAL <> 0)) OR :P_NTEMMETA = 'N')

AND (VGF.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)

GROUP BY MET.DTREF,NVL(MET.CODVEND,0),NVL(MET.CODPARC,0),
NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0),NVL(PRC.VLRVENDALT,0)


) A
INNER JOIN TGFVEN VEN ON A.CODVEND = VEN.CODVEND
INNER JOIN TGFPAR PAR ON A.CODPARC = PAR.CODPARC
WHERE
(VEN.CODGER IN :P_CODGER)
AND (PAR.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
AND (A.MARCA IN (SELECT MARCA FROM TGFPRO WHERE CODPROD IN :P_MARCA))
AND (A.CODCENCUS = :P_CR OR :P_CR IS NULL)
AND
(
VEN.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) ---CONSULTA VENDEDOR
OR VEN.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO) ---CONSULTA GERENTE
OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' ---CONSULTA MASTER
)

GROUP BY A.CODVEND, APELIDO, (CASE WHEN SAFRA1 = 'SAFRA1'THEN MES1 ELSE '0' END)

UNION ALL

SELECT 
A.CODVEND,
APELIDO,
'0' AS MES1,
0 AS QTDPREV1,
0 AS QTDREAL1,
0 AS VLRPREV1,
0 AS VLRREAL1,

(CASE WHEN SAFRA2 = 'SAFRA2'THEN MES2 ELSE '0' END) MES2,
SUM(CASE WHEN SAFRA2 = 'SAFRA2'THEN QTDPREV ELSE 0 END) AS QTDPREV2,
SUM(CASE WHEN SAFRA2 = 'SAFRA2'THEN QTDREAL ELSE 0 END) AS QTDREAL2,
SUM(CASE WHEN SAFRA2 = 'SAFRA2'THEN (QTDPREV * PRECOLT) ELSE 0 END) AS VLRPREV2,
SUM(CASE WHEN SAFRA2 = 'SAFRA2'THEN VLRREAL ELSE 0 END) AS VLRREAL2



FROM
(

SELECT MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(MET.CODPARC,0) AS CODPARC, NVL(MET.MARCA,0) AS MARCA,
NVL(VGF.CODCENCUS,0) AS CODCENCUS, NVL(MET.QTDPREV,0) AS QTDPREV, SUM(NVL(VGF.QTD,0)) AS QTDREAL,
NVL(PRC.VLRVENDALT,0)AS PRECOLT, SUM(NVL(VGF.VLR,0)) AS VLRREAL,

MAX(CASE WHEN (MET.DTREF BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN) THEN 'SAFRA2' END) AS SAFRA2,
MAX(CASE WHEN (MET.DTREF BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN) THEN TO_CHAR(MET.DTREF,'MM') END) AS MES2
FROM TGFMET MET
LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))

WHERE 
MET.CODMETA = :P_CODMETA
AND (
  (:P_PERIODO1.INI IS NULL AND :P_PERIODO1.FIN IS NULL) OR (MET.DTREF BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN)
)
AND ((:P_NTEMMETA = 'S' AND (MET.QTDPREV <> 0 OR MET.QTDREAL <> 0)) OR :P_NTEMMETA = 'N')
AND (VGF.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)

GROUP BY MET.DTREF,NVL(MET.CODVEND,0),NVL(MET.CODPARC,0),
NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0),NVL(PRC.VLRVENDALT,0)

)A
INNER JOIN TGFVEN VEN ON A.CODVEND = VEN.CODVEND
INNER JOIN TGFPAR PAR ON A.CODPARC = PAR.CODPARC
WHERE
(VEN.CODGER IN :P_CODGER)
AND (PAR.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
AND (A.MARCA IN (SELECT MARCA FROM TGFPRO WHERE CODPROD IN :P_MARCA))
AND (A.CODCENCUS = :P_CR OR :P_CR IS NULL)
AND
(
VEN.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) ---CONSULTA VENDEDOR
OR VEN.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO) ---CONSULTA GERENTE
OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' ---CONSULTA MASTER
)
GROUP BY A.CODVEND, APELIDO,(CASE WHEN SAFRA2 = 'SAFRA2'THEN MES2 ELSE '0' END)

)
GROUP BY
CODVEND,
APELIDO,
MES1,
MES2
)

GROUP BY
CODVEND,
APELIDO,
MES
)B
INNER JOIN TGFVEN VEN3 ON B.CODVEND = VEN3.CODVEND
)
WHERE (CODVEND = :A_CODVEND)
GROUP BY CODVEND,VENDEDOR,MES,ORDEM,MES1
ORDER BY ORDEM