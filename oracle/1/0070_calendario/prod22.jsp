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
                    <th>Cód.Cal.</th>
                    <th>Seq.</th>
                    <th>Cod. Proj.</th>
                    <th>Descrição</th>
                    <th>Dt. Ini.</th>
                    <th>Dt. Fim</th>
                    <th>Obs.</th>
                    <th>Concluido</th>
                </tr>
            </thead>
            <tbody id="resultTable">
                <!-- Os resultados da consulta serão inseridos aqui -->
            </tbody>
        </table>
    </div>

    <script>
        // Função para carregar os dados da tabela
        function carregarDados() {
            JX.consultar(`
                    SELECT 
                        cal.codigo AS codcal,
                        cal.cod_desenv_proj,
                        nov.codigo AS codigo,
                        nov.descricao AS descricao,
                        to_char(cal.dtainicio,'YYYY-MM-DD') AS dtainicio,
                        to_char(cal.dtafim,'YYYY-MM-DD') AS dtafim,
                        cal.obs,
                        CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
                    FROM AD_CALENDINOV cal
                    INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
                `).then(function (data) {
                const resultTable = document.getElementById('resultTable');
                resultTable.innerHTML = ''; // Limpa a tabela antes de inserir novos dados

                // Itera sobre os dados e cria as linhas da tabela
                data.forEach(function (item) {
                    const row = document.createElement('tr');
                    const codcalCell = document.createElement('td');
                    const cod_desenv_projCell = document.createElement('td');
                    const codigoCell = document.createElement('td');
                    const descricaoCell = document.createElement('td');
                    
                    const dtainicioCell = document.createElement('td');
                    const dtafimCell = document.createElement('td');
                    const obsCell = document.createElement('td');
                    const concluidoCell = document.createElement('td');

                    codcalCell.textContent = item.CODCAL;
                    cod_desenv_projCell.textContent = item.COD_DESENV_PROJ;
                    codigoCell.textContent = item.CODIGO;      // Supondo que a propriedade se chama 'CODIGO'
                    
                    descricaoCell.textContent = item.DESCRICAO;
                    dtainicioCell.textContent = item.DTAINICIO;
                    dtafimCell.textContent = item.DTAFIM;
                    obsCell.textContent = item.OBS; // Supondo que a propriedade se chama 'DESCRICAO'
                    concluidoCell.textContent = item.CONCLUIDO;
                    

                    row.appendChild(codcalCell);
                    row.appendChild(cod_desenv_projCell);
                    row.appendChild(codigoCell);
                    row.appendChild(descricaoCell);
                    row.appendChild(dtainicioCell);
                    row.appendChild(dtafimCell);
                    row.appendChild(obsCell);
                    row.appendChild(concluidoCell);
                    


                    resultTable.appendChild(row);
                });
            }).catch(function (error) {
                console.error('Erro ao consultar os dados:', error);
            });
        }

        // Carrega os dados ao iniciar a página
        carregarDados();
    </script>

    <!-- Bootstrap Modal e jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>

</html>
