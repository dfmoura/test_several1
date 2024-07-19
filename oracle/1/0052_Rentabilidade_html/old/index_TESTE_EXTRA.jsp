<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored ="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html>
<head>
    <title>HTML5 Component</title>
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/css/contatoCSS.css">
    <snk:load/> <!-- essa tag deve ficar nesta posição -->
</head>
<body>

    <snk:query var="contatos">
        SELECT 
            COUNT(ERP.CODSOLICIT) AS Quantidade_de_Chamados,
            SUM(CASE WHEN ERP.STATUS = '3' THEN 1 ELSE 0 END) AS Chamados_Resolvidos,
            (SUM(CASE WHEN ERP.STATUS = '3' THEN 1 ELSE 0 END) / COUNT(ERP.CODSOLICIT)) * 100 AS Porcentagem_de_Chamados_Resolvidos
        FROM 
            AD_SOLIERP ERP
    </snk:query>
    
    <h1>Teste Maicon</h1>
    <table border="1">
        <caption>Contatos</caption>
        <tr>
            <th>Quantidade de Chamados</th>
            <th>Chamados Resolvidos</th>
            <th>Porcentagem de Chamados Resolvidos</th>
        </tr>
        <c:forEach items="${contatos.rows}" var="row">
            <tr>
                <td><c:out value="${row.Quantidade_de_Chamados}" /></td>
                <td><c:out value="${row.Chamados_Resolvidos}" /></td>
                <td><c:out value="${row.Porcentagem_de_Chamados_Resolvidos}" /></td>
            </tr>
        </c:forEach>
    </table>
    
</body>
</html>
