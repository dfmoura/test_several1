<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extrair Dados XML</title>

    <style>
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
        }
        th, td {
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>

    <snk:load/>
</head>

<body>
    <snk:query var="nfe">
        SELECT
            grupo,
            Origem,
            nvl(chaveacesso,'0') chaveacesso,
            codemp,
            nvl(nunota,0) nunota,
            NUMNOTA,
            dhEmissao,
            nvl(codparc,0) codparc,
            nvl(razaosocial,'0') razaosocial,
            nvl(UF,'0') UF,
            nvl(CNPJ_CPF,'0') CNPJ_CPF,
            sequencia,
            CFOP,
            nvl(CST,0) CST,
            nvl(ncm,'0') ncm,
            nvl(codprod,0) codprod,
            nvl(descrprod,'0') descrprod,
            codvol,
            qtdneg,
            vlrunit,
            vlrtot,
            baseicms,
            aliqicms,
            vlricms
        FROM AD_TEST_XMS_SIS_SATIS
        WHERE 
            dhemissao BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN

    </snk:query>

    <h2>Dados da NF-e</h2>
    <table>
        <thead>
            <tr>
                <th>Grupo</th>
                <th>Origem</th>
                <th>Chave de Acesso</th>
                <th>Empresa</th>
                <th>Nota Fiscal</th>
                <th>Número da Nota</th>
                <th>Data de Emissão</th>
                <th>Código do Parceiro</th>
                <th>Razão Social</th>
                <th>UF</th>
                <th>CNPJ/CPF</th>
                <th>Sequência</th>
                <th>CFOP</th>
                <th>CST</th>
                <th>NCM</th>
                <th>Código do Produto</th>
                <th>Descrição do Produto</th>
                <th>Código do Volume</th>
                <th>Quantidade</th>
                <th>Valor Unitário</th>
                <th>Valor Total</th>
                <th>Base ICMS</th>
                <th>Alíquota ICMS</th>
                <th>Valor ICMS</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach var="row" items="${nfe.rows}">
                <tr>
                    <td>${row.grupo}</td>
                    <td>${row.Origem}</td>
                    <td>${row.chaveacesso}</td>
                    <td>${row.codemp}</td>
                    <td>${row.nunota}</td>
                    <td>${row.NUMNOTA}</td>
                    <td>${row.dhEmissao}</td>
                    <td>${row.codparc}</td>
                    <td>${row.razaosocial}</td>
                    <td>${row.UF}</td>
                    <td>${row.CNPJ_CPF}</td>
                    <td>${row.sequencia}</td>
                    <td>${row.CFOP}</td>
                    <td>${row.CST}</td>
                    <td>${row.ncm}</td>
                    <td>${row.codprod}</td>
                    <td>${row.descrprod}</td>
                    <td>${row.codvol}</td>
                    <td>${row.qtdneg}</td>
                    <td>${row.vlrunit}</td>
                    <td>${row.vlrtot}</td>
                    <td>${row.baseicms}</td>
                    <td>${row.aliqicms}</td>
                    <td>${row.vlricms}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</body>
</html>