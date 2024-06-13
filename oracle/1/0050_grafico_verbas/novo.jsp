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
        /* Card styles */
        .card {
            width: 300px;
            padding: 8px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
            cursor: pointer; /* Add cursor pointer to indicate it's clickable */
        }
        .card-title {
            font-size: 20px;
            color: #fff;
            margin-bottom: 10px;
        }
        .card-content {
            font-size: 45px;
            margin-bottom: 20px;
        }
        .card-description {
            font-size: 15px;
            color: #fff;
        }
        /* Blue card style */
        .blue-card {
            background-color: #007bff;
            color: #fff;
            font-weight: bold;
        }
        /* Red card style */
        .red-card {
            background-color: #dc3545;
            color: #fff;
            font-weight: bold;
        }
        /* Table styles */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 18px;
            text-align: left;
        }
        table thead tr {
            background-color: #0add62ea;
            color: #ffffff;
            text-align: left;
        }
        table th, table td {
            padding: 12px 15px;
            border: 1px solid #dddddd;
        }
        table tbody tr:nth-of-type(even) {
            background-color: #f3f3f3;
        }
        table tbody tr:nth-of-type(odd) {
            background-color: #ffffff;
        }
        table tbody tr:hover {
            background-color: #f1f1f1;
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
*
FROM    
(
SELECT
    F_NIVEL2_DESC(CODPROJ) AS CODPILAR,
    F_IDENTIFICACAO(F_NIVEL2_DESC(CODPROJ)) AS IDENTIFICACAO,
    SUM(VLRPREV) AS VLRPREV,
    SUM(VLRREAL) AS VLRREAL,
    SUM(VLRCOMPROMETIDO) AS VLRCOMPROMETIDO,
    SUM(VLRREAL) + SUM(VLRCOMPROMETIDO) AS VLR_REAL_COMPRO
FROM (
    SELECT
        ANO,
        MES,
        MES_ANO,
        ANO_SAFRA,
        CODPROJ,
        0 AS VLRPREV,
        SUM(VLRREAL) AS VLRREAL,
        SUM(VLRCOMPROMETIDO) AS VLRCOMPROMETIDO
    FROM (
        SELECT
            (CASE WHEN :P_REG_COMP = 'N' THEN TO_CHAR(COALESCE(DHBAIXA, DTVENC),'YYYY') ELSE TO_CHAR(DTNEG,'YYYY') END) AS ANO,
            (CASE WHEN :P_REG_COMP = 'N' THEN TO_CHAR(COALESCE(DHBAIXA, DTVENC),'MM')  ELSE TO_CHAR(DTNEG,'MM') END) AS MES,
            (CASE WHEN :P_REG_COMP = 'N' THEN TO_CHAR(COALESCE(DHBAIXA, DTVENC),'MM-YYYY') ELSE TO_CHAR(DTNEG,'MM-YYYY') END) AS MES_ANO,
            ANO_SAFRA,
            CODPROJ,
            0 AS VLRPREV,
            VLRREAL,
            VLRCOMPROMETIDO
        FROM (
            WITH 
                FIN AS (SELECT NUFIN, NUNOTA, DESDOBRAMENTO, VLRDESDOB FROM TGFFIN),
                CAB AS (SELECT NUNOTA, CODTIPOPER,AD_TIPVERBA,AD_REGIAO,AD_CODVENDRTV,AD_LINHAPROD1,AD_LINHAPROD2,AD_LINHAPROD3 FROM TGFCAB)
            SELECT
                VGF.NUFIN,
                FIN.DESDOBRAMENTO,
                FIN.NUNOTA,
                VGF.NUMNOTA,
                CAB.AD_TIPVERBA,
                CAB.AD_REGIAO,
                CAB.AD_CODVENDRTV,
                CAB.AD_LINHAPROD1,
                CAB.AD_LINHAPROD2,
                CAB.AD_LINHAPROD3,
                VGF.CODNAT,
                VGF.CODPROJ,
                VGF.CODCENCUS,
                CAB.CODTIPOPER,
                VGF.DTNEG,
                VGF.DTVENC,
                VGF.DHBAIXA,
                (CASE 
                WHEN :P_REG_COMP = 'N' THEN COALESCE(F_ANO_SAFRA(VGF.DHBAIXA), F_ANO_SAFRA(VGF.DTVENC))
                WHEN :P_REG_COMP = 'S' THEN F_ANO_SAFRA(VGF.DTNEG)
                END) AS ANO_SAFRA,
                VGF.PROVISAO,
                FIN.VLRDESDOB,
                VGF.VLRBAIXA * -1 AS VLRBAIXA,
                CASE WHEN VGF.PROVISAO = 'S' THEN  VGF.VLRDESDOB * -1 END AS VLRCOMPROMETIDO,
                CASE WHEN VGF.PROVISAO = 'N' THEN  VGF.VLRBAIXA * -1 END AS VLRREAL
            FROM VGF_RESULTADO_PROV_SATIS VGF
            LEFT JOIN FIN ON VGF.NUFIN = FIN.NUFIN
            LEFT JOIN CAB ON FIN.NUNOTA = CAB.NUNOTA
            WHERE
                VGF.RECDESP = -1
                AND SUBSTR(VGF.CODPROJ, 1, 1) = '8'
                AND (
                	(:P_REG_COMP = 'N' AND COALESCE(F_ANO_SAFRA(VGF.DHBAIXA), F_ANO_SAFRA(VGF.DTVENC)) = :P_ANO_SAFRA)
                	OR (:P_REG_COMP = 'S' AND F_ANO_SAFRA(VGF.DTNEG) = :P_ANO_SAFRA)
                )
AND (
    ( :P_REG_COMP  = 'N' AND ((VGF.PROVISAO = 'N' AND VGF.DHBAIXA IS NOT NULL) OR (VGF.PROVISAO = 'S' AND VGF.DHBAIXA IS NULL)) )
OR ( :P_REG_COMP  = 'S' AND (VGF.PROVISAO = 'S' AND VGF.DHBAIXA IS NULL) OR VGF.PROVISAO = 'N')
    )
                AND( 
                ((:P_TIPVERBA = 'V' OR :P_TIPVERBA IS NULL) AND CAB.AD_TIPVERBA IS NULL)
                OR (:P_TIPVERBA = 'M' AND CAB.AD_TIPVERBA = 'M')
                OR (:P_TIPVERBA = 'T' AND CAB.AD_TIPVERBA = 'T')
                OR (:P_TIPVERBA = 'M_T' AND CAB.AD_TIPVERBA IN ('M', 'T'))
                OR (:P_TIPVERBA = 'M_T_V' AND (CAB.AD_TIPVERBA IN ('M', 'T') OR TRIM(CAB.AD_TIPVERBA) IS NULL))
                )
                AND ((VGF.CODPROJ IN :P_CODPROJ) OR TRIM(VGF.CODPROJ) IS NULL)
                AND ((VGF.CODNAT IN :P_CODNAT) OR TRIM(VGF.CODNAT) IS NULL)
        )
    )
    GROUP BY
        ANO,
        MES,
        MES_ANO,
        ANO_SAFRA,
        CODPROJ

    UNION ALL 

    SELECT
        TO_CHAR(DTREF, 'YYYY') AS ANO,
        TO_CHAR(DTREF, 'MM') AS MES,
        TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
        ANO_SAFRA,
        CODPROJ,
        SUM(PREVDESP) AS VLRPREV,
        0 AS VLRREAL,
        0 AS VLRCOMPROMETIDO
    FROM (
        SELECT
            MET.CODMETA,
            MET.DTREF,
            F_ANO_SAFRA(MET.DTREF) AS ANO_SAFRA,
            MET.CODPROJ,
            MET.PREVDESP
        FROM TGFMET MET
        WHERE 
            MET.CODMETA = 10
            AND SUBSTR(MET.CODPROJ, 1, 1) = '8'
		     AND ((MET.CODPROJ IN :P_CODPROJ) OR TRIM(MET.CODPROJ) IS NULL)
            AND F_ANO_SAFRA(MET.DTREF) = :P_ANO_SAFRA
    )
    GROUP BY
        TO_CHAR(DTREF, 'YYYY'),
        TO_CHAR(DTREF, 'MM'),
        TO_CHAR(DTREF, 'MM-YYYY'),
        ANO_SAFRA,
        CODPROJ
) 
GROUP BY F_NIVEL2_DESC(CODPROJ),F_IDENTIFICACAO(F_NIVEL2_DESC(CODPROJ))
)
ORDER BY 1

</snk:query>

<!-- Tabela estilizada -->
<table>
    <caption>Tabela de Exemplo</caption>
    <thead>
        <tr>
            <th>Cód. Pilar</th>
            <th>Identificação</th>
            <th>Vlr. Previsto</th>
            <th>Vlr. Real</th>
            <th>Vlr. Comprometido</th>
            <th>Vlr. Real Comprometido</th>
        </tr>
    </thead>
    <tbody>

        <c:forEach items="${dias.rows}" var="row">
            <tr>
                <td>${row.CODPILAR}</td>
                <td>${row.IDENTIFICACAO}</td>
                <!--
                <td><fmt:formatNumber value="${row.VLRPREV}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VLRREAL}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VLRCOMPROMETIDO}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VLR_REAL_COMPRO}" pattern="#,##0.00" /></td>
                -->
            </tr>
        </c:forEach>
    </tbody>
</table>

</body>
</html>
