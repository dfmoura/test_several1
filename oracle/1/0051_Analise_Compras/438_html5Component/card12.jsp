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
  CODPARC,
  SUM(DIAS_EM_ATRASO) / SUM(A) AS DIAS_EM_ATRASO
FROM (
  SELECT
    1 AS A,
    COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) AS CODPARC,
    COALESCE(PAR2.RAZAOSOCIAL, PAR.RAZAOSOCIAL) AS RAZAOSOCIAL,
    FIN.CODTIPOPER,
    FIN.NUFIN,
    FIN.NUNOTA,
    FIN.NUMNOTA,
    FIN.DTVENC,
    FIN.DHBAIXA,
    CASE 
      WHEN FIN.DTVENC < SYSDATE AND DHBAIXA IS NULL THEN FIN.DTVENC - SYSDATE
      WHEN (FIN.DTVENC - FIN.DHBAIXA) > 0 AND DHBAIXA IS NOT NULL THEN FIN.DTVENC - FIN.DHBAIXA
      WHEN (FIN.DTVENC - FIN.DHBAIXA) < 0 AND DHBAIXA IS NOT NULL THEN FIN.DTVENC - FIN.DHBAIXA
      WHEN (FIN.DTVENC - FIN.DHBAIXA) = 0 AND DHBAIXA IS NOT NULL THEN FIN.DTVENC - FIN.DHBAIXA
    END AS DIAS_EM_ATRASO,
    CASE 
      WHEN FIN.DTVENC < SYSDATE AND DHBAIXA IS NULL THEN 'Aberto Vencido'
      WHEN (FIN.DTVENC - DHBAIXA) > 0 AND DHBAIXA IS NOT NULL THEN 'Antecipação'
      WHEN (FIN.DTVENC - DHBAIXA) < 0 AND DHBAIXA IS NOT NULL THEN 'Pago em atraso'
      WHEN (FIN.DTVENC - DHBAIXA) = 0 AND DHBAIXA IS NOT NULL THEN 'No dia'
    END AS STATUS,
    FIN.VLRDESDOB,
    FIN.VLRBAIXA,
    FIN.HISTORICO
  FROM TGFFIN FIN 
  INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
  LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
  WHERE RECDESP = 1 AND PROVISAO = 'N' AND PAR.CLIENTE = 'S'
    AND PAR.CODPARCMATRIZ = :A_CODPARC
    AND (FIN.DHBAIXA IS NOT NULL OR FIN.DTVENC < TRUNC(SYSDATE))

  UNION ALL

  SELECT
    1 AS A,
    CAST(:A_CODPARC AS NUMBER) AS CODPARC,
    CAST(NULL AS VARCHAR2(255)) AS RAZAOSOCIAL,
    0 AS CODTIPOPER,
    0 AS NUFIN,
    0 AS NUNOTA,
    0 AS NUMNOTA,
    CAST(NULL AS DATE) AS DTVENC,
    CAST(NULL AS DATE) AS DHBAIXA,
    CAST(0 AS NUMBER) AS DIAS_EM_ATRASO,
    CAST(NULL AS VARCHAR2(255)) AS STATUS,
    0 AS VLRDESDOB,
    0 AS VLRBAIXA,
    CAST(NULL AS VARCHAR2(255)) AS HISTORICO
  FROM DUAL
  /* ESTE WHERE FOI FEITO PARA O REGISTRO ZERADO NAO APARECE QUANDO A PARTE DE CIMA DO UNION ALL APRESENTE REGISTRO, POIS INTERFERE NO CALCULO DA MEDIA*/
  WHERE NOT EXISTS (
    SELECT 1
    FROM TGFFIN FIN 
    INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
    LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
    WHERE RECDESP = 1 AND PROVISAO = 'N' AND PAR.CLIENTE = 'S'
      AND PAR.CODPARCMATRIZ = :A_CODPARC
      AND (FIN.DHBAIXA IS NOT NULL OR FIN.DTVENC < TRUNC(SYSDATE))
  )
)
GROUP BY CODPARC
ORDER BY 1


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
