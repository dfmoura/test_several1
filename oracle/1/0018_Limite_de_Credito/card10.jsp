<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
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
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 15px;
            max-width: 600px;
            width: 100%;
            box-sizing: border-box;
        }

        .card div {
            margin-bottom: 10px;
            font-size: 10px; 
        }

        .card div:first-child {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 16px;
        }
    </style>
    <snk:load />
</head>

<body>

    <snk:query var="dias">

        SELECT
        anc.codparc,
        par.razaosocial,
        anc.codanalise,
        anc.abempresa,
        anc.conserasa,
        anc.scorserasa,
        to_char(anc.obsserasa) as obsserasa,
        anc.anodre,
        anc.recdre,
        anc.lucdre,
        anc.predre,
        to_char(anc.dadosir) as dadosir,
        anc.pretcompra,
        anc.catfianca,
        to_char(anc.observacoes) as observacoes,
        anc.parecer,
        anc.anoanalise,
        anc.anofat,
        anc.valorfat

        FROM
        ad_ancredito anc
        INNER JOIN tgfpar par ON anc.codparc = par.codparc

        WHERE
        /*mostrando somente a ultima analise*/
        anc.codanalise = (
        SELECT MAX(anc_inner.codanalise)
        FROM ad_ancredito anc_inner
        WHERE anc_inner.codparc = anc.codparc
        )

        and anc.codparc = :A_CODPARC

    </snk:query>

    <div class="card">

        <c:forEach items="${dias.rows}" var="row">

            <div></div>
            <div><strong>Análise: </strong>${row.codanalise}</div>
            <div><strong>Abertura da Empresa: </strong> <fmt:formatDate value="${row.abempresa}" pattern="dd-MM-yyyy"/></div>
            
            <div><strong>Serasa: </strong><fmt:formatDate value="${row.conserasa}" pattern="dd-MM-yyyy"/> - <strong>Score:</strong> ${row.scorserasa}</div>
            
            <div><strong>Obs:</strong>${row.obsserasa}</div>
            <div><strong>Ano DRE:</strong>${row.anodre} - <strong>Re. DRE:</strong><fmt:formatNumber value="${row.recdre}" pattern="#,##0.00" /> - <strong>Lucro DRE: </strong><fmt:formatNumber value="${row.lucdre}" pattern="#,##0.00" /> - <strong>Pre. DRE: </strong><fmt:formatNumber value="${row.predre}" pattern="#,##0.00" /></div>
            
            
            <div><strong>Dados IR:</strong>${row.dadosir}</div>

            <div><strong>Pretenção Compra:</strong><fmt:formatNumber value="${row.pretcompra}" pattern="#,##0.00" /> - <strong>Carta Fiança:</strong>${row.catfianca}</div>
            <div><strong>Obs.:</strong>${row.observacoes}</div>
            <div><strong>Parecer:</strong>${row.parecer}</div>
            <div><strong>Ano Análise:</strong>${row.anoanalise} - <strong>Ano Fat.:</strong>${row.anofat} - <strong>Valor Faturamento:</strong><fmt:formatNumber value="${row.valorfat}" pattern="#,##0.00" /></div>

        </c:forEach>

    </div>
</body>

</html>
