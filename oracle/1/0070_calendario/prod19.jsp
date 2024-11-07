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
    <link href='https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css' rel='stylesheet' />
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js'></script>
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/locales/pt-br.js'></script>
    <script src="jx.js"></script> <!-- Homologação e Debug -->
    <script src="jx.min.js"></script> <!-- Produção -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <title>Calendário Responsivo</title>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        table, th, td {
            border: 1px solid black;
        }

        th, td {
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }
    </style>
    <snk:load/>
</head>
<body>
    <div id="calendar"></div>

    <table id="tabelaCalendario">
        <thead>
            <tr>
                <th>Código Calendário</th>
                <th>Código Produto</th>
                <th>Descrição</th>
                <th>Data Início</th>
                <th>Data Fim</th>
                
                <th>Concluído</th>
            </tr>
        </thead>
        <tbody>
            <!-- Linhas de dados serão inseridas aqui -->
        </tbody>
    </table>

    <script>
        // Consulta ao banco de dados e preenche a tabela
        JX.consultar(`SELECT 
                        cal.codigo AS codcal,
                        cal.cod_desenv_proj,
                        nov.codigo AS codigo,
                        nov.descricao AS descricao,
                        TO_CHAR(cal.dtainicio, 'YYYY-MM-DD') AS dtainicio,
                        TO_CHAR(cal.dtafim, 'YYYY-MM-DD') AS dtafim,
                        
                        cal.concluido
                      FROM AD_CALENDINOV cal
                      INNER JOIN AD_NOVOSPRODUTOS nov 
                        ON cal.cod_desenv_proj = nov.nrounico`)
        .then((result) => {
            // Verificando se o resultado da consulta está disponível
            if (result && result.length > 0) {
                // Acessa o corpo da tabela
                const tbody = document.querySelector("#tabelaCalendario tbody");

                // Para cada item no resultado, cria uma linha da tabela
                result.forEach(row => {
                    const tr = document.createElement("tr");

                    // Adiciona cada célula com o dado correto
                    tr.innerHTML = `
                        <td>${row.codcal}</td>
                        <td>${row.codigo}</td>
                        <td>${row.descricao}</td>
                        <td>${row.dtainicio}</td>
                        <td>${row.dtafim}</td>
                        
                        <td>${row.concluido}</td>
                    `;

                    // Adiciona a linha na tabela
                    tbody.appendChild(tr);
                });
            } else {
                alert('Nenhum dado encontrado!');
            }
        }).catch((error) => {
            console.error('Erro ao consultar o banco:', error);
            alert('Erro ao consultar dados!');
        });
    </script>
</body>
</html>
