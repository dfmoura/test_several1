<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html>
<head>
    <title>HTML5 Component</title>
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/css/contatoCSS.css">
    <snk:load/>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="path/to/chartjs/dist/chart.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

    <style>
        body {
            font-family: Arial, sans-serif;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            table-layout: auto;
        }

        th, td {
            padding: 10px;
            text-align: left;
            font-size: 12px;
            border: 1px solid #ddd;
        }

        th {
            background-color: #f4f4f4;
            cursor: pointer;
        }

        th.resizable {
            resize: horizontal;
            overflow: auto;
        }

        .status-1 {
            background-color: #f0ad4e;
        }

        .status-2 {
            background-color: #5bc0de;
        }

        .status-3 {
            background-color: #07b934;
        }

        .btn-custom {
            background-color: #28a745;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-right: 10px; /* Espaço entre os botões */
        }

        .btn-custom i {
            margin-right: 5px;
        }

        .footer-buttons {
            text-align: right;
            padding: 10px;
        }
    </style>
 

    <script>
        function exportTableToExcel(tableId) {
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.table_to_sheet(document.getElementById(tableId));
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            XLSX.writeFile(wb, "Tabela.xlsx");
        }

     function atualizarItens(CODCAD) {
    var params = { CODCAD: CODCAD };
    refreshDetails('html5_2ydm0l', params);
}
    </script>



</head>
<body>
    <snk:query var="homologacao">
        SELECT 
        HOMOLOG.CODCAD,
        HOMOLOG.CODFOR,
        PAR.NOMEPARC,
        TO_CHAR(HOMOLOG.DTASOLICITACAO,'DD/MM/YY') AS DTASOLICITACAO,
        HOMOLOG.CODUSU,
        USU.NOMEUSU,
        F_DESCROPC('AD_FORHOMOLOG', 'STATUS', HOMOLOG.STATUS) AS STATUS
        FROM 
        AD_FORHOMOLOG HOMOLOG
        INNER JOIN TGFPAR PAR ON PAR.CODPARC=HOMOLOG.CODFOR
        INNER JOIN TSIUSU USU ON USU.CODUSU=HOMOLOG.CODUSU
        ORDER BY HOMOLOG.CODCAD
    </snk:query>

    <table id="table" class="table table-bordered">
        <thead>
            <tr>
                <th class="resizable" >ID</th>
                <th class="resizable">Cód.Fornecedor</th>
                <th class="resizable">Fornecedor</th>
                <th class="resizable">Dta.Solicitação</th>
                <th class="resizable">Cod.Usuário</th>
                <th class="resizable">Usuário</th>
                <th class="resizable">Status</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach items="${homologacao.rows}" var="row">
                <tr class="${row.STATUS.trim() == 'Aguardando Envio' ? 'status-1' 
                : (row.STATUS.trim() == 'Aguardando Análise' ? 'status-2' 
                : (row.STATUS.trim() == 'Concluído' ? 'status-3' : ''))}">
                     <a href="#" onclick="atualizarItens('${row.CODCAD}')">${row.CODCAD}</a>
                    <td>${row.CODFOR}</td>
                    <td>${row.NOMEPARC}</td>
                    <td>${row.DTASOLICITACAO}</td>
                    <td>${row.CODUSU}</td>
                    <td>${row.NOMEUSU}</td>
                    <td>${row.STATUS}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>

    <!-- Botões no rodapé -->
    <div class="footer-buttons">
        <button class="btn btn-custom" onclick="exportTableToExcel('table')">
            <i class="fas fa-file-excel"></i> Exportar
        </button>
       
    </div>
</body>
</html>
