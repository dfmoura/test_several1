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
  <title>Tabela de Dados</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js">
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  
  <style>
    /* Estilo básico para a tabela */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    table, th, td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    th {
      background-color: #f2f2f2;
      text-align: left;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
  </style>
  <snk:load/>
</head>
<body>
  
  <h1>Dados do Projeto</h1>
  <table id="tabelaDados">
    <thead>
      <tr>
        <th>Código Calendário</th>
        <th>Código Projeto</th>
        <th>Código Produto</th>
        <th>Descrição</th>
        <th>Data Início</th>
        <th>Data Fim</th>
        <th>Observação</th>
        <th>Concluído</th>
      </tr>
    </thead>
    <tbody>
      <!-- Os dados serão inseridos aqui via JavaScript -->
    </tbody>
  </table>

  <script>
    // Função para carregar os dados e preencher a tabela
    function carregarDados() {
      // Query SQL fornecida
      const query = `
        SELECT 
          cal.codigo AS codcal,
          cal.cod_desenv_proj,
          nov.codigo,
          nov.descricao,
          cal.dtainicio,
          cal.dtafim,
          cal.obs,
          cal.concluido
        FROM AD_CALENDINOV cal
        INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
      `;

      // Realiza a consulta usando SankhyaJX e preenche a tabela
      JX.consultar(query).then((resultados) => {
        console.log("Resultados da consulta:", resultados); // Verificar os dados retornados
        const tabelaBody = document.getElementById("tabelaDados").getElementsByTagName("tbody")[0];
        tabelaBody.innerHTML = ""; // Limpa o conteúdo atual

        resultados.forEach((linha) => {
          console.log("Linha individual:", linha); // Verificar cada linha
          const novaLinha = document.createElement("tr");
          novaLinha.innerHTML = `
            <td>${linha.codcal}</td>
            <td>${linha.cod_desenv_proj}</td>
            <td>${linha.codigo}</td>
            <td>${linha.descricao}</td>
            <td>${linha.dtainicio}</td>
            <td>${linha.dtafim}</td>
            <td>${linha.obs}</td>
            <td>${linha.concluido}</td>
          `;
          tabelaBody.appendChild(novaLinha);
        });
      }).catch((erro) => {
        console.error("Erro ao consultar dados:", erro);
      });
    }

    // Chama a função ao carregar a página
    document.addEventListener("DOMContentLoaded", carregarDados);
  </script>
</body>
</html>
