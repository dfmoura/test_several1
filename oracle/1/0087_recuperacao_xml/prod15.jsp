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
    <!-- Use only one JX library source -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="jx.min.js"></script> <!-- Produção -->
    <snk:load/>

    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
        <snk:load/>
</head>

<body>
    <table>
        <thead>
            <tr>
                <th>Número da Nota</th>
                <th>Data Negociação</th>
                <th>Valor da Nota</th>
            </tr>
        </thead>
        <tbody>
            <!-- JavaScript -->
        </tbody>
    </table>

    <script>
        // Wait for both window load and Sankhya initialization
        JX.onLoad(() => {
            console.log('JX loaded and initialized');
            
            // Test if JX is properly loaded
            if (typeof JX === 'undefined') {
                console.error('JX não está definido!');
                return;
            }

            JX.consultar({
                comando: 'SELECT nunota, dtneg, vlrnota FROM tgfcab WHERE rownum <= 10',
                sucesso: function(response) {
                    console.log('Resposta completa:', response);
                    
                    // Check if we have the expected response structure
                    if (!response || !response.registros) {
                        console.error('Resposta inválida:', response);
                        return;
                    }

                    const tbody = document.querySelector('tbody');
                    const registros = response.registros;
                    
                    console.log('Número de registros:', registros.length);

                    if (registros.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="3">Nenhum dado encontrado</td></tr>';
                        return;
                    }

                    registros.forEach(row => {
                        console.log('Processando linha:', row);
                        const date = new Date(row.DTNEG).toLocaleDateString('pt-BR');
                        const value = new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                        }).format(row.VLRNOTA);
                        
                        tbody.innerHTML += `
                            <tr>
                                <td>${row.NUNOTA}</td>
                                <td>${date}</td>
                                <td>${value}</td>
                            </tr>
                        `;
                    });
                },
                erro: function(erro) {
                    console.error('Erro na consulta:', erro);
                    alert('Erro ao carregar os dados: ' + (erro.message || erro));
                }
            });
        });
    </script>

</body>
</html>