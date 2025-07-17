<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<fmt:setLocale value="pt_BR"/>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>

  </style>
  <snk:load/>
</head>
</body>
<snk:query var="base">
    select
    AD_APELIDO, AD_OBSINTERNA, AD_QTDVOLLT, APELIDO, ATUALEST, ATUALFIN, BONIFICACAO,  
    CODCENCUS, CODEMP, CODGER, CODGRUPOPROD, CODIGO, CODNAT, CODPARC,  
    CODPROD, CODTIPOPER, CODVEND, CPFCNPJ, DESCRCENCUS, DESCRGRUPOPROD, DESCRNAT,  
    DESCROPER, DESCRPROD, DTMOV, DTNEG, EMP, EMPRESA, FAX,  
    IE, MARCA, MARCA1, NOMEFANTASIAEMP, NOMEPARC, NRO, NUMNOTA,  
    NUNOTA, PARC, PARCEIRO, PRECOTAB, PROD, QTD, QTDNEG,  
    STATUSNFE, TEL, TIPATUALFIN, TIPMOV, TOP, UF, VEND,  VLR, VLRCUSGER1, 
    VLRCUSGER2, VLRCUSICM1, VLRCUSICM2, VLRICMS, VLRUNITLIQ,  VOL
    from VGF_VENDAS_SATIS    
</snk:query>
