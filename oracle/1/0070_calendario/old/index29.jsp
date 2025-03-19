<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="br.com.sankhya.modelcore.auth.AuthenticationInfo" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cadastro de Calendário</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/classic.min.css" />
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    
    <style>
        .row-spacing {
            margin-bottom: 15px;
        }
        .table td {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
        }          
    </style>
    <snk:load />
</head>

<body>

    <div class="container mt-5">
        <h1 class="text-center">Cadastro de Calendário</h1>

        <!-- Formulário de cadastro -->
        <div class="mb-4">
            <form id="formCadastro">
                <div class="row row-spacing">
                    <div class="col-md-8">
                        <div class="form-group">
                            <label for="COD_DESENV_PROJ">Projeto</label>
                            <select id="COD_DESENV_PROJ" class="form-control" readonly>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="CONCLUIDO">Concluído</label>
                            <select id="CONCLUIDO" class="form-control">
                                <option value="S">Sim</option>
                                <option value="N">Não</option>
                            </select>
                        </div>            
                    </div>
                </div>
                <div class="form-group">
                    <label for="OBS">Observações</label>
                    <textarea id="OBS" class="form-control" rows="4" placeholder="Digite as observações"></textarea>
                </div>

                <!-- Data e Hora -->
                <div class="row row-spacing">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="DTAINICIO">Data Início</label>
                            <input type="date" id="DTAINICIO" class="form-control">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="DTAFIM">Data Fim</label>
                            <input type="date" id="DTAFIM" class="form-control">
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRINI">Hora Início</label>
                            <input type="text" id="HRINI" class="form-control" placeholder="hhmm">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRFIM">Hora Fim</label>
                            <input type="text" id="HRFIM" class="form-control" placeholder="hhmm">
                        </div>
                    </div>
                </div>
                <div class="row row-spacing">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="USUARIO">Usuário</label>
                            <input type="text" id="USUARIO" class="form-control" readonly>
                        </div>
                    </div>
                </div>
                <button type="button" id="btnSalvar" class="btn btn-primary mt-2">Salvar</button>
                <button type="button" id="btnCancelar" class="btn btn-secondary mt-2 ml-2">Cancelar</button>
            </form>
        </div>

        <!-- Tabela de exibição -->
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Projeto</th>
                    <th>Observações</th>
                    <th>Concluído</th>
                    <th>Data Início</th>
                    <th>Data Fim</th>
                    <th>Hora Início</th>
                    <th>Hora Fim</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="resultTable">
            </tbody>
        </table>
    </div>

    <script>
        let codigoAtual = null;

        flatpickr("#DTAINICIO", { dateFormat: "d/m/Y" });
        flatpickr("#DTAFIM", { dateFormat: "d/m/Y" });

        // Função para carregar projetos no dropdown
        async function loadProjetosDropdown() {
            const projetos = await JX.consultar("SELECT NROUNICO, DESCRICAO FROM AD_NOVOSPRODUTOS");
            const dropdown = document.getElementById("COD_DESENV_PROJ");
            projetos.forEach(proj => {
                const option = document.createElement("option");
                option.value = proj.NROUNICO;
                option.text = proj.DESCRICAO;
                dropdown.appendChild(option);
            });
        }

        // Função para carregar dados na tabela
        function carregarDados() {
            const CodCal = obterCodCal();
            const sql = `SELECT CODIGO, COD_DESENV_PROJ, OBS, CONCLUIDO, TO_CHAR(DTAINICIO,'DD/MM/YYYY') DTAINICIO, TO_CHAR(DTAFIM,'DD/MM/YYYY') DTAFIM,
                         CASE WHEN HRINI IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRINI), 1, LENGTH(TO_CHAR(HRINI)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRINI), -2) END HRINI,
                         CASE WHEN HRFIM IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRFIM), 1, LENGTH(TO_CHAR(HRFIM)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRFIM), -2) END HRFIM,
                         USUARIO FROM AD_CALENDINOV WHERE CODIGO = ` + CodCal;

            JX.consultar(sql).then(function (data) {
                const resultTable = document.getElementById('resultTable');
                resultTable.innerHTML = '';
                data.forEach(function (item) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.CODIGO}</td>
                        <td>${item.COD_DESENV_PROJ}</td>
                        <td>${item.OBS}</td>
                        <td>${item.CONCLUIDO}</td>
                        <td>${item.DTAINICIO}</td>
                        <td>${item.DTAFIM}</td>
                        <td>${item.HRINI}</td>
                        <td>${item.HRFIM}</td>
                        <td>
                            <button class="btn btn-warning mr-2" onclick="editarRegistro(${item.CODIGO})">Editar</button>
                            <button class="btn btn-danger" onclick="excluirRegistro(${item.CODIGO})">Excluir</button>
                        </td>
                    `;
                    resultTable.appendChild(row);
                });
            }).catch(function (error) {
                console.error('Erro ao carregar os dados:', error);
            });
        }

        // Função para editar um registro
        function editarRegistro(codigo) {
            const sql = `SELECT * FROM AD_CALENDINOV WHERE CODIGO = ${codigo}`;
            JX.consultar(sql).then(function(data) {
                const item = data[0];
                codigoAtual = item.CODIGO;
                document.getElementById('COD_DESENV_PROJ').value = item.COD_DESENV_PROJ;
                document.getElementById('OBS').value = item.OBS;
                document.getElementById('CONCLUIDO').value = item.CONCLUIDO;
                document.getElementById('DTAINICIO').value = item.DTAINICIO;
                document.getElementById('DTAFIM').value = item.DTAFIM;
                document.getElementById('HRINI').value = item.HRINI;
                document.getElementById('HRFIM').value = item.HRFIM;
            }).catch(function(error) {
                console.error('Erro ao editar registro:', error);
            });
        }

        // Função para excluir um registro
        function excluirRegistro(codigo) {
            if (confirm("Deseja realmente excluir este registro?")) {
                const sql = `DELETE FROM AD_CALENDINOV WHERE CODIGO = ${codigo}`;
                JX.executar(sql).then(function() {
                    carregarDados();
                    alert("Registro excluído com sucesso!");
                }).catch(function(error) {
                    console.error('Erro ao excluir o registro:', error);
                });
            }
        }

        // Função para salvar ou editar um registro
        document.getElementById('btnSalvar').addEventListener('click', function () {
            const COD_DESENV_PROJ = document.getElementById('COD_DESENV_PROJ').value;
            const CONCLUIDO = document.getElementById('CONCLUIDO').value;
            const OBS = document.getElementById('OBS').value;
            const DTAINICIO = document.getElementById('DTAINICIO').value;
            const DTAFIM = document.getElementById('DTAFIM').value;
            const HRINI = document.getElementById('HRINI').value;
            const HRFIM = document.getElementById('HRFIM').value;
            
            let sql = '';
            if (codigoAtual === null) {
                // Inserir novo registro
                sql = `INSERT INTO AD_CALENDINOV (COD_DESENV_PROJ, CONCLUIDO, OBS, DTAINICIO, DTAFIM, HRINI, HRFIM, USUARIO) 
                       VALUES ('${COD_DESENV_PROJ}', '${CONCLUIDO}', '${OBS}', TO_DATE('${DTAINICIO}', 'DD/MM/YYYY'), 
                       TO_DATE('${DTAFIM}', 'DD/MM/YYYY'), '${HRINI}', '${HRFIM}', 'usuario_logado')`;
            } else {
                // Atualizar registro existente
                sql = `UPDATE AD_CALENDINOV SET COD_DESENV_PROJ = '${COD_DESENV_PROJ}', CONCLUIDO = '${CONCLUIDO}', 
                       OBS = '${OBS}', DTAINICIO = TO_DATE('${DTAINICIO}', 'DD/MM/YYYY'), 
                       DTAFIM = TO_DATE('${DTAFIM}', 'DD/MM/YYYY'), HRINI = '${HRINI}', HRFIM = '${HRFIM}' 
                       WHERE CODIGO = ${codigoAtual}`;
            }
            
            JX.executar(sql).then(function() {
                carregarDados();
                codigoAtual = null;
                document.getElementById("formCadastro").reset();
            }).catch(function(error) {
                console.error('Erro ao salvar dados:', error);
            });
        });

        // Cancelar a operação
        document.getElementById('btnCancelar').addEventListener('click', function () {
            codigoAtual = null;
            document.getElementById("formCadastro").reset();
        });

        // Carregar projetos e dados na tabela
        loadProjetosDropdown();
        carregarDados();
    </script>
</body>
</html>