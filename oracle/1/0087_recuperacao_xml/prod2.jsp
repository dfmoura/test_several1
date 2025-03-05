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
    <title>Extrair Dados XML</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="jx.min.js"></script> <!-- Produção -->

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        h1 {
            text-align: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        tr:hover {
            background-color: #ddd;
        }
    </style>

    <script>
        function carregarDadosNFe() {
            console.log("Função carregarDadosNFe chamada.");
            
            jx.consultar({
                comando: "SELECT 'teste' xml from dual",
                callback: function(dados) {
                    console.log("Dados recebidos:", dados);
                    
                    let tabela = document.getElementById("nfeTableBody");
                    tabela.innerHTML = "";
                    
                    if (dados && dados.length > 0) {
                        dados.forEach(function(item) {
                            let linha = document.createElement("tr");
                            let coluna = document.createElement("td");
                            coluna.textContent = item.XML;
                            linha.appendChild(coluna);
                            tabela.appendChild(linha);
                        });
                    } else {
                        console.log("Nenhum dado recebido.");
                        tabela.innerHTML = "<tr><td>Nenhum dado encontrado.</td></tr>";
                    }
                },
                erro: function(erro) {
                    console.error("Erro ao carregar os dados: ", erro);
                }
            });
        }
        
        document.addEventListener("DOMContentLoaded", carregarDadosNFe);
    </script>
    <snk:load/>
</head>
<body>
    <h1>Dados da NFe</h1>
    <table id="nfeTable">
        <thead>
            <tr>
                <th>XML</th>
            </tr>
        </thead>
        <tbody id="nfeTableBody">
            <tr>
                <td>Carregando...</td>
            </tr>
        </tbody>
    </table>
</body>
</html>