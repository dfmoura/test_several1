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
    <title>Tabela de Receita Baixada</title>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #999;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #eee;
        }
    </style>
    <snk:load/>
</head>
<body>
    <snk:query var="receita_baixada">
        SELECT 
            ANO, MES, MES_ANO, DESCRNAT, DTNEG, ORIGEM, NUFIN,
            CODPARC, NOMEPARC, CODPROJ, DTVENC, VLRDESDO, RECDESP,
            TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
            NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
        FROM VW_FIN_RESUMO_SATIS
        WHERE RECDESP = 1 AND PROVISAO = 'N' AND DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
    </snk:query>

    <h2>Receita Baixada</h2>
    <table>
        <thead>
            <tr>
                <th>Ano</th>
                <th>Mês</th>
                <th>Mes/Ano</th>
                <th>Natureza</th>
                <th>Data Negociação</th>
                <th>Origem</th>
                <th>Num. Fin.</th>
                <th>Parceiro</th>
                <th>Nome Parceiro</th>
                <th>Projeto</th>
                <th>Vencimento</th>
                <th>Valor Desconto</th>
                <th>Tipo</th>
                <th>Baixa</th>
                <th>Cod. Natureza</th>
                <th>Conta Baixa</th>
                <th>Nome Conta</th>
                <th>Financeiro</th>
                <th>Valor Líquido</th>
                <th>Multiplicação Receita Anterior</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach var="item" items="${receita_baixada.rows}">
                <tr>
                    <td>${item.ANO}</td>
                    <td>${item.MES}</td>
                    <td>${item.MES_ANO}</td>
                    <td>${item.DESCRNAT}</td>
                    <td><fmt:formatDate value="${item.DTNEG}" pattern="dd/MM/yyyy"/></td>
                    <td>${item.ORIGEM}</td>
                    <td>${item.NUFIN}</td>
                    <td>${item.CODPARC}</td>
                    <td>${item.NOMEPARC}</td>
                    <td>${item.CODPROJ}</td>
                    <td><fmt:formatDate value="${item.DTVENC}" pattern="dd/MM/yyyy"/></td>
                    <td><fmt:formatNumber value="${item.VLRDESDO}" type="currency"/></td>
                    <td>${item.TIPO}</td>
                    <td><fmt:formatNumber value="${item.VLRBAIXA_CALC}" type="currency"/></td>
                    <td>${item.CODNAT}</td>
                    <td>${item.CONTA_BAIXA}</td>
                    <td>${item.NOME_CONTA_BAIXA}</td>
                    <td>${item.FINANCEIRO}</td>
                    <td><fmt:formatNumber value="${item.VLRLIQUIDO}" type="currency"/></td>
                    <td>${item.MULTIPLICACAO_RECEITA_ANTERIOR}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</body>
</html>
