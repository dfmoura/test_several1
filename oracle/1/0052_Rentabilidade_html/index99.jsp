<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Financeiro</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #130455, #130455);
        }

        .container {
            background-color: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
            text-align: center;
            width: 1100px;
            height: 600px; /* Ajuste a altura conforme necessário */
        }

        .container h1 {
            color: #333;
            margin-bottom: 20px;
        }

        .data-item {
            margin: 15px 0;
            font-size: 18px;
            font-weight: bold;
        }

        .data-item span {
            display: block;
            font-size: 22px;
            margin-top: 8px;
            color: #2196f3;
        }
        
        #resultado {
            margin-top: 30px;
            padding: 15px;
            font-size: 20px;
            color: white;
            border-radius: 10px;
            font-weight: bold;
        }

        #resultado.positivo {
            background-color: #4CAF50;
        }

        #resultado.negativo {
            background-color: #f44336;
        }   
    </style>

<snk:load/>

</head>

<snk:query var="dias">  
    
SELECT

TO_CHAR(ROUND(VLRFAT, 2), 'FM999G999G999D00') AS VLRFAT,
TO_CHAR(ROUND(VLRFAT_MA, 2), 'FM999G999G999D00') AS VLRFAT_MA,
TO_CHAR(ROUND(VAR_VLRFAT, 2), 'FM999G999G999D00') AS VAR_VLRFAT,
TO_CHAR(ROUND(VLRDEVOL, 2), 'FM999G999G999D00') AS VLRDEVOL,
TO_CHAR(ROUND(VLRDEVOL_MA, 2), 'FM999G999G999D00') AS VLRDEVOL_MA,
TO_CHAR(ROUND(VAR_VLRDEVOL, 2), 'FM999G999G999D00') AS VAR_VLRDEVOL,
TO_CHAR(ROUND(VLRIMP, 2), 'FM999G999G999D00') AS VLRIMP,
TO_CHAR(ROUND(VLRIMP_MA, 2), 'FM999G999G999D00') AS VLRIMP_MA,
TO_CHAR(ROUND(VAR_VLRIMP, 2), 'FM999G999G999D00') AS VAR_VLRIMP,
TO_CHAR(ROUND(VLRCMV, 2), 'FM999G999G999D00') AS VLRCMV,
TO_CHAR(ROUND(VLRCMV_MA, 2), 'FM999G999G999D00') AS VLRCMV_MA,
TO_CHAR(ROUND(VAR_VLRCMV, 2), 'FM999G999G999D00') AS VAR_VLRCMV,
TO_CHAR(ROUND(HL, 2), 'FM999G999G999D00') AS HL,
TO_CHAR(ROUND(HL_MA, 2), 'FM999G999G999D00') AS HL_MA,
TO_CHAR(ROUND(VAR_HL, 2), 'FM999G999G999D00') AS VAR_HL,
TO_CHAR(ROUND(VLRDESC, 2), 'FM999G999G999D00') AS VLRDESC,
TO_CHAR(ROUND(VLRDESC_MA, 2), 'FM999G999G999D00') AS VLRDESC_MA,
TO_CHAR(ROUND(VAR_VLRDESC, 2), 'FM999G999G999D00') AS VAR_VLRDESC,
TO_CHAR(ROUND(VLRMCN, 2), 'FM999G999G999D00') AS VLRMCN,
TO_CHAR(ROUND(VLRMCN_MA, 2), 'FM999G999G999D00') AS VLRMCN_MA,
TO_CHAR(ROUND(VAR_VLRMCN, 2), 'FM999G999G999D00') AS VAR_VLRMCN,
TO_CHAR(ROUND(VLRMCD, 2), 'FM999G999G999D00') AS VLRMCD,
TO_CHAR(ROUND(VLRMCD_MA, 2), 'FM999G999G999D00') AS VLRMCD_MA,
TO_CHAR(ROUND(VAR_VLRMCD, 2), 'FM999G999G999D00') AS VAR_VLRMCD,
TO_CHAR(ROUND(VLRDO, 2), 'FM999G999G999D00') AS VLRDO,
TO_CHAR(ROUND(VLRDO_MA, 2), 'FM999G999G999D00') AS VLRDO_MA,
TO_CHAR(ROUND(VAR_VLRDO, 2), 'FM999G999G999D00') AS VAR_VLRDO,
TO_CHAR(ROUND(VLRINV, 2), 'FM999G999G999D00') AS VLRINV,
TO_CHAR(ROUND(VLRINV_MA, 2), 'FM999G999G999D00') AS VLRINV_MA,
TO_CHAR(ROUND(VAR_VLRINV, 2), 'FM999G999G999D00') AS VAR_VLRINV,
ROUND(VLRRES, 2) AS VLRRES,
TO_CHAR(ROUND(VLRRES_MA, 2), 'FM999G999G999D00') AS VLRRES_MA,
TO_CHAR(NVL(ROUND(((VLRRES - VLRRES_MA) / NULLIF(VLRRES_MA, 0)) * 100, 2), 0), 'FM999G999G999D00') AS VAR_VLRRES


