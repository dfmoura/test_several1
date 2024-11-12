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
        /* Adicione aqui estilos personalizados se necessário */
    </style>
    <snk:load />
</head>

<body>

    <div class="container mt-5">
        <h1 class="text-center">Cadastro de Calendário</h1>

        <!-- Formulário para inserir novo registro -->
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
                <div class="form-group">
                    <label for="DTAINICIO">Data Início (dd/mm/yyyy)</label>
                    <input type="text" id="DTAINICIO" class="form-control" placeholder="dd/mm/yyyy">
                </div>
                <div class="form-group">
                    <label for="DTAFIM">Data Fim (dd/mm/yyyy)</label>
                    <input type="text" id="DTAFIM" class="form-control" placeholder="dd/mm/yyyy">
                </div>
                <div class="form-group">
                    <label for="HRINI">Hora Início (hh:mm)</label>
                    <input type="text" id="HRINI" class="form-control" placeholder="hh:mm">
                </div>
                <div class="form-group">
                    <label for="HRFIM">Hora Fim (hh:mm)</label>
                    <input type="text" id="HRFIM" class="form-control" placeholder="hh:mm">
                </div>
                <div class="form-group">
                    <label for="USUARIO">Usuário</label>
                    <input type="text" id="USUARIO" class="form-control" readonly>
                </div>
                <button type="button" id="btnSalvar" class="btn btn-primary mt-2">Salvar</button>
            </form>
        </div>

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

        // Função para carregar os dados da tabela
        function carregarDados() {
            JX.consultar(`
            SELECT 
            CODIGO,
            COD_DESENV_PROJ,
            OBS,CONCLUIDO,
            TO_CHAR(DTAINICIO,'DD/MM/YYYY')DTAINICIO,
            TO_CHAR(DTAFIM,'DD/MM/YYYY')DTAFIM,
            CASE WHEN HRINI IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRINI), 1, LENGTH(TO_CHAR(HRINI)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRINI), -2) END HRINI,
            CASE WHEN HRFIM IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRFIM), 1, LENGTH(TO_CHAR(HRFIM)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRFIM), -2) END HRFIM,
            USUARIO 
            FROM AD_CALENDINOV ORDER BY CODIGO DESC
            `).then(function (data) {
                const resultTable = document.getElementById('resultTable');
                resultTable.innerHTML = ''; // Limpa a tabela antes de inserir novos dados

                // Itera sobre os dados e cria as linhas da tabela
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
                        abrirModalEdicao(item);
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
                console.error('Erro ao consultar os dados:', error);
            });
        }

        // Função para excluir um registro
        function excluirRegistro(codigo) {
            const chavesPrimarias = [{ CODIGO: codigo }];
            JX.deletar('AD_CALENDINOV', chavesPrimarias).then(function () {
                console.log(`Registro com código ${codigo} excluído com sucesso.`);
                carregarDados(); // Recarrega os dados da tabela após a exclusão
            }).catch(function (error) {
                console.error('Erro ao excluir o registro:', error);
            });
        }


        // Função para salvar o novo registro
        document.getElementById('btnSalvar').addEventListener('click', function () {
            // Pergunta ao usuário se ele tem certeza de que deseja salvar
            const confirmSave = confirm("Tem certeza que deseja salvar este novo registro?");
            if (confirmSave) {
                const dados = {
                    COD_DESENV_PROJ: document.getElementById('COD_DESENV_PROJ').value,
                    OBS: document.getElementById('OBS').value,
                    CONCLUIDO: document.getElementById('CONCLUIDO').value,
                    DTAINICIO: document.getElementById('DTAINICIO').value,
                    DTAFIM: document.getElementById('DTAFIM').value,
                    HRINI: document.getElementById('HRINI').value.replace(":", ""),
                    HRFIM: document.getElementById('HRFIM').value.replace(":", ""),
                    USUARIO: document.getElementById('USUARIO').value,
                };

                // Salva o novo registro
                JX.salvar(dados, 'AD_CALENDINOV').then(function () {
                    console.log('Registro inserido com sucesso.');
                    carregarDados(); // Atualiza a tabela após salvar

                    // Limpa o formulário após salvar
                    document.getElementById('formCadastro').reset();
                }).catch(function (error) {
                    console.error('Erro ao inserir o registro:', error);
                });
            }
        });

        // Carrega os projetos no dropdown
        async function loadProjetosDropdown() {
            const projetos = await JX.consultar(`SELECT NROUNICO, DESCRICAO FROM AD_NOVOSPRODUTOS`);
            const dropdown = document.getElementById("COD_DESENV_PROJ");
            projetos.forEach(proj => {
                const option = document.createElement("option");
                option.value = proj.NROUNICO;
                option.text = proj.DESCRICAO;
                dropdown.appendChild(option);
            });
        }

        loadProjetosDropdown(); // Carrega os projetos ao iniciar a página
        carregarDados(); // Carrega os dados ao iniciar a página
    </script>

    <!-- Bootstrap Modal e jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>

</html>
