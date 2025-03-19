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
            td {
                cursor: pointer;
                color: blue;
            }
            td:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <h1>Tabela de Grupos de Produtos</h1>
        <table id="tabela-grupos">
            <thead>
                <tr>
                    <th>Código do Grupo</th>
                    <th>Descrição do Grupo</th>
                </tr>
            </thead>
            <tbody>
                <!-- Os dados serão inseridos aqui dinamicamente -->
            </tbody>
        </table>
    
        <script>
            // Função para abrir a página com o código do grupo
            function abrir(codgrupo) {
                const params = { 'A_CODGRUPO': parseInt(codgrupo) };
                localStorage.setItem('A_CODGRUPO', params.A_CODGRUPO);
                const level = 'lvl_u0b9rx';
                alert(codgrupo);
                openLevel(level, params); // Função openLevel deve estar definida no contexto do sistema
            }
    
            // Realizando a consulta ao banco de dados
            JX.consultar("SELECT CODGRUPOPROD, DESCRGRUPOPROD FROM TGFGRU WHERE ANALITICO = 'S'")
            .then(data => {
                // Seleciona o corpo da tabela
                const tabelaBody = document.querySelector("#tabela-grupos tbody");
    
                // Itera pelos dados retornados da consulta
                data.forEach(row => {
                    // Cria uma nova linha na tabela
                    const novaLinha = document.createElement("tr");
    
                    // Cria célula para o código e adiciona evento de clique
                    const celulaCodigo = document.createElement("td");
                    celulaCodigo.textContent = row.CODGRUPOPROD;
                    celulaCodigo.onclick = () => abrir(row.CODGRUPOPROD); // Chama a função abrir ao clicar
    
                    // Cria célula para a descrição
                    const celulaDescricao = document.createElement("td");
                    celulaDescricao.textContent = row.DESCRGRUPOPROD;
    
                    // Adiciona as células na linha
                    novaLinha.appendChild(celulaCodigo);
                    novaLinha.appendChild(celulaDescricao);
    
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
    