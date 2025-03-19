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

        <div class="mb-4">
            <form id="formCadastro">
                <div class="row row-spacing">
                    <div class="col-md-8">
                        <div class="form-group">
                            <label for="TAREFA">Tarefa</label>
                            <input type="text" id="TAREFA" class="form-control" placeholder="Digite a Tarefa">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="CONCLUIDO">Concluído</label>
                            <select id="CONCLUIDO" class="form-control">
                                <option value="S">Sim</option>
                                <option value="N" selected>Não</option>
                            </select>
                        </div>            
                    </div>
                </div>
                <div class="form-group">
                    <label for="OBS">Observações</label>
                    <textarea id="OBS" class="form-control" rows="4" placeholder="Digite as observações"></textarea>
                </div>

                <div class="row row-spacing">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="DTAINICIO">Data Início</label>
                            <input type="date" id="DTAINICIO" class="form-control" placeholder="dd/mm/yyyy">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="DTAFIM">Data Fim</label>
                            <input type="date" id="DTAFIM" class="form-control" placeholder="dd/mm/yyyy">
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRINI">Hora Início</label>
                            <input type="text" id="HRINI" class="form-control" placeholder="digitar hhmm">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRFIM">Hora Fim</label>
                            <input type="text" id="HRFIM" class="form-control" placeholder="digitar hhmm">
                        </div>
                    </div>
                </div>
                <div class="row row-spacing">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="USUARIO">Usuário</label>
                            <select id="USUARIO" class="form-control">
                                <!-- Options will be populated dynamically -->
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="CORFUNDO">Cor Fundo</label>
                            <input type="color" id="CORFUNDO" class="form-control" value="#FFFFFF">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="CORFONTE">Cor Fonte</label>
                            <input type="color" id="CORFONTE" class="form-control" value="#FFFFFF">
                        </div>
                    </div>
                </div>
                <button type="button" id="btnSalvar" class="btn btn-primary mt-2">Salvar</button>
                <button type="button" id="btnCancelar" class="btn btn-secondary mt-2 ml-2">Cancelar</button>
            </form>
        </div>

        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Tarefa</th>
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

        function carregarDados() {
            JX.consultar(
                `SELECT CODIGO, TAREFA, OBS, CONCLUIDO, TO_CHAR(DTAINICIO,'DD/MM/YYYY') DTAINICIO, TO_CHAR(DTAFIM,'DD/MM/YYYY') DTAFIM,
                CASE WHEN HRINI IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRINI), 1, LENGTH(TO_CHAR(HRINI)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRINI), -2) END HRINI,
                CASE WHEN HRFIM IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRFIM), 1, LENGTH(TO_CHAR(HRFIM)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRFIM), -2) END HRFIM,
                USUARIO,CORFUNDO,CORFONTE FROM AD_CALENDINOV 

                ORDER BY CODIGO DESC`
            ).then(function (data) {
                const resultTable = document.getElementById('resultTable');
                resultTable.innerHTML = '';

                data.forEach(function (item) {
                    const row = document.createElement('tr');
                    const codigoCell = document.createElement('td');
                    const tarefaCell = document.createElement('td');
                    const obsCell = document.createElement('td');
                    const concluidoCell = document.createElement('td');
                    const dtInicioCell = document.createElement('td');
                    const dtFimCell = document.createElement('td');
                    const hrInicioCell = document.createElement('td');
                    const hrFimCell = document.createElement('td');
                    const acoesCell = document.createElement('td');

                    codigoCell.textContent = item.CODIGO;
                    tarefaCell.textContent = item.TAREFA;
                    obsCell.textContent = item.OBS;
                    concluidoCell.textContent = item.CONCLUIDO;
                    dtInicioCell.textContent = item.DTAINICIO;
                    dtFimCell.textContent = item.DTAFIM;
                    hrInicioCell.textContent = item.HRINI;
                    hrFimCell.textContent = item.HRFIM;

                    const btnEditar = document.createElement('button');
                    btnEditar.textContent = 'Editar';
                    btnEditar.classList.add('btn', 'btn-warning', 'mr-2');
                    btnEditar.addEventListener('click', function () {
                        editarRegistro(item);
                    });

                    const btnExcluir = document.createElement('button');
                    btnExcluir.innerHTML = '<i class="fas fa-trash"></i>';
                    btnExcluir.classList.add('btn', 'btn-danger');
                    btnExcluir.addEventListener('click', function () {
                        excluirRegistro(item.CODIGO);
                    });

                    acoesCell.appendChild(btnEditar);
                    acoesCell.appendChild(btnExcluir);

                    row.appendChild(codigoCell);
                    row.appendChild(tarefaCell);
                    row.appendChild(obsCell);
                    row.appendChild(concluidoCell);
                    row.appendChild(dtInicioCell);
                    row.appendChild(dtFimCell);
                    row.appendChild(hrInicioCell);
                    row.appendChild(hrFimCell);
                    row.appendChild(acoesCell);

                    resultTable.appendChild(row);
                });
            }).catch(function (error) {
                console.error('Erro ao carregar os dados:', error);
            });

            // Fetch users for the dropdown
            JX.consultar(`SELECT CODUSU, NOMEUSU FROM TSIUSU WHERE DTLIMACESSO IS NULL ORDER BY CODUSU`).then(function (users) {
                const usuarioSelect = document.getElementById('USUARIO');
                usuarioSelect.innerHTML = ''; // Clear existing options
                users.forEach(function (user) {
                    const option = document.createElement('option');
                    option.value = user.CODUSU;
                    option.textContent = user.NOMEUSU;
                    usuarioSelect.appendChild(option);
                });
            }).catch(function (error) {
                console.error('Erro ao carregar os usuários:', error);
            });
        }

        function editarRegistro(item) {
            codigoAtual = item.CODIGO;
            document.getElementById('TAREFA').value = item.TAREFA;
            document.getElementById('OBS').value = item.OBS;
            document.getElementById('CONCLUIDO').value = item.CONCLUIDO;
            document.getElementById('DTAINICIO').value = item.DTAINICIO;
            document.getElementById('DTAFIM').value = item.DTAFIM;
            document.getElementById('HRINI').value = item.HRINI;
            document.getElementById('HRFIM').value = item.HRFIM;
            document.getElementById('USUARIO').value = item.USUARIO;
            document.getElementById('btnSalvar').textContent = 'Atualizar';
        }

        function excluirRegistro(codigo) {
            if (confirm('Tem certeza que deseja excluir este registro?')) {
                JX.deletar('AD_CALENDINOV', [{ CODIGO: codigo }]).then(function () {
                    alert('Registro excluído com sucesso!');
                    carregarDados();
                }).catch(function (error) {
                    console.error('Erro ao excluir o registro:', error);
                });
            }
        }

        document.getElementById('btnSalvar').addEventListener('click', function () {
            const formData = {
                TAREFA: document.getElementById('TAREFA').value,
                OBS: document.getElementById('OBS').value,
                CONCLUIDO: document.getElementById('CONCLUIDO').value,
                DTAINICIO: document.getElementById('DTAINICIO').value,
                DTAFIM: document.getElementById('DTAFIM').value,
                HRINI: document.getElementById('HRINI').value,
                HRFIM: document.getElementById('HRFIM').value,
                USUARIO: document.getElementById('USUARIO').value,
                CORFUNDO: document.getElementById('CORFUNDO').value,
                CORFONTE: document.getElementById('CORFONTE').value,
            };

            if (codigoAtual) {
                JX.salvar(formData, 'AD_CALENDINOV', { CODIGO: codigoAtual }).then(function () {
                    alert('Registro atualizado com sucesso!');
                    carregarDados();
                    resetForm();
                }).catch(function (error) {
                    console.error('Erro ao atualizar o registro:', error);
                });
            } else {
                JX.salvar(formData, 'AD_CALENDINOV').then(function () {
                    alert('Novo registro salvo com sucesso!');
                    carregarDados();
                    resetForm();
                }).catch(function (error) {
                    console.error('Erro ao salvar o registro:', error);
                });
            }
        });

        function resetForm() {
            codigoAtual = null;
            document.getElementById('formCadastro').reset();
            document.getElementById('btnSalvar').textContent = 'Salvar';
            // Retain the selected colors
            // Removed resetting to default colors
            // document.getElementById('CORFUNDO').value = '#008000'; // Default color or previously selected color
            // document.getElementById('CORFONTE').value = '#FFFFFF'; // Default color or previously selected color
        }

        carregarDados();
    </script>
</body>

</html>
