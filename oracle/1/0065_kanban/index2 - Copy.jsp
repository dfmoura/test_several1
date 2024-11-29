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
<title>Inserção de Conteúdo</title>

<style>
    table {
        width: 100%;
        border-collapse: collapse;
    }
    table, th, td {
        border: 1px solid black;
    }
    th, td {
        padding: 8px;
        text-align: left;
    }
    .message {
        color: green;
        font-weight: bold;
    }
    .error {
        color: red;
        font-weight: bold;
    }
</style>

<snk:load/>

</head>
<body>

<!-- Formulário para Inserção de Conteúdo -->
<h2>Inserir Novo Conteúdo</h2>
<form method="post">
    <label for="descricao">Descrição:</label>
    <input type="text" id="descricao" name="descricao" required>
    <button type="submit">Inserir</button>
</form>

<%-- Verifica se o parâmetro 'descricao' foi passado no POST para fazer a inserção --%>
<c:if test="${not empty param.descricao}">
    <!-- Realizando a inserção com a tag SankhyaJX -->
    <snk:update>
        INSERT INTO AD_CONTEUDONOVO (DESCRICAO) VALUES ('${param.descricao}')
    </snk:update>

    <!-- Mensagem de sucesso após a inserção -->
    <div class="message">Conteúdo inserido com sucesso!</div>
</c:if>

<%-- Tratando a consulta para exibir os dados já inseridos na tabela --%>
<h2>Conteúdos Existentes</h2>
<snk:query var="conteudos">
    SELECT * FROM AD_CONTEUDONOVO
</snk:query>

<!-- Criando a tabela para exibir os dados já inseridos -->
<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>Descrição</th>
        </tr>
    </thead>
    <tbody>
        <c:forEach var="row" items="${conteudos.rows}">
            <tr>
                <td>${row.ID}</td>
                <td>${row.DESCRICAO}</td>
            </tr>
        </c:forEach>
    </tbody>
</table>

</body>
</html>
