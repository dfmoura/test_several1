<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  
  <style>
  </style>
  <snk:load/>
</head>
<body>

  <!-- Container principal -->
  <div class="container mx-auto px-4 py-8">
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Resumo Material</h1>
      
      <!-- Seção para exibir o parâmetro P_PERIODO_INI -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 class="text-lg font-semibold text-blue-800 mb-2">Parâmetro P_PERIODO_INI:</h2>
        <div id="parametroPeriodoIni" class="text-blue-600 font-mono bg-white px-3 py-2 rounded border">
          Carregando...
        </div>
      </div>
      
      <!-- Seção para exibir todos os parâmetros da URL -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-gray-800 mb-2">Todos os Parâmetros da URL:</h2>
        <div id="todosParametros" class="text-gray-600 font-mono bg-white px-3 py-2 rounded border">
          Carregando...
        </div>
      </div>
    </div>
  </div>

  <script>
    // Função para recuperar parâmetros da URL
    function recuperarParametros() {
      // Objeto contendo a URL da página atual
      const urlSankhya = window.location.search;
      
      // Objeto que resgata todas as propriedades da URL
      const parametros = new URLSearchParams(urlSankhya);
      
      // Resgata o valor do parâmetro P_PERIODO_INI
      const periodoIni = parametros.get("P_PERIODO_INI");
      
      // Exibe o parâmetro P_PERIODO_INI
      const elementoPeriodoIni = document.getElementById("parametroPeriodoIni");
      if (periodoIni) {
        elementoPeriodoIni.textContent = periodoIni;
        elementoPeriodoIni.className = "text-green-600 font-mono bg-white px-3 py-2 rounded border border-green-200";
      } else {
        elementoPeriodoIni.textContent = "Parâmetro P_PERIODO_INI não encontrado na URL";
        elementoPeriodoIni.className = "text-red-600 font-mono bg-white px-3 py-2 rounded border border-red-200";
      }
      
      // Exibe todos os parâmetros da URL
      const elementoTodosParametros = document.getElementById("todosParametros");
      let todosParametrosTexto = "";
      
      // Itera pelos parâmetros de busca
      for (let parametro of parametros) {
        const [chave, valor] = parametro;
        todosParametrosTexto += `${chave}: ${valor}\n`;
      }
      
      if (todosParametrosTexto) {
        elementoTodosParametros.textContent = todosParametrosTexto;
      } else {
        elementoTodosParametros.textContent = "Nenhum parâmetro encontrado na URL";
      }
      
      // Log no console para debug
      console.log("URL atual:", window.location.href);
      console.log("Parâmetros encontrados:", Object.fromEntries(parametros));
      console.log("P_PERIODO_INI:", periodoIni);
    }
    
    // Executa a função quando a página carrega
    document.addEventListener('DOMContentLoaded', recuperarParametros);
  </script>

</body>
</html>