<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
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
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .card-title {
            font-size: 16px;
            color: #333;
            margin-bottom: 10px;
        }

        .card-content {
            font-size: 40px;
            margin-bottom: 20px;
        }

        .card-description {
            font-size: 20px;
            color: #666;
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

    <c:forEach items="${dias.rows}" var="row">
        <div class="card ${row.DIAS >= 0 ? 'blue-card' : 'red-card'}">
            <div class="card-title">PONTUALIDADE</div>
            <div class="card-content">${row.DIAS}</div>
            <div class="card-description">Dias</div>
        </div>
    </c:forEach>
</body>

</html>
