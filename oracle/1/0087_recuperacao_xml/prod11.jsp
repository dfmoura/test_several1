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
    
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    
    <script src="jx.min.js"></script> <!-- Produção -->        
    
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
        <tbody id="resultTable">
            <!-- Dados serão inseridos aqui dinamicamente -->
        </tbody>
    </table>
    
    <script>
        JX.consultar(`
            SELECT grupo, Origem, nvl(chaveacesso,'0') chaveacesso, codemp, nvl(nunota,0) nunota, 
                   NUMNOTA, dhEmissao, nvl(codparc,0) codparc, nvl(razaosocial,'0') razaosocial, 
                   nvl(UF,'0') UF, nvl(CNPJ_CPF,'0') CNPJ_CPF, sequencia, CFOP, 
                   nvl(CST,0) CST, nvl(ncm,'0') ncm, nvl(codprod,0) codprod, 
                   nvl(descrprod,'0') descrprod, codvol, qtdneg, vlrunit, vlrtot, 
                   baseicms, aliqicms, vlricms 
            FROM AD_TEST_XMS_SIS_SATIS 
            WHERE dhemissao BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN`
        ).then(function (data) {
            const resultTable = document.getElementById('resultTable');
            resultTable.innerHTML = '';

            data.forEach(function (item) {
                const row = document.createElement('tr');
                [
                    'GRUPO', 'ORIGEM', 'CHAVEACESSO', 'CODEMP', 'NUNOTA', 'NUMNOTA', 'DHEMISSAO',
                    'CODPARC', 'RAZAOSOCIAL', 'UF', 'CNPJ_CPF', 'SEQUENCIA', 'CFOP', 'CST', 'NCM',
                    'CODPROD', 'DESCRPROD', 'CODVOL', 'QTDNEG', 'VLRUNIT', 'VLRTOT', 'BASEICMS',
                    'ALIQICMS', 'VLRICMS'
                ].forEach(field => {
                    const cell = document.createElement('td');
                    cell.textContent = item[field] || '-';
                    row.appendChild(cell);
                });
                resultTable.appendChild(row);
            });
        }).catch(function (error) {
            console.error('Erro ao carregar os dados:', error);
        });
    </script>
</body>
</html>
