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
    <title>Gerar Botões Dinamicamente</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f4f4;
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .button:active {
            background-color: #00408a;
        }
    </style>
</head>
<body>
    <div class="container" id="button-container"></div>

    <snk:load/>
    <snk:query var="fat_tipo">
        SELECT 'Produto A' AS PRODUTO FROM DUAL UNION ALL
        SELECT 'Produto B' AS PRODUTO FROM DUAL UNION ALL
        SELECT 'Produto C' AS PRODUTO FROM DUAL UNION ALL
        SELECT 'Produto D' AS PRODUTO FROM DUAL UNION ALL
        SELECT 'Diogo' AS PRODUTO FROM DUAL UNION ALL
        SELECT 'Produto E' AS PRODUTO FROM DUAL 
    </snk:query>

    <script>
        // Função para gerar botões dinamicamente
        function generateButtons(records) {
            const container = document.getElementById('button-container');

            records.forEach((record, index) => {
                const button = document.createElement('button');
                button.className = 'button';
                button.textContent = record.PRODUTO; // Usar o valor da coluna PRODUTO
                button.addEventListener('click', () => {
                    alert(`Você clicou no ${record.PRODUTO}`);
                });
                container.appendChild(button);
            });
        }

        // Obtendo dados da query e gerando botões
        const records = [
            <c:forEach items="${fat_tipo.rows}" var="row">
                { PRODUTO: '${row.PRODUTO}' }<c:if test="${!empty row.PRODUTO}">,</c:if>
            </c:forEach>
        ];

        // Chamar a função para gerar os botões
        generateButtons(records);
    </script>
</body>
</html>
