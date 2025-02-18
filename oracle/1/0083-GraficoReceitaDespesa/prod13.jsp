<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste - Tabela de Dados</title>
  <snk:load/>
</head>
<body>

  <snk:query var="tabela">
    SELECT count(nufin) nufin
    FROM tgffin
    WHERE dtvenc BETWEEN 
          TRUNC(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'MM')
          AND 
          LAST_DAY(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'))
    ORDER BY 1
    
  </snk:query>

  <h1>Resultados da Consulta</h1>
  <table border="1" cellpadding="5" cellspacing="0">
    <thead>
      <tr>
        <th>Número do Financeiro (nufin)</th>
      </tr>
    </thead>
    <tbody>
      <c:forEach var="row" items="${tabela.rows}">
        <tr>
          <td>${row.nufin}</td>
        </tr>
      </c:forEach>
    </tbody>
  </table>

</body>
</html>