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
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX/jx.min.js"></script>
    <script src="jx.min.js"></script> <!-- Produção -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        /* Adicione aqui estilos personalizados se necessário */
    </style>
    <snk:load />
</head>

<body>

    <div class="container mt-5">
        <h1 class="text-center">Resultados da Consulta</h1>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                </tr>
            </thead>
            <tbody id="resultTable">
                <!-- Os resultados da consulta serão inseridos aqui -->
            </tbody>
        </table>
    </div>

    <script>
        // Consulta ao banco com resposta formatada em JS
        JX.consultar('SELECT * FROM AD_DADOSTESTE').then(function (data) {
            // A variável 'data' contém os resultados da consulta
            const resultTable = document.getElementById('resultTable');

            // Itera sobre os dados e cria as linhas da tabela
            data.forEach(function (item) {
                const row = document.createElement('tr');
                const codigoCell = document.createElement('td');
                const descricaoCell = document.createElement('td');

                codigoCell.textContent = item.CODIGO;      // Supondo que a propriedade se chama 'CODIGO'
                descricaoCell.textContent = item.DESCRICAO; // Supondo que a propriedade se chama 'DESCRICAO'

                row.appendChild(codigoCell);
                row.appendChild(descricaoCell);
                resultTable.appendChild(row);
            });
        }).catch(function (error) {
            console.error('Erro ao consultar os dados:', error);
        });
    </script>

</body>

</html>
