<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Dashboard</title>
    <style>
        /* Reset CSS */
        /* Body styles */
        body {
            font-family: Arial, sans-serif;
        }
        /* Table styles */
            /* Adiciona borda à tabela */
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 18px;
                text-align: left;
                border: 2px solid #ddd; /* Adiciona uma borda à tabela */
            }

            /* Estilo para os cabeçalhos das colunas */
            table th {
                background-color: #0add62ea; /* Cor de fundo */
                color: #ffffff; /* Cor do texto */
                padding: 12px 15px; /* Preenchimento interno */
                border: 1px solid #ddd; /* Borda */
                font-size: 16px; /* Tamanho da fonte */
            }

            /* Estilo para as células */
            table td {
                padding: 10px 15px; /* Preenchimento interno */
                border: 1px solid #ddd; /* Borda */
            }

            /* Destaque de linha ao passar o mouse */
            table tbody tr:hover {
                background-color: #f1f1f1;
            }

            /* Alternância de cores das linhas */
            table tbody tr:nth-child(even) {
                background-color: #f3f3f3;
            }
        caption {
            caption-side: top;
            font-size: 1.5em;
            margin: 10px;
        }
    </style>
    <snk:load />
</head>
<body>

<snk:query var="dias">

	
	
SELECT
CODVEND
FROM
(
SELECT
CODVEND, VENDEDOR AS APELIDO,SUM(JUL_QTDPREV) AS JUL_QTDPREV, SUM(JUL_QTDREAL) AS JUL_QTDREAL,  SUM(JUL_VLR_PREV) AS JUL_VLR_PREV, SUM(JUL_VLR_REAL) AS JUL_VLR_REAL, SUM(AGO_QTDPREV) AS AGO_QTDPREV, SUM(AGO_QTDREAL) AS AGO_QTDREAL, SUM(AGO_VLR_PREV) AS AGO_VLR_PREV, SUM(AGO_VLR_REAL) AS AGO_VLR_REAL, SUM(SET_QTDPREV) AS SET_QTDPREV, SUM(SET_QTDREAL) AS SET_QTDREAL, SUM(SET_VLR_PREV) AS SET_VLR_PREV, SUM(SET_VLR_REAL) AS SET_VLR_REAL, SUM(OUT_QTDPREV) AS OUT_QTDPREV, SUM(OUT_QTDREAL) AS OUT_QTDREAL, SUM(OUT_VLR_PREV) AS OUT_VLR_PREV, SUM(OUT_VLR_REAL) AS OUT_VLR_REAL, SUM(NOV_QTDPREV) AS NOV_QTDPREV, SUM(NOV_QTDREAL) AS NOV_QTDREAL, SUM(NOV_VLR_PREV) AS NOV_VLR_PREV, SUM(NOV_VLR_REAL) AS NOV_VLR_REAL, SUM(DEZ_QTDPREV) AS DEZ_QTDPREV, SUM(DEZ_QTDREAL) AS DEZ_QTDREAL, SUM(DEZ_VLR_PREV) AS DEZ_VLR_PREV, SUM(DEZ_VLR_REAL) AS DEZ_VLR_REAL, SUM(JAN_QTDPREV) AS JAN_QTDPREV, SUM(JAN_QTDREAL) AS JAN_QTDREAL, SUM(JAN_VLR_PREV) AS JAN_VLR_PREV, SUM(JAN_VLR_REAL) AS JAN_VLR_REAL, SUM(FEV_QTDPREV) AS FEV_QTDPREV, SUM(FEV_QTDREAL) AS FEV_QTDREAL, SUM(FEV_VLR_PREV) AS FEV_VLR_PREV, SUM(FEV_VLR_REAL) AS FEV_VLR_REAL, SUM(MAR_QTDPREV) AS MAR_QTDPREV, SUM(MAR_QTDREAL) AS MAR_QTDREAL, SUM(MAR_VLR_PREV) AS MAR_VLR_PREV, SUM(MAR_VLR_REAL) AS MAR_VLR_REAL, SUM(ABR_QTDPREV) AS ABR_QTDPREV, SUM(ABR_QTDREAL) AS ABR_QTDREAL, SUM(ABR_VLR_PREV) AS ABR_VLR_PREV, SUM(ABR_VLR_REAL) AS ABR_VLR_REAL, SUM(MAI_QTDPREV) AS MAI_QTDPREV, SUM(MAI_QTDREAL) AS MAI_QTDREAL, SUM(MAI_VLR_PREV) AS MAI_VLR_PREV, SUM(MAI_VLR_REAL) AS MAI_VLR_REAL, SUM(JUN_QTDPREV) AS JUN_QTDPREV, SUM(JUN_QTDREAL) AS JUN_QTDREAL, SUM(JUN_VLR_PREV) AS JUN_VLR_PREV, SUM(JUN_VLR_REAL) AS JUN_VLR_REAL, SUM(TTL_QTDPREV) AS TTL_QTDPREV, SUM(TTL_QTDREAL) AS TTL_QTDREAL, SUM(TTL_VLR_PREV) AS TTL_VLR_PREV, SUM(TTL_VLR_REAL) AS TTL_VLR_REAL 

FROM
(
WITH VEND AS (SELECT VEN.CODVEND, VEN.APELIDO AS VENDEDOR, VEN.CODGER,VEN1.APELIDO AS COORD FROM TGFVEN VEN INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND)
SELECT
  (CASE 
    WHEN :P_AGRUP_COORDENADOR = 'S' THEN VEND.CODGER
    ELSE X.CODVEND END) AS CODVEND,
  (CASE
    WHEN :P_AGRUP_COORDENADOR = 'S' THEN VEND.COORD
    ELSE VEND.VENDEDOR END) AS VENDEDOR,
JUL_QTDPREV, JUL_QTDREAL, JUL_VLR_PREV, JUL_VLR_REAL, AGO_QTDPREV, AGO_QTDREAL, AGO_VLR_PREV, AGO_VLR_REAL, SET_QTDPREV, SET_QTDREAL, SET_VLR_PREV, SET_VLR_REAL, OUT_QTDPREV, OUT_QTDREAL, OUT_VLR_PREV, OUT_VLR_REAL, NOV_QTDPREV, NOV_QTDREAL, NOV_VLR_PREV, NOV_VLR_REAL, DEZ_QTDPREV, DEZ_QTDREAL, DEZ_VLR_PREV, DEZ_VLR_REAL, JAN_QTDPREV, JAN_QTDREAL, JAN_VLR_PREV, JAN_VLR_REAL, FEV_QTDPREV, FEV_QTDREAL, FEV_VLR_PREV, FEV_VLR_REAL, MAR_QTDPREV, MAR_QTDREAL, MAR_VLR_PREV, MAR_VLR_REAL, ABR_QTDPREV, ABR_QTDREAL, ABR_VLR_PREV, ABR_VLR_REAL, MAI_QTDPREV, MAI_QTDREAL, MAI_VLR_PREV, MAI_VLR_REAL, JUN_QTDPREV, JUN_QTDREAL, JUN_VLR_PREV, JUN_VLR_REAL
,TTL_QTDPREV,TTL_QTDREAL,TTL_VLR_PREV,TTL_VLR_REAL
FROM
(
	
SELECT
T.*,
(JUL_QTDPREV + AGO_QTDPREV + SET_QTDPREV + OUT_QTDPREV+NOV_QTDPREV+DEZ_QTDPREV+JAN_QTDPREV+FEV_QTDPREV+MAR_QTDPREV+ABR_QTDPREV+MAI_QTDPREV+JUN_QTDPREV) AS TTL_QTDPREV,
(JUL_QTDREAL + AGO_QTDREAL + SET_QTDREAL + OUT_QTDREAL+NOV_QTDREAL+DEZ_QTDREAL+JAN_QTDREAL+FEV_QTDREAL+MAR_QTDREAL+ABR_QTDREAL+MAI_QTDREAL+JUN_QTDREAL) AS TTL_QTDREAL,
(JUL_VLR_PREV + AGO_VLR_PREV + SET_VLR_PREV + OUT_VLR_PREV+NOV_VLR_PREV+DEZ_VLR_PREV+JAN_VLR_PREV+FEV_VLR_PREV+MAR_VLR_PREV+ABR_VLR_PREV+MAI_VLR_PREV+JUN_VLR_PREV) AS TTL_VLR_PREV,
(JUL_VLR_REAL + AGO_VLR_REAL + SET_VLR_REAL + OUT_VLR_REAL+NOV_VLR_REAL+DEZ_VLR_REAL+JAN_VLR_REAL+FEV_VLR_REAL+MAR_VLR_REAL+ABR_VLR_REAL+MAI_VLR_REAL+JUN_VLR_REAL) AS TTL_VLR_REAL



FROM (

SELECT 
A.CODVEND,
APELIDO,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 7 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDPREV ELSE 0 END) AS JUL_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 7 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDREAL ELSE 0 END) AS JUL_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 7 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS JUL_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 7 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS JUL_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 8 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDPREV ELSE 0 END) AS AGO_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 8 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDREAL ELSE 0 END) AS AGO_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 8 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS AGO_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 8 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS AGO_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 9 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDPREV ELSE 0 END) AS SET_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 9 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDREAL ELSE 0 END) AS SET_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 9 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS SET_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 9 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS SET_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 10 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDPREV ELSE 0 END) AS OUT_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 10 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDREAL ELSE 0 END) AS OUT_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 10 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS OUT_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 10 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS OUT_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 11 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDPREV ELSE 0 END) AS NOV_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 11 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDREAL ELSE 0 END) AS NOV_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 11 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS NOV_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 11 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS NOV_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 12 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDPREV ELSE 0 END) AS DEZ_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 12 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN QTDREAL ELSE 0 END) AS DEZ_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 12 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS DEZ_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 12 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.INI, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS DEZ_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 1 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDPREV ELSE 0 END) AS JAN_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 1 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDREAL ELSE 0 END) AS JAN_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 1 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS JAN_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 1 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS JAN_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 2 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDPREV ELSE 0 END) AS FEV_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 2 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDREAL ELSE 0 END) AS FEV_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 2 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS FEV_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 2 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS FEV_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 3 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDPREV ELSE 0 END) AS MAR_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 3 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDREAL ELSE 0 END) AS MAR_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 3 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS MAR_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 3 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS MAR_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 4 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDPREV ELSE 0 END) AS ABR_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 4 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDREAL ELSE 0 END) AS ABR_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 4 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS ABR_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 4 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS ABR_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 5 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDPREV ELSE 0 END) AS MAI_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 5 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDREAL ELSE 0 END) AS MAI_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 5 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS MAI_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 5 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS MAI_VLR_REAL,

SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 6 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDPREV ELSE 0 END) AS JUN_QTDPREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 6 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN QTDREAL ELSE 0 END) AS JUN_QTDREAL,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 6 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (QTDPREV * PRECOLT) ELSE 0 END) AS JUN_VLR_PREV,
SUM(CASE WHEN EXTRACT(MONTH FROM DTREF) = 6 AND EXTRACT(YEAR FROM DTREF) = TO_CHAR(:P_PERIODO.FIN, 'YYYY') THEN (VLRREAL) ELSE 0 END) AS JUN_VLR_REAL
FROM
(
SELECT MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(MET.CODPARC,0) AS CODPARC, NVL(MET.MARCA,0) AS MARCA,NVL(VGF.CODCENCUS,0) AS CODCENCUS, NVL(MET.QTDPREV,0) AS QTDPREV, SUM(NVL(VGF.QTD,0)) AS QTDREAL,NVL(PRC.VLRVENDALT,0)AS PRECOLT, SUM(NVL(VGF.VLR,0)) AS VLRREAL
FROM TGFMET MET
LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
LEFT JOIN AD_PRECOMARCA PRC ON ( MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA ))
WHERE 
MET.CODMETA = :P_CODMETA
AND MET.DTREF BETWEEN :P_PERIODO.INI   AND  :P_PERIODO.FIN

