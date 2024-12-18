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
                                background: url('https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/oracle/1/0075_custo_proj_inovacao/inova.jpeg') no-repeat center center fixed;
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
                                            <th>Formulação</th>
                                            <th>Custo (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- gerado pelo script -->
                                    </tbody>
                                </table>
                                <div class="total" id="totalCost">Total: R$ 0</div>
                            </div>
                        </div>

                        <script>
                            // Função para buscar e preencher os dados na tabela
                            async function fetchData() {
                                try {
                                    const response = await JX.consultar(`
                                        SELECT DISTINCT NOV.NROUNICO, 
                                                        NOV.CODIGO, 
                                                        NOV.NROUNICO||'-'||NOV.CODIGO||'-'||NOV.DESCRICAO AS PROJETO,
                                                        BOR.CODFORMULACAO||'-'||BOR.PRODSEMCAD AS FORMULACAO,
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
                                        GROUP BY NOV.NROUNICO, NOV.CODIGO, NOV.NROUNICO||'-'||NOV.CODIGO||'-'||NOV.DESCRICAO,
                                                 BOR.CODFORMULACAO||'-'||BOR.PRODSEMCAD
                                        ORDER BY NOV.NROUNICO
                                    `);
                        
                                    const projectsTable = document.querySelector('#projectsTable tbody');
                                    const projectFilter = document.getElementById('projectFilter');
                                    let totalCost = 0;
                                    const projectNames = new Set();
                        
                                    // Limpa os dados existentes
                                    projectsTable.innerHTML = '';
                                    projectFilter.innerHTML = '';
                        
                                    response.forEach(row => {
                                        const projeto = row.PROJETO;
                                        const formulacao = row.FORMULACAO;
                                        const custo = parseFloat(row.CUSTO) || 0;
                        
                                        // Formatação para exibição
                                        const custoFormatado = new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        }).format(custo);
                        
                                        // Adiciona opções de filtro
                                        projectNames.add(projeto);
                        
                                        // Adiciona uma linha na tabela
                                        const newRow = projectsTable.insertRow();
                                        newRow.insertCell(0).textContent = projeto;
                                        newRow.insertCell(1).textContent = formulacao;
                                        newRow.insertCell(2).textContent = custo.toFixed(2); // Usa valor bruto para cálculos futuros
                                        totalCost += custo;
                                    });
                        
                                    // Popula as opções do filtro
                                    projectNames.forEach(name => {
                                        const option = document.createElement('option');
                                        option.value = name;
                                        option.textContent = name;
                                        projectFilter.appendChild(option);
                                    });
                        
                                    // Adiciona uma opção para "Todos"
                                    const allOption = document.createElement('option');
                                    allOption.value = 'Todos';
                                    allOption.textContent = 'Todos';
                                    allOption.selected = true;
                                    projectFilter.insertBefore(allOption, projectFilter.firstChild);
                        
                                    // Exibe o custo total
                                    const totalCostFormatted = new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(totalCost);
                        
                                    document.getElementById('totalCost').textContent = 'Total: ' + totalCostFormatted;
                        
                                } catch (error) {
                                    console.error('Erro ao buscar dados:', error);
                                }
                            }
                        
                            // Função para filtrar projetos e recalcular o custo total
                            function filterProjects() {
                                const selectedProjects = Array.from(document.getElementById('projectFilter').selectedOptions).map(option => option.value);
                                const rows = Array.from(document.querySelectorAll('#projectsTable tbody tr'));
                                let total = 0;
                        
                                rows.forEach(row => {
                                    const projectName = row.cells[0].textContent;
                                    const projectCost = parseFloat(row.cells[2].textContent) || 0;
                        
                                    // Mostra ou oculta a linha com base no filtro
                                    const showRow = selectedProjects.includes('Todos') || selectedProjects.includes(projectName);
                        
                                    row.style.display = showRow ? '' : 'none';
                        
                                    // Soma o custo das linhas visíveis
                                    if (showRow) total += projectCost;
                                });
                        
                                // Atualiza o custo total exibido
                                const totalFormatted = new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(total);
                        
                                document.getElementById('totalCost').textContent = 'Total: ' + totalFormatted;
                            }
                        
                            // Chama a função para buscar dados ao carregar a página
                            fetchData();
                        </script>
                        



                    </body>

                    </html>