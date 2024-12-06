<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
    <%@ page import="java.util.*" %>
        <%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
            <%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
                <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

                    <html lang="pt-BR">


                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Projetos e Custos</title>
                        <style>
                            body {
                                margin: 0;
                                font-family: Arial, sans-serif;
                                background: url('https://github.com/dfmoura/test_several1/blob/main/ireport/0020_Des_nov_prod/inova.jpeg?raw=true') no-repeat center center fixed;
                                background-size: cover;
                                color: #fff;
                                display: flex;
                                height: 100vh;
                            }

                            .container {
                                display: flex;
                                width: 100%;
                                max-width: 1200px;
                                margin: auto;
                                background-color: rgba(0, 0, 0, 0.7);
                                border-radius: 10px;
                                overflow: hidden;
                            }

                            .filter {
                                padding: 20px;
                                width: 250px;
                                border-right: 1px solid #fff;
                            }

                            .filter h2 {
                                margin-top: 0;
                            }

                            select {
                                padding: 10px;
                                margin-bottom: 10px;
                                border: none;
                                border-radius: 5px;
                                width: 100%;
                            }

                            .projects-table {
                                flex: 1;
                                padding: 20px;
                                overflow-y: auto;
                            }

                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }

                            th,
                            td {
                                padding: 10px;
                                border: 1px solid #fff;
                            }

                            th {
                                background-color: #444;
                            }

                            .total {
                                font-size: 1.5em;
                                margin-top: 20px;
                            }

                            @media (max-width: 600px) {
                                .filter {
                                    width: 100%;
                                    border-right: none;
                                    border-bottom: 1px solid #fff;
                                }

                                .projects-table {
                                    padding: 10px;
                                }

                                h1 {
                                    font-size: 2em;
                                }

                                .total {
                                    font-size: 1.2em;
                                }
                            }
                        </style>
                        <snk:load />
                        <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
                        <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
                    </head>

                    <body>
                        <div class="container">
                            <div class="filter">
                                <h2>Filtrar Projetos</h2>
                                <label for="projectFilter">Projetos:</label>
                                <select id="projectFilter" multiple>
                                    <option value="Todos">Todos os Projetos</option>
                                    <!-- Options will be populated dynamically -->
                                </select>
                                <button onclick="filterProjects()">Filtrar</button>
                            </div>
                            <div class="projects-table">
                                <h1>Projetos e Custos</h1>
                                <table id="projectsTable">
                                    <thead>
                                        <tr>
                                            <th>Projeto</th>
                                            <th>Custo (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Data will be populated dynamically -->
                                    </tbody>
                                </table>
                                <div class="total" id="totalCost">Total: R$ 0</div>
                            </div>
                        </div>

                        <script>
                            // Function to fetch data from the database
                            function fetchProjects() {
                                JX.consultar(`SELECT DISTINCT 
                NOV.NROUNICO||'-'||NOV.CODIGO||'-'||NOV.DESCRICAO AS PROJETO,
                SUM(NVL(BOR.QUANTIDADE * BOR.DENSIDADE * (DET.PERC_100G) * VALOR_UN, 0)) AS CUSTO 
            FROM AD_NOVOSPRODUTOS NOV 
            LEFT JOIN AD_APONTAMFORMULACAO APO ON NOV.NROUNICO = APO.NROUNICO 
            LEFT JOIN AD_ADFORMULACOESLAB LAB ON NOV.NROUNICO = LAB.NROUNICO AND APO.CODAPONTAMENTO = LAB.CODAPONTAMENTO 
            LEFT JOIN AD_FORMULLABOR BOR ON LAB.CODFORMULACAO = BOR.CODFORMULACAO 
            LEFT JOIN AD_DETALHFORMULACOES DET ON LAB.CODFORMULACAO = DET.CODFORMULACAO 
            LEFT JOIN AD_CONTINSUMO CONT ON DET.CODCAD = CONT.CODCAD AND DET.CODCONT = CONT.CODCONT 
            LEFT JOIN AD_CADMATERIA CAD ON CONT.CODCAD = CAD.CODCAD 
            INNER JOIN TSIUSU USU ON BOR.CODUSU = USU.CODUSU 
            LEFT JOIN TGFPRO PRO ON BOR.CODPROD = PRO.CODPROD 
            GROUP BY NOV.NROUNICO||'-'||NOV.CODIGO||'-'||NOV.DESCRICAO`)
                                    .then(data => {
                                        populateTable(data);
                                    })
                                    .catch(error => console.error('Erro ao consultar os dados:', error));
                            }

                            // Function to populate the table with data
                            function populateTable(data) {
                                const tableBody = document.querySelector('#projectsTable tbody');
                                tableBody.innerHTML = ''; // Clear existing rows
                                const projectFilter = document.getElementById('projectFilter');

                                // Clear existing options in the project filter
                                projectFilter.innerHTML = '<option value="Todos">Todos os Projetos</option>';

                                let totalCost = 0;

                                data.forEach(row => {
                                    const project = row.PROJETO;
                                    const cost = parseFloat(row.CUSTO) || 0;

                                    // Create new row in the table
                                    const newRow = document.createElement('tr');
                                    newRow.innerHTML = `<td>${project}</td><td>${cost.toFixed(2)}</td>`;
                                    tableBody.appendChild(newRow);

                                    // Add to total cost
                                    totalCost += cost;

                                    // Add project to filter options
                                    const option = document.createElement('option');
                                    option.value = project;
                                    option.textContent = project;
                                    projectFilter.appendChild(option);
                                });

                                // Update the total cost display
                                document.getElementById('totalCost').textContent = 'Total: R$ ' + totalCost.toFixed(2);
                            }

                            // Function to filter projects based on selection
                            function filterProjects() {
                                const projectFilter = Array.from(document.getElementById('projectFilter').selectedOptions).map(option => option.value);

                                const rows = Array.from(document.querySelectorAll('#projectsTable tbody tr'));
                                let total = 0;

                                rows.forEach(row => {
                                    const projectName = row.cells[0].textContent;
                                    const projectCost = parseFloat(row.cells[1].textContent);
                                    const showRow = projectFilter.includes("Todos") || projectFilter.includes(projectName);

                                    if (showRow) {
                                        row.style.display = '';
                                        total += projectCost;
                                    } else {
                                        row.style.display = 'none';
                                    }
                                });

                                document.getElementById('totalCost').textContent = 'Total: R$ ' + total.toFixed(2);
                            }

                            // Fetch data when the page loads
                            window.onload = fetchProjects;
                        </script>
                    </body>

                    </html>