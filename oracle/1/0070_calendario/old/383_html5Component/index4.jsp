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

        <!-- Formulário para inserir nova descrição -->
        <div class="mb-4">
            <input type="text" id="novaDescricao" class="form-control" placeholder="Digite uma nova descrição" />
            <button id="btnSalvar" class="btn btn-primary mt-2">Salvar</button>
        </div>

        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Ações</th> <!-- Coluna para os botões de ação -->
                </tr>
            </thead>
            <tbody id="resultTable">
                <!-- Os resultados da consulta serão inseridos aqui -->
            </tbody>
        </table>
    </div>

    <!-- Modal para edição da descrição -->
    <div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editModalLabel">Editar Descrição</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <input type="text" id="descricaoEditada" class="form-control" placeholder="Digite a nova descrição" />
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="btnAtualizar">Atualizar</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let codigoAtual = null; // Variável global para armazenar o código do registro que está sendo editado

        // Função para carregar os dados da tabela
        function carregarDados() {
            JX.consultar('SELECT * FROM AD_DADOSTESTE').then(function (data) {
                const resultTable = document.getElementById('resultTable');
                resultTable.innerHTML = ''; // Limpa a tabela antes de inserir novos dados

                // Itera sobre os dados e cria as linhas da tabela
                data.forEach(function (item) {
                    const row = document.createElement('tr');
                    const codigoCell = document.createElement('td');
                    const descricaoCell = document.createElement('td');
                    const acoesCell = document.createElement('td'); // Coluna para os botões de ação

                    codigoCell.textContent = item.CODIGO;      // Supondo que a propriedade se chama 'CODIGO'
                    descricaoCell.textContent = item.DESCRICAO; // Supondo que a propriedade se chama 'DESCRICAO'

                    // Botão de edição
                    const btnEditar = document.createElement('button');
                    btnEditar.textContent = 'Editar';
                    btnEditar.classList.add('btn', 'btn-warning', 'mr-2');
                    btnEditar.addEventListener('click', function () {
                        abrirModalEdicao(item.CODIGO, item.DESCRICAO); // Chama a função para abrir o modal de edição
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
                    row.appendChild(descricaoCell);
                    row.appendChild(acoesCell); // Adiciona o campo de ações na linha
                    resultTable.appendChild(row);
                });
            }).catch(function (error) {
                console.error('Erro ao consultar os dados:', error);
            });
        }

        // Função para excluir um registro
        function excluirRegistro(codigo) {
            const chavesPrimarias = [{ CODIGO: codigo }]; // Define a chave primária do registro a ser excluído
            JX.deletar('AD_DADOSTESTE', chavesPrimarias).then(function () {
                console.log(`Registro com código ${codigo} excluído com sucesso.`);
                carregarDados(); // Recarrega os dados da tabela após a exclusão
            }).catch(function (error) {
                console.error('Erro ao excluir o registro:', error);
            });
        }

        // Função para abrir o modal de edição com os dados do registro
        function abrirModalEdicao(codigo, descricao) {
            codigoAtual = codigo; // Armazena o código do registro atual
            document.getElementById('descricaoEditada').value = descricao; // Preenche o campo com a descrição atual
            $('#editModal').modal('show'); // Abre o modal
        }

        // Função para atualizar o registro
        function atualizarRegistro() {
            const novaDescricao = document.getElementById('descricaoEditada').value;

            if (novaDescricao.trim() === '') {
                alert('Por favor, insira uma descrição válida.');
                return;
            }

            const dados = { DESCRICAO: novaDescricao };
            const chavesPrimarias = { CODIGO: codigoAtual }; // Define a chave primária para o registro

            // Atualiza o registro no banco de dados
            JX.novoSalvar(dados, 'AD_DADOSTESTE', chavesPrimarias).then(function () {
                console.log(`Registro com código ${codigoAtual} atualizado com sucesso.`);
                $('#editModal').modal('hide'); // Fecha o modal após a atualização
                carregarDados(); // Recarrega os dados da tabela após a atualização
            }).catch(function (error) {
                console.error('Erro ao atualizar o registro:', error);
            });
        }

        // Evento para o botão de atualizar no modal
        document.getElementById('btnAtualizar').addEventListener('click', atualizarRegistro);

        // Carrega os dados ao iniciar a página
        carregarDados();

        // Adiciona um listener ao botão de salvar
        document.getElementById('btnSalvar').addEventListener('click', function () {
            const descricao = document.getElementById('novaDescricao').value;

            if (descricao.trim() === '') {
                alert('Por favor, insira uma descrição válida.');
                return;
            }

            // Salva o novo registro na tabela
            JX.salvar({ DESCRICAO: descricao }, 'AD_DADOSTESTE').then(function () {
                console.log('Registro inserido com sucesso.');
                document.getElementById('novaDescricao').value = ''; // Limpa o campo de entrada
                carregarDados(); // Atualiza a tabela para mostrar o novo registro
            }).catch(function (error) {
                console.error('Erro ao inserir o registro:', error);
            });
        });
    </script>

    <!-- Bootstrap Modal e jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>

</html>
