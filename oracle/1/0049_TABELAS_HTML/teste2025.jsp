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
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        table {
            width: 80%;
            border-collapse: collapse;
            background: #fff;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        caption {
            font-size: 1.5em;
            font-weight: bold;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #007BFF;
            color: white;
            text-transform: uppercase;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }
    </style>
    <snk:load />
</head>
<body>

<snk:query var="cab">
select nunota,to_char(dtneg,'DD/MM/YYYY')DTNEG,codparc,vlrnota
from tgfcab
where rownum < 10
</snk:query>

<table>
    <caption>Tabela de Exemplo</caption>
    <thead>
        <tr>
            <th>nunota</th>
            <th>dtneg</th>
            <th>codparc</th>
            <th>vlrnota</th>

        </tr>
    </thead>
    <tbody>
        <c:forEach items="${cab.rows}" var="row">
            <tr>
                <td onclick="abrir('${row.NUNOTA}')">${row.nunota}</td>
                <td>${row.dtneg}</td>
                <td>${row.codparc}</td>
                <td><fmt:formatNumber value="${row.vlrnota}" pattern="#,##0.00" /></td>
            </tr>
        </c:forEach>
    </tbody>
</table>


<script>

function abrir(nunota){
        var params = {'A_NUNOTA': parseInt(nunota)};
        var level = 'lvl_y7b1ha';
        openLevel(level, params);
    }


</script>

</body>
</html>