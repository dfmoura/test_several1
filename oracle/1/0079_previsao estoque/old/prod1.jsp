<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela</title>
    <style>

    </style>
    <snk:load/>
</head>
<body>

<snk:query var="detalhe"> 
select 
CODEMP,NOMEFANTASIA,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD,AD_QTDVOLLT,
ESTOQUE,VENDA_PER_ANTERIOR,GIRO,ESTMIN,VAR_META,EST_MIN_COM_VAR
from TEST


</snk:query>



</body>
</html>
