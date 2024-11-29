<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html>
<head>
    <title>HTML5 Component</title>
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/css/contatoCSS.css">
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
            border: 1px solid #0a0a0a;
        }

        th {
            background-color: #f4f4f4;
            cursor: pointer;
        }

        th.resizable {
            resize: horizontal;
            overflow: auto;
        }
    </style>
    <snk:load/> <!-- essa tag deve ficar nesta posição -->
</head>
<body>

    <snk:query var="itens">
        SELECT 
        HOMOLOG.CODCAD,
        HOMOLOG.CODSOLICIT,
        HOMOLOG.CODPRH,
        PROD.DESCRPROD,
        HOMOLOG.DTASOLICIT,
        HOMOLOG.DTAPREV,
        HOMOLOG.DTARECEBIMENTO,
        HOMOLOG.CODENT,
        USUS.NOMEUSU AS Conferente,
        HOMOLOG.CODRECEB,
        USUE.NOMEUSU AS Recebedor,
        (SELECT F_DESCROPC('AD_INSHOMOLOG', 'NFOK', HOMOLOG.NFOK) FROM DUAL) AS NFOK,
        (SELECT F_DESCROPC('AD_INSHOMOLOG', 'CERTIFICADO', HOMOLOG.CERTIFICADO) FROM DUAL) AS Certificado,
        (SELECT F_DESCROPC('AD_INSHOMOLOG', 'QUANTIDADE', HOMOLOG.QUANTIDADE) FROM DUAL) AS Quantidade
        
        FROM AD_INSHOMOLOG HOMOLOG
        INNER JOIN TSIUSU USUS ON USUS.CODUSU=HOMOLOG.CODRECEB
        INNER JOIN TSIUSU USUE ON USUE.CODUSU=HOMOLOG.CODENT
        INNER JOIN TGFPRO PROD ON PROD.CODPROD=HOMOLOG.CODPRH
        INNER JOIN AD_FORHOMOLOG HML ON HML.CODCAD=HOMOLOG.CODCAD

        WHERE HOMOLOG.CODCAD=:A_CODCAD
        ORDER BY HOMOLOG.CODSOLICIT
      
    </snk:query>

    <table id="table" class="table table-bordered">
        <thead>
            <tr>
                <th class="resizable">Cód.Cadastro</th>
                <th class="resizable">Cód.Solicitação</th>
                <th class="resizable">Cód.Produto</th>
                <th class="resizable">Produto</th>
                <th class="resizable">Dta.Solicitação</th>
                <th class="resizable">Dta.Prev Envio</th>
                <th class="resizable">Dta.Recebimento</th>
                <th class="resizable">Cód.Usu</th>
                <th class="resizable">Nome Conferente</th>
                <th class="resizable">Cód.Usu</th>
                <th class="resizable">Destinatário</th>
                <th class="resizable">NF Conforme?</th>
                <th class="resizable">Certificado Conforme?</th>
                <th class="resizable">Quantidade Conforme?</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach items="${itens.rows}" var="row">
                <tr>
                    <td>${row.CODCAD}</td>
                    <td>${row.CODSOLICIT}</td>
                    <td>${row.CODPRH}</td>
                    <td>${row.DESCRPROD}</td>
                    <td>${row.DTASOLICIT}</td>
                    <td>${row.DTAPREV}</td>
                    <td>${row.DTARECEBIMENTO}</td>
                    <td>${row.CODENT}</td>
                    <td>${row.Conferente}</td>
                    <td>${row.CODRECEB}</td>
                    <td>${row.Recebedor}</td>
                    <td>${row.NFOK}</td>
                    <td>${row.Certificado}</td>
                    <td>${row.Quantidade}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>

</body>
</html>
