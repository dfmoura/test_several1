SELECT * FROM
(SELECT
CODPARC
, RAZAOSOCIAL
, SUM(QTDPREV) AS QTDPREV
, SUM(QTDREAL) AS QTDREAL
, SUM(QTDPREV * PRECOLT)  AS VLR_PREV
, SUM(NVL(VLRREAL, 0)) AS VLR_REAL
, ROW_NUMBER() OVER (ORDER BY SUM(QTDREAL) DESC) AS RN
FROM
(
SELECT
MET.DTREF
, MET.CODVEND
, VEN.APELIDO
, MET.CODPARC
, PAR.RAZAOSOCIAL
, PAR.CGC_CPF
, MET.MARCA
, MET.QTDPREV
, MET.QTDREAL
, NVL(PRC.VLRVENDALT,0) AS PRECOLT,  SUM(CASE WHEN CAB.TIPMOV='D' THEN (ITE.VLRTOT-ITE.VLRDESC-ITE.VLRREPRED)*-1 ELSE (ITE.VLRTOT-ITE.VLRDESC-ITE.VLRREPRED) END)  AS VLRREAL
FROM TGMMET MET
  LEFT JOIN TGFVEN VEN ON (MET.CODVEND = VEN.CODVEND)
  LEFT JOIN TGFPAR PAR ON (MET.CODPARC = PAR.CODPARC)
  LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA=MET.CODMETA AND PRC.DTREF='01/07/2023')
  LEFT JOIN TGFCAB CAB ON CAB.CODVEND = VEN.CODVEND AND TRUNC(DTMOV,'MM') = MET.DTREF AND CAB.TIPMOV IN ('V','D') AND CAB.STATUSNOTA='L' AND (CAB.STATUSNFE = 'A' OR CAB.STATUSNFE = 'T' OR CAB.STATUSNFE IS NULL) AND CAB.CODPARC = MET.CODPARC AND (SELECT COUNT(TOP.CODTIPOPER) FROM TGFTOP TOP WHERE TOP.CODTIPOPER = CAB.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER) AND TOP.ATUALEST <> 'N' AND TOP.GOLSINAL = -1 ) > 0
  LEFT JOIN TGFPRO PRO ON PRO.MARCA = MET.MARCA
  LEFT JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA AND PRO.CODPROD = ITE.CODPROD
  LEFT JOIN AD_VGFMARCA VGMAR ON PRO.MARCA = VGMAR.MARCA
  LEFT JOIN AD_GRUMARCAITE MARITE ON VGMAR.SEQ = MARITE.CODMARCA
  LEFT JOIN AD_GRUMARCACAB MARCAB ON MARITE.CODGRU = MARCAB.CODGRU
WHERE
  MET.CODMETA = :P_CODMETA
  AND MET.DTREF BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
  AND (MET.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
  AND (PRO.MARCA IN (SELECT MARCA FROM TGFPRO WHERE CODPROD IN :P_MARCA))
  AND ((:P_NTEMMETA='S' AND (MET.QTDPREV <> 0 OR MET.QTDREAL <> 0)) OR :P_NTEMMETA='N')
  AND (PRO.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)
  AND CAB.CODEMP IN :P_EMPRESA
  AND (CAB.CODCENCUS = :P_CR OR :P_CR IS NULL)
GROUP BY MET.DTREF, MET.CODVEND, VEN.APELIDO, MET.CODPARC, PAR.RAZAOSOCIAL, MET.MARCA, MET.QTDPREV, MET.QTDREAL,  NVL(PRC.VLRVENDALT,0),PAR.CGC_CPF)

WHERE (QTDPREV <> 0 OR QTDREAL <> 0)
AND CODVEND = :A_CODVEND 
GROUP BY
CODPARC, RAZAOSOCIAL)
WHERE RN <= 3


UNION ALL

SELECT

9999 AS CODPARC
, 'OUTROS' AS RAZAOSOCIAL
, SUM(QTDPREV) AS QTDPREV
, SUM(QTDREAL) AS QTDREAL
, SUM(VLR_PREV) AS VLR_PREV
, SUM(VLR_REAL) AS VLR_REAL
, 4 AS RN
FROM