FROM
(
WITH
DO AS ( /*DESPESA OPERACIONA*/
SELECT 1 AS COD, NVL(ROUND(SUM(VLRBAIXA),2),0) * -1 AS VLRDO
FROM VGF_RESULTADO_GM
WHERE AD_TIPOCUSTO NOT LIKE 'N' AND CODCENCUS NOT BETWEEN 2500000 AND 2599999  AND RECDESP = -1 
AND SUBSTR(codnat, 1, 1) <> '9'
AND DESCRNAT NOT LIKE '%RECEI%'
AND DESCRNAT NOT LIKE '%ADIAN%'
AND DHBAIXA IS NOT NULL AND CODEMP IN (:P_EMPRESA) AND CODNAT IN (:P_NATUREZA) AND CODCENCUS IN (:P_CR)
AND (DHBAIXA BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN) 
),
DO_MA AS ( /*DESPESA OPERACIONA - MES ANTERIOR*/
SELECT 1 AS COD, NVL(ROUND(SUM(VLRBAIXA),2),0) AS VLRDO_MA
FROM VGF_RESULTADO_GM
WHERE AD_TIPOCUSTO NOT LIKE 'N' AND CODCENCUS NOT BETWEEN 2500000 AND 2599999 AND RECDESP = -1 
AND SUBSTR(codnat, 1, 1) <> '9'
AND DESCRNAT NOT LIKE '%RECEI%'
AND DESCRNAT NOT LIKE '%ADIAN%'
AND DHBAIXA BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI)) 
AND CODEMP IN (:P_EMPRESA)  AND CODNAT IN (:P_NATUREZA) AND CODCENCUS IN (:P_CR)
),
INV AS ( /*INVESTIMENTO*/

SELECT 1 AS COD, NVL(ROUND(SUM(REALIZADO),2),0) AS VLRINV
FROM (
SELECT PROJ.CODPROJ, PROJ.IDENTIFICACAO,
SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND (META.DTREF >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (META.DTREF <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL))) AS META,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		AND (SCFIN.CODEMP IN (:P_EMPRESA))
	  	AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
	  	AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS REALIZADO,
		
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		AND (SCFIN.CODEMP IN (:P_EMPRESA))
	  	AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
	  	AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS EM_ABERTO,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		AND (SCFIN.CODEMP IN (:P_EMPRESA))
	  	AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
	  	AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NOT NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS BAIXADO,		
(((SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND (META.DTREF >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (META.DTREF <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL))))
-
(((SELECT DISTINCT SUM(VLRDESDOB)
FROM TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
WHERE SCFIN.CODPROJ = SCPROJ.CODPROJ
AND SCPROJ.CODPROJ = PROJ.CODPROJ
AND (SCFIN.CODEMP IN (:P_EMPRESA))
AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
AND SCFIN.RECDESP NOT IN (1,0)
AND SCFIN.CODPROJ <> 0
AND SCFIN.ORIGEM IN ('F','E')
AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
AND SCFIN.DHTIPOPER = SCTOP.DHALTER
AND SCTOP.TIPMOV IN ('C','I','G')))))/
(SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND (META.DTREF >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (META.DTREF <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL))))*100) AS PORCENTAGEM,
PROJ.CODPROJPAI,
(SELECT IDENTIFICACAO FROM TCSPRJ PR WHERE PR.CODPROJ = PROJ.CODPROJPAI) AS PROJETO_PAI
FROM TCSPRJ PROJ
WHERE PROJ.CODPROJ <> 0
GROUP BY CODPROJ, IDENTIFICACAO, CODPROJPAI
)


),
INV_MA AS ( /*INVESTIMENTO - MES ANTERIOR*/

SELECT 1 AS COD, NVL(ROUND(SUM(REALIZADO),2),0) AS VLRINV_MA
FROM (
SELECT PROJ.CODPROJ, PROJ.IDENTIFICACAO,
SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND META.DTREF BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))))
AS META,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		AND (SCFIN.CODEMP IN (:P_EMPRESA))
        AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS REALIZADO,
		
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		AND (SCFIN.CODEMP IN (:P_EMPRESA))
        AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS EM_ABERTO,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		AND (SCFIN.CODEMP IN (:P_EMPRESA))
        AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NOT NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS BAIXADO,		
