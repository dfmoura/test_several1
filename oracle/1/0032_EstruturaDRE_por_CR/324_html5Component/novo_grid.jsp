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
    <title>Grid Tree</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <snk:load />
    <style>
        /* Add custom CSS styling here */
    </style>
</head>
<body>

<snk:query var="dias">
    SELECT 
        CODCENCUS,
        DESCRCENCUS,
        CODNAT,
        DESCRNAT,
        VLRBAIXA
    FROM VGF_RESULTADO_GM
    WHERE DHBAIXA BETWEEN '01-01-2024' AND '03-01-2024'
</snk:query>

<div class="container">
    <div class="row">
        <div class="col">
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>CODCENCUS</th>
                        <th>DESCRCENCUS</th>
                        <th>CODNAT</th>
                        <th>DESCRNAT</th>
                        <th>VLRBAIXA</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="dia" items="${dias.rows}">
                        <tr>
                            <td>${dia.CODCENCUS}</td>
                            <td>${dia.DESCRCENCUS}</td>
                            <td>${dia.CODNAT}</td>
                            <td>${dia.DESCRNAT}</td>
                            <td>${dia.VLRBAIXA}</td>
                        </tr>
                    </c:forEach>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
