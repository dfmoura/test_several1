<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="br.com.sankhya.modelcore.auth.AuthenticationInfo" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela com Consultas SQL</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load />

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th, td {
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #4CAF50;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .loading {
            text-align: center;
            margin-top: 20px;
            font-size: 18px;
        }
        select {
            font-size: 16px;
            padding: 8px;
            margin-top: 20px;
        }
    </style>
</head>
<body>

    <h1>TESTE</h1>

    <!-- Dropdown -->
    <label for="usuarioSelect">Selecione um Usuário:</label>
    <select id="usuarioSelect" onchange="atualizarTabela()">
        <option value="">Carregando...</option> <!-- Placeholder -->
    </select>

    <!-- Tabela de Resultados -->
    <div id="tabelaContainer">
        <table id="tabelaUsuarios">
            <thead>
                <tr>
                    <th>Código do Usuário</th>
                    <th>Nome do Usuário</th>
                    <th>Gestor</th>
                </tr>
            </thead>
            <tbody>
                <!-- Linhas de resultados da consulta -->
            </tbody>
        </table>
    </div>

    <script>
        var idUsuario = '<%= ((AuthenticationInfo) session.getAttribute ("usuarioLogado")).getUserID ().toString () %>';

        // Função para preencher o dropdown
        function carregarDropdown() {
            JX.consultar(`
                SELECT 
                    USU.CODUSU AS VALUE,
                    USU.CODUSU || '-' || USU.NOMEUSU AS LABEL
                FROM TSIUSU USU
                WHERE USU.AD_GESTORUSU = ` + idUsuario + `
                OR USU.CODUSU = ` + idUsuario
            ).then(usuariosRetornados => {
                var select = document.getElementById('usuarioSelect');
                select.innerHTML = ''; // Limpar o dropdown

                // Adicionar uma opção vazia
                select.innerHTML = '<option value="">Selecione...</option>';

                // Preencher o dropdown com os usuários retornados
                usuariosRetornados.forEach(usuario => {
                    var option = document.createElement('option');
                    option.value = usuario.VALUE;
                    option.textContent = usuario.LABEL;
                    select.appendChild(option);
                });
            }).catch(error => {
                console.error('Erro ao carregar os usuários:', error);
            });
        }

        // Função para atualizar a tabela com base no usuário selecionado
        function atualizarTabela() {
            var select = document.getElementById('usuarioSelect');
            var usuarioSelecionado = select.value;

            // Verificar se foi selecionado um usuário
            if (usuarioSelecionado) {
                var codigoUsuario = parseInt(usuarioSelecionado.split('-')[0]); // Extrair e converter para número

                // Realizar a consulta SQL com o código do usuário selecionado
                JX.consultar(`
                    SELECT 
                        USU.CODUSU,
                        USU.NOMEUSU,
                        USU.AD_GESTORUSU
                    FROM TSIUSU USU
                    WHERE USU.CODUSU = ` + codigoUsuario
                ).then(resultados => {
                    var tabelaBody = document.getElementById('tabelaUsuarios').getElementsByTagName('tbody')[0];
                    tabelaBody.innerHTML = ''; // Limpar tabela

                    // Preencher a tabela com os resultados
                    resultados.forEach(resultado => {
                        var tr = document.createElement('tr');
                        var tdCodUsu = document.createElement('td');
                        tdCodUsu.textContent = resultado.CODUSU;
                        var tdNomeUsu = document.createElement('td');
                        tdNomeUsu.textContent = resultado.NOMEUSU;
                        var tdGestor = document.createElement('td');
                        tdGestor.textContent = resultado.AD_GESTORUSU ? 'Sim' : 'Não';

                        tr.appendChild(tdCodUsu);
                        tr.appendChild(tdNomeUsu);
                        tr.appendChild(tdGestor);
                        tabelaBody.appendChild(tr);
                    });
                }).catch(error => {
                    console.error('Erro ao carregar dados da tabela:', error);
                });
            }
        }

        // Carregar o dropdown ao carregar a página
        carregarDropdown();
    </script>

</body>
</html>
