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

<style>
</style>

<snk:load/>


<body>


<snk:query var="dias">  
    select * from AD_CONTEUDONOVO
</snk:query>   



<!-- Criando a tabela para exibir os dados -->
<table>
    <thead>
        <tr>
            <th>Descrição</th>
            <!-- Adicione mais colunas conforme a estrutura da tabela AD_CONTEUDONOVO -->
        </tr>
    </thead>
    <tbody>
        <c:forEach var="row" items="${dias.rows}">
            <tr>
                <td>${row.DESCRICAO}</td>
                <!-- Adicione mais células conforme necessário -->
            </tr>
        </c:forEach>
    </tbody>
</table>



</body>
</html>
