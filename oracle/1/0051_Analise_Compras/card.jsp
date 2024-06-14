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
    /* Estilos básicos para o layout */
body {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 20px;
            height: 100vh;
            padding: 20px;
        }
        
        .card {
            background-color: #f0f0f0;
            border-radius: 10px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            cursor: pointer;
        }
        
        .card:hover {
            background-color: #e0e0e0;
        }
        
        .card svg {
            width: 50px;
            height: 50px;
            margin-bottom: 10px;
        }
         p {
            font-size: 35px;
            font-weight: bold;
        }
</style>
        
        <snk:load/>
        
</head>
<body>
    
<snk:query var="dias">    
SELECT
TO_CHAR(COUNT(*), 'FM999G999G999') AS QTD_PEDIDOS
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
</snk:query>    
    
<c:forEach items="${dias.rows}" var="row">    
    <!-- Primeiro Card -->
        <div class="card" onclick="abrir()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M19.5 8c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5-2.015-4.5-4.5-4.5zm-.5 7v-2h-2v-1h2v-2l3 2.5-3 2.5zm-5.701-11.26c-.207-.206-.299-.461-.299-.711 0-.524.407-1.029 1.02-1.029.262 0 .522.1.721.298l3.783 3.783c-.771.117-1.5.363-2.158.726l-3.067-3.067zm-.299 8.76c0-1.29.381-2.489 1.028-3.5h-14.028v2h.643c.535 0 1.021.304 1.256.784l4.101 10.216h12l1.211-3.015c-3.455-.152-6.211-2.993-6.211-6.485zm-2.299-8.76c.207-.206.299-.461.299-.711 0-.524-.407-1.029-1.02-1.029-.261 0-.522.1-.72.298l-4.701 4.702h2.883l3.259-3.26z"/>
        </svg>
        <h3>Total de Pedidos</h3>
        <p>${row.QTD_PEDIDOS}</p>
        
    </div>
</c:forEach>
    
    <!-- Segundo Card -->
    <div class="card">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M7 22v-16h14v7.543c0 4.107-6 2.457-6 2.457s1.518 6-2.638 6h-5.362zm16-7.614v-10.386h-18v20h8.189c3.163 0 9.811-7.223 9.811-9.614zm-10 1.614h-4v-1h4v1zm6-4h-10v1h10v-1zm0-3h-10v1h10v-1zm1-7h-17v19h-2v-21h19v2z"/></svg>
        <h3>Total de Notas</h3>
        <p>ANDAMENTO</p>
    </div>

    <!-- Terceiro Card -->
    <div class="card">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20 0v2h-18v18h-2v-20h20zm-7.281 20.497l-.719 3.503 3.564-.658-2.845-2.845zm8.435-8.436l2.846 2.845-7.612 7.612-2.845-2.845 7.611-7.612zm-17.154-8.061v20h6v-2h-4v-16h16v4.077l2 2v-8.077h-20z"/>
        </svg>
        <h3>Total de Requisições</h3>
        <p>ANDAMENTO</p>
    </div>

    <!-- Quarto Card -->
    <div class="card">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20 0v2h-18v18h-2v-20h20zm3.889 22.333l-4.76-4.761c.51-.809.809-1.764.809-2.791 0-2.9-2.35-5.25-5.25-5.25s-5.25 2.35-5.25 5.25 2.35 5.25 5.25 5.25c1.027 0 1.982-.299 2.791-.809l4.761 4.76 1.649-1.649zm-13.201-7.552c0-2.205 1.795-4 4-4s4 1.795 4 4-1.795 4-4 4-4-1.795-4-4zm6.74 7.219h-11.428v-16h16v11.615l2 2v-15.615h-20v20h15.428l-2-2z"/>
        </svg>
        <h3>Top</h3>
        <p>ANDAMENTO</p>
    </div>

		<script>      
		function abrir(){
			var params = {};
			var level = 'lvl_fonk0l';
			openLevel(level, params);
		}
		</script>
</html>
