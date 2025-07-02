<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  <style>

  </style>
  <snk:load/>
</head>
<body>

  <snk:query var="base">
    SELECT 
       CODTAB,
       NOMETAB,
       CODPROD,
       DESCRPROD,
       MARCA,
       AD_QTDVOLLT,
       POND_MARCA,
       DTVIGOR,
       CUSTO_SATIS,
       PRECO_TAB,
       MARGEM,
       PRECO_TAB_MENOS15,
       MARGEM_MENOS15,
       PRECO_TAB_MENOS65,
       MARGEM_MENOS65,
       TICKET_MEDIO_OBJETIVO,
       TICKET_MEDIO_ULT_12_M,
       TICKET_MEDIO_SAFRA,
       CUSTO_SATIS_ATU 
     FROM base
    </snk:query>

</body>
</html>
