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
    <title>Cadastro de Calendário</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        /* Adiciona um espaçamento entre os campos de data e hora */
        .row-spacing {
            margin-bottom: 15px;
        }
    </style>
    <snk:load />
</head>

<body>

    <div class="container mt-5">
        <h1 class="text-center">Cadastro de Calendário</h1>

        <!-- Formulário para inserir ou editar um registro -->
        <div class="mb-4">
            <form id="formCadastro">
                <div class="form-group">
                    <label for="COD_DESENV_PROJ">Projeto</label>
                    <select id="COD_DESENV_PROJ" class="form-control">
                        <!-- Opções carregadas via JavaScript -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="OBS">Observações</label>
                    <textarea id="OBS" class="form-control" rows="4" placeholder="Digite as observações"></textarea>
                </div>
                <div class="form-group">
                    <label for="CONCLUIDO">Concluído</label>
                    <select id="CONCLUIDO" class="form-control">
                        <option value="S">Sim</option>
                        <option value="N">Não</option>
                    </select>
                </div>

                <!-- Data Início e Data Fim lado a lado -->
                <div class="row row-spacing">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="DTAINICIO">Data Início (dd/mm/yyyy)</label>
                            <input type="text" id="DTAINICIO" class="form-control" placeholder="dd/mm/yyyy">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="DTAFIM">Data Fim (dd/mm/yyyy)</label>
                            <input type="text" id="DTAFIM" class="form-control" placeholder="dd/mm/yyyy">
                        </div>
                    </div>
                </div>

                <!-- Hora Início e Hora Fim lado a lado -->
                <div class="row row-spacing">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="HRINI">Hora Início (hh:mm)</label>
                            <input type="text" id="HRINI" class="form-control" placeholder="hh:mm">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="HRFIM">Hora Fim (hh:mm)</label>
                            <input type="text" id="HRFIM" class="form-control" placeholder="hh:mm">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="USUARIO">Usuário</label>
                    <input type="text" id="USUARIO" class="form-control" readonly>
                </div>
                <button type="button" id="btnSalvar" class="btn btn-primary mt-2">Salvar</button>
            </form>
        </div>

        <!-- Tabela de Exibição dos Dados -->
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
                <!-- Os resultados da consulta serão inseridos aqui -->
            </tbody>
        </table>
    </div>

    <script>
        let codigoAtual = null; // Variável global para armazenar o código do registro que está sendo editado

        // Função para carregar os projetos no dropdown
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

        // Carrega os dados da tabela
        function carregarDados() {
            JX.consultar(
                "SELECT CODIGO, COD_DESENV_PROJ, OBS, CONCLUIDO, TO_CHAR(DTAINICIO,'DD/MM/YYYY') DTAINICIO, TO_CHAR(DTAFIM,'DD/MM/YYYY') DTAFIM, " +
                "CASE WHEN HRINI IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRINI), 1, LENGTH(TO_CHAR(HRINI)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRINI), -2) END HRINI, " +
                "CASE WHEN HRFIM IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRFIM), 1, LENGTH(TO_CHAR(HRFIM)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRFIM), -2) END HRFIM, " +
                "USUARIO FROM AD_CALENDINOV ORDER BY CODIGO DESC"
            ).then(function (data) {
                const resultTable = document.getElementById('resultTable');
                resultTable.innerHTML = ''; // Limpa a tabela antes de inserir novos dados

                data.forEach(function (item) {
                    const row = document.createElement('tr');
                    const codigoCell = document.createElement('td');
                    const projetoCell = document.createElement('td');
                    const obsCell = document.createElement('td');
                    const concluidoCell = document.createElement('td');
                    const dtInicioCell = document.createElement('td');
                    const dtFimCell = document.createElement('td');
                    const hrInicioCell = document.createElement('td');
                    const hrFimCell = document.createElement('td');
                    const acoesCell = document.createElement('td');

                    codigoCell.textContent = item.CODIGO;
                    projetoCell.textContent = item.COD_DESENV_PROJ;
                    obsCell.textContent = item.OBS;
                    concluidoCell.textContent = item.CONCLUIDO;
                    dtInicioCell.textContent = item.DTAINICIO;
                    dtFimCell.textContent = item.DTAFIM;
                    hrInicioCell.textContent = item.HRINI;
                    hrFimCell.textContent = item.HRFIM;

                    // Botão de edição
                    const btnEditar = document.createElement('button');
                    btnEditar.textContent = 'Editar';
                    btnEditar.classList.add('btn', 'btn-warning', 'mr-2');
                    btnEditar.addEventListener('click', function () {
                        editarRegistro(item); // Chama a função de edição
                    });

                    // Botão de exclusão
                    const btnExcluir = document.createElement('button');
                    btnExcluir.textContent = 'Excluir';
                    btnExcluir.classList.add('btn', 'btn-danger');
                    btnExcluir.addEventListener('click', function () {
                        excluirRegistro(item.CODIGO); // Chama a função de exclusão passando o código do item
                    });

                    acoesCell.appendChild(btnEditar);
                    acoesCell.appendChild(btnExcluir);

                    row.appendChild(codigoCell);
                    row.appendChild(projetoCell);
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
        }

        // Função para editar um registro
        function editarRegistro(item) {
            codigoAtual = item.CODIGO; // Salva o código do item que está sendo editado
            document.getElementById('COD_DESENV_PROJ').value = item.COD_DESENV_PROJ;
            document.getElementById('OBS').value = item.OBS;
            document.getElementById('CONCLUIDO').value = item.CONCLUIDO;
            document.getElementById('DTAINICIO').value = item.DTAINICIO;
            document.getElementById('DTAFIM').value = item.DTAFIM;
            document.getElementById('HRINI').value = item.HRINI;
            document.getElementById('HRFIM').value = item.HRFIM;
            document.getElementById('USUARIO').value = item.USUARIO;
            document.getElementById('btnSalvar').textContent = 'Atualizar'; // Altera o texto do botão
        }

        // Função para excluir um registro
        function excluirRegistro(codigo) {
            if (confirm('Tem certeza que deseja excluir este registro?')) {
                JX.deletar('AD_CALENDINOV', [{ CODIGO: codigo }]).then(function () {
                    alert('Registro excluído com sucesso!');
                    carregarDados(); // Recarrega os dados da tabela
                }).catch(function (error) {
                    console.error('Erro ao excluir o registro:', error);
                });
            }
        }

        // Função para salvar ou atualizar um registro
        document.getElementById('btnSalvar').addEventListener('click', function () {
            const formData = {
                COD_DESENV_PROJ: document.getElementById('COD_DESENV_PROJ').value,
                OBS: document.getElementById('OBS').value,
                CONCLUIDO: document.getElementById('CONCLUIDO').value,
                DTAINICIO: document.getElementById('DTAINICIO').value,
                DTAFIM: document.getElementById('DTAFIM').value,
                HRINI: document.getElementById('HRINI').value,
                HRFIM: document.getElementById('HRFIM').value,
                USUARIO: document.getElementById('USUARIO').value,
            };

            if (codigoAtual) {
                // Atualiza o registro
                JX.salvar({
                    COD_DESENV_PROJ: formData.COD_DESENV_PROJ,
                    OBS: formData.OBS,
                    CONCLUIDO: formData.CONCLUIDO,
                    DTAINICIO: formData.DTAINICIO,
                    DTAFIM: formData.DTAFIM,
                    HRINI: formData.HRINI,
                    HRFIM: formData.HRFIM,
                    USUARIO: formData.USUARIO
                }, 'AD_CALENDINOV', { CODIGO: codigoAtual }).then(function () {
                    alert('Registro atualizado com sucesso!');
                    carregarDados(); // Recarrega os dados da tabela
                    resetForm(); // Reseta o formulário
                }).catch(function (error) {
                    console.error('Erro ao atualizar o registro:', error);
                });
            } else {
                // Cria um novo registro
                JX.salvar({
                    COD_DESENV_PROJ: formData.COD_DESENV_PROJ,
                    OBS: formData.OBS,
                    CONCLUIDO: formData.CONCLUIDO,
                    DTAINICIO: formData.DTAINICIO,
                    DTAFIM: formData.DTAFIM,
                    HRINI: formData.HRINI,
                    HRFIM: formData.HRFIM,
                    USUARIO: formData.USUARIO
                }, 'AD_CALENDINOV').then(function () {
                    alert('Novo registro salvo com sucesso!');
                    carregarDados(); // Recarrega os dados da tabela
                    resetForm(); // Reseta o formulário
                }).catch(function (error) {
                    console.error('Erro ao salvar o registro:', error);
                });
            }
        });

        // Função para resetar o formulário
        function resetForm() {
            codigoAtual = null;
            document.getElementById('formCadastro').reset();
            document.getElementById('btnSalvar').textContent = 'Salvar'; // Restaura o botão
        }

        // Carregar os dados ao iniciar a página
        window.onload = function () {
            loadProjetosDropdown(); // Carrega os projetos no dropdown
            carregarDados(); // Carrega os dados da tabela
        };
    </script>

</body>

</html>
