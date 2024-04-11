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
    </style>
    <snk:load />
</head>
<body>

<snk:query var="dias">

SELECT
    CODPARCMATRIZ AS CODPARC,
    NVL(AVG(DIAS_EM_ATRASO), 0) AS DIAS_EM_ATRASO
    FROM
    (
    SELECT
    PAR.CODPARCMATRIZ,
    NUFIN,
    NUNOTA,
    NUMNOTA,
    DTVENC,
    DHBAIXA,
    CASE
    WHEN DTVENC < SYSDATE AND DHBAIXA IS NULL THEN DTVENC-SYSDATE 
    WHEN (DTVENC - DHBAIXA)> 0 AND DHBAIXA IS NOT NULL THEN DTVENC - DHBAIXA
    WHEN (DTVENC - DHBAIXA) < 0 AND DHBAIXA IS NOT NULL THEN DTVENC - DHBAIXA
    WHEN (DTVENC - DHBAIXA)=0 AND DHBAIXA IS NOT NULL THEN DTVENC - DHBAIXA
    END AS DIAS_EM_ATRASO,
    CASE 
    WHEN DTVENC < SYSDATE AND DHBAIXA IS NULL THEN 'Aberto Vencido'
    WHEN (DTVENC - DHBAIXA)> 0 AND DHBAIXA IS NOT NULL THEN 'Antecipação'
    WHEN (DTVENC - DHBAIXA) < 0 AND DHBAIXA IS NOT NULL THEN 'Pago em atraso'
    WHEN (DTVENC - DHBAIXA)=0 AND DHBAIXA IS NOT NULL THEN 'No dia'
    END AS STATUS,
    VLRDESDOB,
    VLRBAIXA
    FROM TGFFIN FIN
    INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
    WHERE RECDESP=1 AND PROVISAO='N'
    AND (FIN.DHBAIXA IS NOT NULL OR FIN.DTVENC < TRUNC(SYSDATE))
    AND PAR.CODPARCMATRIZ = :A_CODPARC
    )GROUP BY CODPARCMATRIZ

    UNION ALL
    
    SELECT :A_CODPARC AS CODPARC
    ,0 AS DIAS_EM_ATRASO
    FROM DUAL
    WHERE ( SELECT COUNT(*) FROM TGFFIN FIN 
    INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
    WHERE RECDESP=1 AND PROVISAO='N' AND PAR.CODPARCMATRIZ = :A_CODPARC AND (FIN.DHBAIXA IS NOT NULL OR FIN.DTVENC < TRUNC(SYSDATE)) ) = 0



</snk:query>

<c:forEach items="${dias.rows}" var="row">
    <div class="card ${row.DIAS_EM_ATRASO >= 0 ? 'blue-card' : 'red-card'}" onclick="abrir('${row.CODPARC}')">  
        <div class="card-title">PONTUALIDADE</value></div>
        <div class="card-content">
            <fmt:formatNumber value="${row.DIAS_EM_ATRASO}" pattern="#0" />
        </div>
        <div class="card-description">Dias</div>
    </div>
</c:forEach>

<script>
    function abrir(codparc) {
        const parametros = { A_CODPARC: parseInt(codparc) };
        const level = 'lvl_82xfp3';
        openLevel(level, parametros);
    }
</script>

</body>
</html>
