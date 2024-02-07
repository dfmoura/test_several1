<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8"  isELIgnored ="false"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
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
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            background-color: #fff;
            text-align: center;
        }

        .card-title {
            font-size: 16px;
            color: #333;
            margin-bottom: 10px;
        }

        .card-content {
            font-size: 40px;
            color: #007bff;
            margin-bottom: 20px;
        }

        .card-description {
            font-size: 20px;
            color: #666;
        }
    </style>

<snk:load/>	

</head>
<body>

    <snk:query var="dias">

    SELECT AVG(DIAS_EM_ATRASO) AS DIAS
    FROM (
    SELECT
    NUFIN
    ,DTVENC
    ,DHBAIXA
    ,DTVENC - NVL(DHBAIXA, TRUNC(SYSDATE)) AS DIAS_EM_ATRASO
    FROM TGFFIN
    WHERE RECDESP = 1
    AND CODPARC = :A_CODPARC
    )

  </snk:query>



    <div class="card">
        <div class="card-title">PONTUALIDADE</div>
                    <c:forEach items="${dias.rows}" var="row">                   
                <fmt:formatNumber value="${row.DIAS}" pattern="#0"/>
            </c:forEach>
                <div class="card-description">Dias</div>
    </div>
</body>
</html>
