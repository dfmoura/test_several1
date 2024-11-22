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
    <title>Tabela com SankhyaJX</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load />
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <h1>Tabela de Produtos - Grupo: <span id="grupo-produto"></span></h1>
    <table id="tabela-produtos">
        <thead>
            <tr>
                <th>Código do Produto</th>
                <th>Descrição do Produto</th>
                <th>Código do Grupo</th>
            </tr>
        </thead>
        <tbody>
            <!-- Os dados serão inseridos aqui dinamicamente -->
        </tbody>
    </table>

    <script>
	
        // Função para obter o código do grupo da URL ou do localStorage
        function obterCodigoGrupo() {
            const codGrupo = localStorage.getItem('A_CODGRUPO');
            if (codGrupo) {
                return parseInt(codGrupo, 10); // Garante que seja um número inteiro
            } else {
                return null;
            }
        }	
	
        // Obtém o código do grupo e executa a filtragem
        const codGrupo = obterCodigoGrupo();

        if (codGrupo) {
            document.getElementById('grupo-produto').textContent = codGrupo;
            //filtrarDadosPorGrupo(codGrupo);
        } else {
            document.getElementById('grupo-produto').textContent = "não especificado";
            console.error("Código do grupo não especificado ou inválido.");
        }
	
        // Realizando a consulta ao banco de dados
		const sql = `select CODPROD, DESCRPROD, CODGRUPOPROD from tgfpro where CODGRUPOPROD = ` + codGrupo ;
		
        JX.consultar(sql)
        .then(data => {
            // Seleciona o corpo da tabela
            const tabelaBody = document.querySelector("#tabela-produtos tbody");

            // Itera pelos dados retornados da consulta
            data.forEach(row => {
                // Cria uma nova linha na tabela
                const novaLinha = document.createElement("tr");

                // Cria células e insere os dados
                const celulaCodigo = document.createElement("td");
                celulaCodigo.textContent = row.CODPROD;

                const celulaDescricao = document.createElement("td");
                celulaDescricao.textContent = row.DESCRPROD;

                const celulaCodigoGru = document.createElement("td");
                celulaCodigoGru.textContent = row.CODGRUPOPROD;

                // Adiciona as células na linha
                novaLinha.appendChild(celulaCodigo);
                novaLinha.appendChild(celulaDescricao);
                novaLinha.appendChild(celulaCodigoGru);

                // Adiciona a linha no corpo da tabela
                tabelaBody.appendChild(novaLinha);
            });
        })
        .catch(error => {
            console.error("Erro ao consultar os dados:", error);
        });
    </script>
</body>
</html>