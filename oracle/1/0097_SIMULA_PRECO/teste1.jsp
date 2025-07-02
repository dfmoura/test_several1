<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<fmt:setLocale value="pt_BR"/>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <style>
  </style>
  <snk:load/>
</head>
<body>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-center">Inserir Preço</h2>
      <form id="precoForm" class="space-y-4">
        <div>
          <label for="CODTAB" class="block text-gray-700">CODTAB</label>
          <input type="text" id="CODTAB" name="CODTAB" class="mt-1 block w-full border border-gray-300 rounded px-3 py-2" required />
        </div>
        <div>
          <label for="CODPROD" class="block text-gray-700">CODPROD</label>
          <input type="text" id="CODPROD" name="CODPROD" class="mt-1 block w-full border border-gray-300 rounded px-3 py-2" required />
        </div>
        <div>
          <label for="NOVO_PRECO" class="block text-gray-700">NOVO_PRECO</label>
          <input type="text" id="NOVO_PRECO" name="NOVO_PRECO" class="mt-1 block w-full border border-gray-300 rounded px-3 py-2" required />
        </div>
        <div>
          <label for="DTVIGOR" class="block text-gray-700">DTVIGOR</label>
          <input type="text" id="DTVIGOR" name="DTVIGOR" class="mt-1 block w-full border border-gray-300 rounded px-3 py-2" required />
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Salvar</button>
      </form>
      <div id="message" class="mt-4 text-center"></div>
    </div>
  </div>
  <script>
    document.getElementById('precoForm').addEventListener('submit', async e => {
      e.preventDefault();
  /*
      const data = {
        CODTAB: document.getElementById('CODTAB').value,
        CODPROD: document.getElementById('CODPROD').value,
        NOVO_PRECO: document.getElementById('NOVO_PRECO').value,
        DTVIGOR: document.getElementById('DTVIGOR').value
      };*/

      const dados = {
        ID: "", // ou não colocar esse campo
        CODTAB: "001",
        CODPROD: "1234",
        DTVIGOR: "2025-07-01",
        PRECO: "19.90"
        };

JX.salvar("TESTE_PRECO", dados);      
  
      console.log("Dados a salvar:", data);
  
      try {
        await JX.salvar(data, 'TESTE_PRECO');
        document.getElementById('message').innerHTML = '<span class="text-green-600">Salvo com sucesso!</span>';
        
      } catch (err) {
        console.error("Erro ao salvar:", err);
        document.getElementById('message').innerHTML =
          '<span class="text-red-600">Erro ao salvar: ' + (err.message || err) + '</span>';
      }
    });
  </script>
  
</body>
</html>