(((SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND META.DTREF BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
)))
-
(((SELECT DISTINCT SUM(VLRDESDOB)
FROM TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
WHERE SCFIN.CODPROJ = SCPROJ.CODPROJ
AND SCPROJ.CODPROJ = PROJ.CODPROJ
AND (SCFIN.CODEMP IN (:P_EMPRESA))
AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
AND SCFIN.RECDESP NOT IN (1,0)
AND SCFIN.CODPROJ <> 0
AND SCFIN.ORIGEM IN ('F','E')
AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
AND SCFIN.DHTIPOPER = SCTOP.DHALTER
AND SCTOP.TIPMOV IN ('C','I','G')))))/
(SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND META.DTREF BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
)))*100) AS PORCENTAGEM,
PROJ.CODPROJPAI,
(SELECT IDENTIFICACAO FROM TCSPRJ PR WHERE PR.CODPROJ = PROJ.CODPROJPAI) AS PROJETO_PAI
FROM TCSPRJ PROJ
WHERE PROJ.CODPROJ <> 0
GROUP BY CODPROJ, IDENTIFICACAO, CODPROJPAI
)




),
BAS_MA AS (
SELECT 
1 AS COD,
SUM(TOTALLIQ) VLRFAT_MA,
SUM(VLRDEV) VLRDEVOL_MA,
SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) VLRIMP_MA,
SUM(CUSMEDSICM_TOT) VLRCMV_MA,
SUM(HL) HL_MA,
SUM(VLRDESC) VLRDESC_MA,
SUM(MARGEMNON) VLRMCN_MA,
AVG(PERCMARGEM) VLRMCD_MA
FROM(
SELECT
CAB.CODEMP,
CAB.NUNOTA,
SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRPIS,
NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRCOFINS,

SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
(SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
	- SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
        (
(SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
	- (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
	- SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
) PERCMARGEM,
CAB.TIPMOV
FROM TGFCAB CAB
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
WHERE TOP.GOLSINAL = -1
AND CAB.DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI)) 
AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S'
AND CAB.CODNAT IN (:P_NATUREZA)
AND CAB.CODCENCUS IN (:P_CR)
AND CAB.CODVEND IN (:P_VENDEDOR)

AND VEN.AD_ROTA IN (:P_ROTA)
GROUP BY CAB.CODEMP, CAB.NUNOTA, CAB.TIPMOV
)
),
BAS AS (
SELECT 
1 AS COD,
SUM(TOTALLIQ) VLRFAT,
SUM(VLRDEV) VLRDEVOL,
SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) VLRIMP,
SUM(CUSMEDSICM_TOT) VLRCMV,
SUM(HL) HL,
SUM(VLRDESC) VLRDESC,
SUM(MARGEMNON) VLRMCN,
AVG(PERCMARGEM) VLRMCD
FROM(
SELECT
CAB.CODEMP,
CAB.NUNOTA,
SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRPIS,
NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRCOFINS,
SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
(SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
	- SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
        (
(SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
	- (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
	- SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
) PERCMARGEM,
CAB.TIPMOV
FROM TGFCAB CAB
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
WHERE TOP.GOLSINAL = -1
AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S'
AND CAB.CODNAT IN (:P_NATUREZA)
AND CAB.CODCENCUS IN (:P_CR)
AND CAB.CODVEND IN (:P_VENDEDOR)

AND VEN.AD_ROTA IN (:P_ROTA)
GROUP BY CAB.CODEMP, CAB.NUNOTA, CAB.TIPMOV
))
SELECT 
VLRFAT,VLRFAT_MA,
NVL(ROUND(((VLRFAT - VLRFAT_MA) / NULLIF(VLRFAT_MA,0)) * 100,2),0) AS VAR_VLRFAT,
VLRDEVOL,VLRDEVOL_MA,
NVL(ROUND(((VLRDEVOL - VLRDEVOL_MA) / NULLIF(VLRDEVOL_MA, 0)) * 100, 2), 0) AS VAR_VLRDEVOL,
VLRIMP,VLRIMP_MA,
NVL(ROUND(((VLRIMP - VLRIMP_MA) / NULLIF(VLRIMP_MA, 0)) * 100, 2), 0) AS VAR_VLRIMP,
VLRCMV,VLRCMV_MA,
NVL(ROUND(((VLRCMV - VLRCMV_MA) / NULLIF(VLRCMV_MA, 0)) * 100, 2), 0) AS VAR_VLRCMV,
HL,HL_MA,
NVL(ROUND(((HL - HL_MA) / NULLIF(HL_MA, 0)) * 100, 2), 0) AS VAR_HL,
VLRDESC,VLRDESC_MA,
NVL(ROUND(((VLRDESC - VLRDESC_MA) / NULLIF(VLRDESC_MA, 0)) * 100, 2), 0) AS VAR_VLRDESC,
VLRMCN,VLRMCN_MA,
NVL(ROUND(((VLRMCN - VLRMCN_MA) / NULLIF(VLRMCN_MA, 0)) * 100, 2), 0) AS VAR_VLRMCN,
VLRMCD,VLRMCD_MA,
NVL(ROUND(((VLRMCD - VLRMCD_MA) / NULLIF(VLRMCD_MA, 0)) * 100, 2), 0) AS VAR_VLRMCD,
VLRDO,VLRDO_MA,
NVL(ROUND(((VLRDO - VLRDO_MA) / NULLIF(VLRDO_MA, 0)) * 100, 2), 0) AS VAR_VLRDO,
VLRINV,VLRINV_MA,
NVL(ROUND(((VLRINV - VLRINV_MA) / NULLIF(VLRINV_MA, 0)) * 100, 2), 0) AS VAR_VLRINV,
VLRFAT-VLRIMP-VLRCMV-VLRDO-VLRINV AS VLRRES,
VLRFAT_MA-VLRIMP_MA-VLRCMV_MA-VLRDO_MA-VLRINV_MA AS VLRRES_MA
FROM BAS
INNER JOIN BAS_MA ON BAS.COD = BAS_MA.COD
INNER JOIN DO ON BAS.COD = DO.COD
INNER JOIN DO_MA ON BAS.COD = DO_MA.COD
INNER JOIN INV ON BAS.COD = INV.COD
INNER JOIN INV_MA ON BAS.COD = INV_MA.COD
)

</snk:query>


<body>
    <c:forEach items="${dias.rows}" var="row">
    <div class="container">
        <h1>Relatório Financeiro</h1>
        <div class="data-item">Faturamento: <span>R$ ${row.VLRFAT}</span></div>
        <div class="data-item">Impostos: <span> -R$ ${row.VLRIMP} </span></div>
        <div class="data-item">CMV: <span> -R$ ${row.VLRCMV} </span></div>
        <div class="data-item">Despesa Operacional: <span> -R$ ${row.VLRDO} </span></div>
        <div class="data-item">Investimento: <span> -R$ ${row.VLRINV}</span></div>
        <c:choose>
            <c:when test="${row.VLRRES >= 0}">
                <div id="resultado" class="positivo">
                    Resultado: <fmt:formatNumber value="${row.VLRRES}" type="currency" currencySymbol="R$" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                </div>
            </c:when>
            <c:otherwise>
                <div id="resultado" class="negativo">
                    Resultado: <fmt:formatNumber value="${row.VLRRES}" type="currency" currencySymbol="R$" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                </div>
            </c:otherwise>
        </c:choose>
    </div>
    </c:forEach>    

</body>
</html>