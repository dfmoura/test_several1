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
    <title>CHART</title>
    <style>


    </style>
    <snk:load />
</head>

<body>

    <snk:query var="dias">

    SELECT
    TO_CHAR(DTREF,'YYYY') AS ANO,
    TO_CHAR(DTREF,'MM') AS MES,
    TO_CHAR(DTREF,'MM-YYYY') AS MES_ANO,
    SUM(PREVREC + (PREVDESP*-1)) AS PREV,
    SUM(REALREC + (REALDESP*-1)) AS REAL
    FROM TGMMET MET
    WHERE CODMETA = 7
    GROUP BY
    TO_CHAR(DTREF,'YYYY'),
    TO_CHAR(DTREF,'MM'),
    TO_CHAR(DTREF,'MM-YYYY')
    ORDER BY
    TO_CHAR(DTREF,'YYYY'),
    TO_CHAR(DTREF,'MM')

    </snk:query>

    <div >

        <c:forEach items="${dias.rows}" var="row">

            <div></div>
            <div>${row.MES_ANO} - ${row.PREV} - ${row.REAL}</div>
            

        </c:forEach>

    </div>
</body>

</html>