(

SELECT * FROM
(SELECT
CODPARC
, RAZAOSOCIAL
, SUM(QTDPREV) AS QTDPREV
, SUM(QTDREAL) AS QTDREAL
, SUM(QTDPREV * PRECOLT)  AS VLR_PREV
, SUM(NVL(VLRREAL, 0)) AS VLR_REAL
, ROW_NUMBER() OVER (ORDER BY SUM(QTDREAL) DESC) AS RN
FROM
(
SELECT
MET.DTREF
, MET.CODVEND
, VEN.APELIDO
, MET.CODPARC
, PAR.RAZAOSOCIAL
, PAR.CGC_CPF
, MET.MARCA
, MET.QTDPREV
, MET.QTDREAL
, NVL(PRC.VLRVENDALT,0) AS PRECOLT,  SUM(CASE WHEN CAB.TIPMOV='D' THEN (ITE.VLRTOT-ITE.VLRDESC-ITE.VLRREPRED)*-1 ELSE (ITE.VLRTOT-ITE.VLRDESC-ITE.VLRREPRED) END)  AS VLRREAL
FROM TGMMET MET
  LEFT JOIN TGFVEN VEN ON (MET.CODVEND = VEN.CODVEND)
  LEFT JOIN TGFPAR PAR ON (MET.CODPARC = PAR.CODPARC)
  LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA=MET.CODMETA AND PRC.DTREF='01/07/2023')
  LEFT JOIN TGFCAB CAB ON CAB.CODVEND = VEN.CODVEND AND TRUNC(DTMOV,'MM') = MET.DTREF AND CAB.TIPMOV IN ('V','D') AND CAB.STATUSNOTA='L' AND (CAB.STATUSNFE = 'A' OR CAB.STATUSNFE = 'T' OR CAB.STATUSNFE IS NULL) AND CAB.CODPARC = MET.CODPARC AND (SELECT COUNT(TOP.CODTIPOPER) FROM TGFTOP TOP WHERE TOP.CODTIPOPER = CAB.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER) AND TOP.ATUALEST <> 'N' AND TOP.GOLSINAL = -1 ) > 0
  LEFT JOIN TGFPRO PRO ON PRO.MARCA = MET.MARCA
  LEFT JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA AND PRO.CODPROD = ITE.CODPROD
  LEFT JOIN AD_VGFMARCA VGMAR ON PRO.MARCA = VGMAR.MARCA
  LEFT JOIN AD_GRUMARCAITE MARITE ON VGMAR.SEQ = MARITE.CODMARCA
  LEFT JOIN AD_GRUMARCACAB MARCAB ON MARITE.CODGRU = MARCAB.CODGRU
WHERE
  MET.CODMETA = :P_CODMETA
  AND MET.DTREF BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
  AND (MET.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
  AND (PRO.MARCA IN (SELECT MARCA FROM TGFPRO WHERE CODPROD IN :P_MARCA))
  AND ((:P_NTEMMETA='S' AND (MET.QTDPREV <> 0 OR MET.QTDREAL <> 0)) OR :P_NTEMMETA='N')
  AND (PRO.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)
  AND (MARCAB.CODGRU = :P_GRUPOMARCA OR :P_GRUPOMARCA IS NULL)
  AND CAB.CODEMP IN :P_EMPRESA
  AND (CAB.CODCENCUS = :P_CR OR :P_CR IS NULL)
GROUP BY MET.DTREF, MET.CODVEND, VEN.APELIDO, MET.CODPARC, PAR.RAZAOSOCIAL, MET.MARCA, MET.QTDPREV, MET.QTDREAL,  NVL(PRC.VLRVENDALT,0),PAR.CGC_CPF)

WHERE (QTDPREV <> 0 OR QTDREAL <> 0)
AND CODVEND = :A_CODVEND 
GROUP BY
CODPARC, RAZAOSOCIAL)
WHERE RN > 3)