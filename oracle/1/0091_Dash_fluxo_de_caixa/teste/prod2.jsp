<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8"  isELIgnored ="false"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Detalhamento</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css" />
  <style>
    :root {
      --font-title: 1.5rem;
      --font-body: 1rem;
    }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    body {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      box-sizing: border-box;
    }

    h1 {
      text-align: center;
      margin-bottom: 1rem;
      font-size: var(--font-title);
    }

    #search-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    #quick-search {
      flex: 1;
      min-width: 250px;
      padding: 0.5rem;
      font-size: 1rem;
      margin-right: 1rem;
    }

    #export-btn {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
    }

    #wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .gridjs-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      font-size: var(--font-body);
    }

    .gridjs-wrapper {
      flex: 1;
      overflow: auto !important;
      max-height: none !important;
    }

    .gridjs-footer {
      flex-shrink: 0;
    }

    .gridjs-search {
      display: none !important;
    }

    #font-controls {
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 0.5rem;
      border-radius: 5px;
      z-index: 999;
    }

    #font-controls button {
      background: #fff;
      color: #000;
      margin: 0 5px;
      border: none;
      cursor: pointer;
      padding: 5px 10px;
    }
  </style>
</head>
<body>
<snk:query var="base">
    SELECT 
      ANO, MES, MES_ANO, DESCRNAT, DTNEG, ORIGEM, NUFIN,
      CODPARC, NOMEPARC, CODPROJ, DTVENC, VLRDESDO, RECDESP,
      TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
      NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
    FROM VW_FIN_RESUMO_SATIS
    WHERE RECDESP = 1
      AND PROVISAO = 'N'
      AND DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
</snk:query>

  
  <h1>Detalhamento</h1>

  <div id="search-container">
    <input type="text" id="quick-search" placeholder="Filtro rápido (use || para filtrar vários termos)..." />
    <button id="export-btn">Exportar para Excel</button>
  </div>

  <div id="wrapper">
    <div id="tabela"></div>
  </div>

  <div id="font-controls">
    Tamanho Fonte: 
    <button onclick="alterarFonte('menor')">A-</button>
    <button onclick="alterarFonte('maior')">A+</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gridjs/dist/gridjs.umd.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script>
    const colunas = [
      "ANO", "MES", "MES_ANO", "DESCRNAT", "DTNEG", "ORIGEM", "NUFIN",
      "CODPARC", "NOMEPARC", "CODPROJ", "DTVENC", "VLRDESDO", "RECDESP",
      "VLRBAIXA", "CODNAT", "PROVISAO", "CONTA_BAIXA", "NOME_CONTA_BAIXA",
      "FINANCEIRO", "VLRLIQUIDO", "TIPO", "MULTIPLICACAO_RECEITA_ANTERIOR"
    ];

  const dados = [
    <c:forEach var="row" items="${base.rows}">
      [
        "${row.ANO}", "${row.MES}", "${row.MES_ANO}", "${row.DESCRNAT}", "${row.DTNEG}", "${row.ORIGEM}",
        "${row.NUFIN}", "${row.CODPARC}", "${row.NOMEPARC}", "${row.CODPROJ}", "${row.DTVENC}",
        ${row.VLRDESDO}, "${row.RECDESP}", ${row.VLRBAIXA_CALC}, "${row.CODNAT}", "${row.PROVISAO}",
        "${row.CONTA_BAIXA}", "${row.NOME_CONTA_BAIXA}", "${row.FINANCEIRO}", ${row.VLRLIQUIDO},
        "${row.TIPO}", ${row.MULTIPLICACAO_RECEITA_ANTERIOR}
      ]<c:if test="${!rowStatus.last}">,</c:if>
    </c:forEach>
  ];

    let dadosFiltrados = [...dados];

    const grid = new gridjs.Grid({
      columns: colunas.map(c => ({
        name: c,
        id: c,
        formatter: (cell) => cell,
        resizable: true
      })),
      data: () => dadosFiltrados,
      search: false,
      sort: true,
      pagination: {
        limit: 10
      },
      fixedHeader: true,
      height: "100%"
    }).render(document.getElementById("tabela"));

    document.getElementById("quick-search").addEventListener("input", function (e) {
      const termos = e.target.value.toLowerCase().split("||").map(s => s.trim()).filter(Boolean);
      dadosFiltrados = dados.filter(linha =>
        termos.every(termo => linha.some(cell => cell.toString().toLowerCase().includes(termo)))
      );
      grid.updateConfig({ data: () => dadosFiltrados }).forceRender();
    });

    document.getElementById("export-btn").addEventListener("click", function () {
      const ws_data = [colunas, ...dadosFiltrados];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalhamento");
      XLSX.writeFile(wb, "detalhamento_filtrado.xlsx");
    });

    function alterarFonte(acao) {
      const root = document.documentElement;
      const atualBody = parseFloat(getComputedStyle(root).getPropertyValue('--font-body') || '1');
      const atualTitle = parseFloat(getComputedStyle(root).getPropertyValue('--font-title') || '1.5');
      if (acao === 'maior') {
        root.style.setProperty('--font-body', (atualBody + 0.1) + 'rem');
        root.style.setProperty('--font-title', (atualTitle + 0.1) + 'rem');
      } else {
        root.style.setProperty('--font-body', Math.max(0.5, atualBody - 0.1) + 'rem');
        root.style.setProperty('--font-title', Math.max(0.5, atualTitle - 0.1) + 'rem');
      }
    }
  </script>
</body>
</html>
