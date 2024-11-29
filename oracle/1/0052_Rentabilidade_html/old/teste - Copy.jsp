<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
    
    </style>
    <snk:load/>
</head>
<body>
    
    <snk:query var="fat_tipo">  
        SELECT 
        'A' AS SUPERVISOR,
        1 AS VLRFAT        
        FROM DUAL
    </snk:query> 

    
    
        <h2>Supervisor and Sales Value</h2>
    
    
        <table>
            <thead>
                <tr>
                    <th>Supervisor</th>
                    <th>Sales Value</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="row" items="${fat_tipo.rows}">
                    <tr>
                        <td><c:out value="${row.SUPERVISOR}"/></td>
                        <td><c:out value="${row.VLRFAT}"/></td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    
    

    
</body>
</html>
