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
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://code.highcharts.com/highcharts.js"></script>
    <script src="https://code.highcharts.com/modules/treemap.js"></script>
    <style>
        body {
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            overflow-y: auto; /* Adiciona scroll vertical interno */
            max-height: 300px; /* Altura máxima da tabela com scroll */
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            transition: background-color 0.3s ease; /* Transição suave de cor de fundo */
        }
        th {
            background-color: #f2f2f2;
            color: #333;
        }
        tr:hover {
            background-color: #f5f5f5; /* Cor de fundo ao passar o mouse */
            cursor: pointer; /* Cursor apontando ao passar o mouse */
        }
        .half-height {
            height: 50vh; /* Altura de 50% da viewport */
            overflow-y: auto; /* Adiciona scroll vertical se necessário */
        }
    </style>
    <snk:load/>
    <script>
        function atualizarTabela2(codgrupoprod) {
            const params = {'a_codgrupoprod': codgrupoprod };
            refreshDetails('html5_30a1ss', params); // Supondo que 'lvl_wv9sop' seja o ID da consulta da tabela 2
        }
    </script>
</head>
<body>

    <snk:query var="teste1">
    select
    codgrupoprod, descrgrupoprod
    from tgfgru
    </snk:query>


    <snk:query var="teste2">
        select
        codprod,
        descrprod
        from tgfpro
        where codgrupoprod = :a_codgrupoprod
    </snk:query>


    <div class="container-fluid">
        <div class="row">
            <div class="col half-height">
                <table id="tabela1" class="table table-bordered">
                    <thead class="thead-light">
                        <tr>
                            <th scope="col">Cód. Grupo Produto</th>
                            <th scope="col">Descr. Grupo Produto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:forEach items="${teste1.rows}" var="row">
                            <tr onclick="atualizarTabela2('${row.codgrupoprod}')">
                                <td>${row.codgrupoprod}</td>
                                <td>${row.descrgrupoprod}</td>
                            </tr>
                        </c:forEach>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="row">
            <div class="col half-height">
                <table id="tabela2" class="table table-bordered">
                    <thead class="thead-light">
                        <tr>
                            <th scope="col">Cód. Produto</th>
                            <th scope="col">Descr. Produto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:forEach items="${teste2.rows}" var="row">
                            <tr>
                                <td>${row.codprod}</td>
                                <td>${row.descrprod}</td>
                            </tr>
                        </c:forEach>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>
