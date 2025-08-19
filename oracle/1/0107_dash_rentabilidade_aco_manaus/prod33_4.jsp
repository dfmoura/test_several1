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
    <title>Tela de Devoluções</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        
        .header h1 {
            color: #333;
            margin: 0;
        }
        
        .result-card {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(0,123,255,0.3);
        }
        
        .result-label {
            font-size: 18px;
            margin-bottom: 10px;
            opacity: 0.9;
        }
        
        .result-value {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
        }
        
        .info-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #007bff;
        }
        
        .info-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .info-text {
            color: #666;
            line-height: 1.6;
        }
    </style>

<snk:load/>

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
</head>
<body>

    <snk:query var="fat_total">  
        SELECT 
        SUM(totalliq) AS VLRFAT
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('V', 'D')
          AND ATIVO_TOP = 'S'
          AND AD_COMPOE_FAT = 'S'
          AND dtneg BETWEEN FORMAT(DATEFROMPARTS(:A_DtInicial_Ano, :A_DtInicial_Mes, :A_DtInicial_Dia), 'dd/MM/yyyy')
                         AND FORMAT(DATEFROMPARTS(:A_DtFinal_Ano, :A_DtFinal_Mes, :A_DtFinal_Dia), 'dd/MM/yyyy')
    </snk:query> 
    
    <div class="container">
        <div class="header">
            <h1>Dashboard de Rentabilidade ACO Manaus</h1>
        </div>
        
        <!-- Exibição do valor total da fatura -->
        <div class="result-card">
            <div class="result-label">Valor Total da Fatura</div>
            <div class="result-value">
                <fmt:formatNumber value="${fat_total.VLRFAT}" type="currency" currencySymbol="R$" pattern="#,##0.00"/>
            </div>
        </div>
        
        <!-- Informações sobre a consulta -->
        <div class="info-section">
            <div class="info-title">Informações da Consulta:</div>
            <div class="info-text">
                Esta consulta calcula o valor total das faturas (vendas e devoluções) para produtos ACO ativos 
                que compõem a fatura, dentro do período especificado pelos parâmetros de data.
            </div>
        </div>
        
        <!-- Verificação se há dados -->
        <c:if test="${empty fat_total.VLRFAT}">
            <div class="info-section" style="border-left-color: #dc3545;">
                <div class="info-title" style="color: #dc3545;">Atenção:</div>
                <div class="info-text">
                    Nenhum valor encontrado para o período especificado. Verifique os parâmetros de data ou se existem registros ativos.
                </div>
            </div>
        </c:if>
    </div>
</body>
</html>