AND (VGF.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)

GROUP BY MET.DTREF,NVL(MET.CODVEND,0),NVL(MET.CODPARC,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)



)A
	
INNER JOIN TGFPAR PAR ON A.CODPARC = PAR.CODPARC
INNER JOIN TGFVEN VEN ON A.CODVEND = VEN.CODVEND


WHERE
(VEN.CODVEND IN :P_CODVEND)
AND (VEN.CODGER IN :P_CODGER)
AND (PAR.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
AND (A.MARCA IN (SELECT MARCA FROM TGFPRO WHERE CODPROD IN :P_MARCA))
AND (A.CODCENCUS = :P_CR OR :P_CR IS NULL)
AND
(
VEN.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) ---CONSULTA VENDEDOR
OR VEN.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO) ---CONSULTA GERENTE
OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' ---CONSULTA MASTER
)
GROUP BY A.CODVEND, APELIDO)T
)X
INNER JOIN VEND ON X.CODVEND = VEND.CODVEND
)
GROUP BY CODVEND, VENDEDOR
)
WHERE ((:P_NTEMMETA = 'S' AND (TTL_QTDPREV <> 0 OR TTL_QTDREAL <> 0 OR TTL_VLR_PREV <> 0 OR TTL_VLR_REAL<> 0)) OR :P_NTEMMETA = 'N')


	
	
	
	
	
	
	
</snk:query>

<!-- Tabela estilizada -->
<table>
    <caption>Tabela de Exemplo</caption>
    <thead>
        <tr>
            <th>Cód. Vendedor</th> 
            
        </tr>
    </thead>
    <tbody>
        <c:forEach items="${dias.rows}" var="row">
            <tr>

                
                <td>${row.CODVEND}</td>
                
            </tr>
        </c:forEach>
    </tbody>
</table>
</body>
</html>