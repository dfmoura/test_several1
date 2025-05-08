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
    <title>Dashboard</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            transition: transform 0.3s ease;
            font-size: 12px;
        }

        table:hover {
            transform: translateX(10px);
        }

        th,
        td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }

        th {
            background-color: #f4f4f4;
            cursor: pointer;
            position: sticky;
            top: 0;
            z-index: 2;
        }

        th:hover {
            background-color: #eaeaea;
        }
    </style>

    <snk:load />
</head>

<body>

    <snk:query var="dias">
        SELECT
            (CASE
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '01' THEN 'JANEIRO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '02' THEN 'FEVEREIRO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '03' THEN 'MARÇO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '04' THEN 'ABRIL'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '05' THEN 'MAIO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '06' THEN 'JUNHO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '07' THEN 'JULHO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '08' THEN 'AGOSTO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '09' THEN 'SETEMBRO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '10' THEN 'OUTUBRO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '11' THEN 'NOVEMBRO'
                WHEN TO_CHAR(FIN.DTVENC,'MM') = '12' THEN 'DEZEMBRO'
            END) AS MES,
            NAT.DESCRNAT,
            SUM(CASE WHEN FIN.RECDESP = 1 THEN VFIN.VLRLIQUIDO ELSE 0 END) AS TOTAL_RECEITA,
            SUM(CASE WHEN FIN.RECDESP = -1 THEN VFIN.VLRLIQUIDO ELSE 0 END) AS TOTAL_DESPESA,
            SUM(CASE WHEN FIN.RECDESP = 1 THEN FIN.VLRBAIXA ELSE 0 END) AS TOTAL_RECEITA_BAIXADA,
            SUM(CASE WHEN FIN.RECDESP = -1 THEN FIN.VLRBAIXA ELSE 0 END) AS TOTAL_DESPESA_BAIXADA
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        WHERE FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND FIN.PROVISAO = 'N'
        AND FIN.CODNAT IN (:P_NATUREZA)
        GROUP BY 
            TO_CHAR(FIN.DTVENC, 'MM'), 
            NAT.DESCRNAT
        ORDER BY 
            TO_CHAR(FIN.DTVENC, 'MM'), 
            NAT.DESCRNAT
    </snk:query>

    <header>
        <h1 class="titulo-header">Analise por Naturezas</h1>
    </header>

    <table>
        <thead>
            <tr>
                <th>Natureza</th>
                <th>Mês</th>
                <th>Previsão em Receita</th>
                <th>Previsão em Despesa</th>
                <th>Previsão em Receita Baixada</th>
                <th>Previsão em Despesa Baixada</th>
            </tr>
        </thead>
        <tbody>
            <c:set var="total" value="0" />
            <c:forEach items="${dias.rows}" var="row">
                <tr>
                    <td>${row.DESCRNAT}</td>
                    <td>${row.MES}</td>
                    <td><fmt:formatNumber value="${row.TOTAL_RECEITA}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    <td><fmt:formatNumber value="${row.TOTAL_DESPESA}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    <td><fmt:formatNumber value="${row.TOTAL_RECEITA_BAIXADA}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    <td><fmt:formatNumber value="${row.TOTAL_DESPESA_BAIXADA}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    
                </tr>
            </c:forEach>
            
        </tbody>
    </table>
</body>

</html>
