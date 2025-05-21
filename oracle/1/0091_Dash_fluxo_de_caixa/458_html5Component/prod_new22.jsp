<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resumo Financeiro</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css" />

  <style>
    :root {
      --font-title: 1.5rem;
      --font-body: 0.65rem;
    }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: Arial, sans-serif;
    }

    body {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      background-color: #f9f9f9;
    }

    h1 {
      text-align: center;
      font-size: var(--font-title);
      margin-bottom: 2rem;
    }

    #export-btn {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    #export-btn:hover {
      background-color: #1565c0;
    }

    #wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.8rem;
      font-size: 0.7rem;
    }

    .filter-group {
      flex: 1;
      min-width: 120px;
    }

    .filter-group select {
      width: 100%;
      font-size: 0.7rem;
      padding: 2px 4px;
    }

    .gridjs-container {
      font-size: var(--font-body);
    }

    .gridjs-wrapper {
      overflow: auto !important;
      max-height: 500px;
    }

    .gridjs-td {
      padding: 2px 6px !important;
      white-space: nowrap;
    }

    .gridjs-th {
      white-space: nowrap;
    }

    #font-controls {
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 0.5rem;
      border-radius: 5px;
      font-size: 0.75rem;
      z-index: 999;
    }

    #font-controls button {
      background: #fff;
      color: #000;
      margin: 0 4px;
      padding: 3px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>

  <snk:load />
</head>
<body>
  <h1>Detalhamento - Receitas Baixadas no Período</h1>

  <button id="export-btn">Exportar</button>
  <div id="filters"></div>
  <div id="wrapper">
    <div id="tabela"></div>
  </div>

  <div id="font-controls">
    Tamanho Fonte:
    <button onclick="alterarFonte('menor')">A-</button>
    <button onclick="alterarFonte('maior')">A+</button>
  </div>

  <snk:query var="receita_baixada">
    SELECT 
      ANO, MES, MES_ANO, DESCRNAT, TO_CHAR(DTNEG,'DD/MM/YYYY') DTNEG, ORIGEM, NUFIN,
      CODPARC, NOMEPARC, CODPROJ, TO_CHAR(DTVENC,'DD/MM/YYYY') DTVENC, VLRDESDO, RECDESP,
      TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
      NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
    FROM VW_FIN_RESUMO_SATIS
    WHERE RECDESP = 1 AND PROVISAO = 'N' AND DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
  </snk:query>

  <script src="https://cdn.jsdelivr.net/npm/gridjs/dist/gridjs.umd.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

  <script>
    const colunas = [
      "Mês/Ano", "Cód. Nat.", "Descr. Nat.", "Dt. Neg.", "Ori.", "NÚ.Fin.",
      "Cód. Parc.", "Parceiro", "Cód. Proj.", "Dt. Venc.", "Vlr. Desdob.", "Rec/Desp",
      "TP", "Vlr. Baixa", "Provisão", "Conta Baixa",
      "N. Conta Baixa", "Financeiro", "Vlr. Liq."
    ];

    const dados = [
      <c:forEach var="row" items="${receita_baixada.rows}" varStatus="rowStatus">
        [
          "${row.MES_ANO}", "${row.CODNAT}", "${row.DESCRNAT}", "${row.DTNEG}", "${row.ORIGEM}", "${row.NUFIN}",
          "${row.CODPARC}", "${row.NOMEPARC}", "${row.CODPROJ}", "${row.DTVENC}", "${row.VLRDESDO}", "${row.RECDESP}",
          "${row.TIPO}", "${row.VLRBAIXA_CALC}", "${row.PROVISAO}", "${row.CONTA_BAIXA}",
          "${row.NOME_CONTA_BAIXA}", "${row.FINANCEIRO}", "${row.VLRLIQUIDO}"
        ]<c:if test="${!rowStatus.last}">,</c:if>
      </c:forEach>
    ];

    let dadosFiltrados = [...dados];

    function formatarBRL(valor) {
      const num = parseFloat(valor.replace(",", "."));
      return isNaN(num) ? valor : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function aplicarFiltrosColunas() {
      const filtros = Array.from(document.querySelectorAll('#filters select')).map(select => {
        return Array.from(select.selectedOptions).map(opt => opt.value);
      });

      dadosFiltrados = dados.filter(row =>
        filtros.every((valores, colIndex) =>
          valores.length === 0 || valores.includes(row[colIndex])
        )
      );

      atualizarGrid();
    }

    function criarFiltrosColunas() {
      const container = document.getElementById('filters');
      container.innerHTML = '';

      colunas.forEach((coluna, colIndex) => {
        const grupo = document.createElement('div');
        grupo.className = 'filter-group';
        const select = document.createElement('select');
        select.multiple = true;
        select.size = 3;
        select.dataset.col = colIndex;
        select.onchange = aplicarFiltrosColunas;

        const valores = [...new Set(dados.map(row => row[colIndex]))].sort();
        valores.forEach(valor => {
          const option = document.createElement('option');
          option.value = valor;
          option.textContent = valor;
          option.selected = true;
          select.appendChild(option);
        });

        grupo.appendChild(document.createTextNode(coluna));
        grupo.appendChild(select);
        container.appendChild(grupo);
      });
    }

    function calcularTotais(dados) {
      return dados.reduce((acc, row) => {
        acc.VLRDESDO = (acc.VLRDESDO || 0) + parseFloat(row[10].replace(",", ".") || 0);
        acc.VLRBAIXA_CALC = (acc.VLRBAIXA_CALC || 0) + parseFloat(row[13].replace(",", ".") || 0);
        acc.VLRLIQUIDO = (acc.VLRLIQUIDO || 0) + parseFloat(row[18].replace(",", ".") || 0);
        return acc;
      }, {});
    }

    function atualizarGrid() {
      const totals = calcularTotais(dadosFiltrados);
      const totalsRow = colunas.map((_, idx) => {
        if (idx === 10) return formatarBRL(totals.VLRDESDO.toFixed(2));
        if (idx === 13) return formatarBRL(totals.VLRBAIXA_CALC.toFixed(2));
        if (idx === 18) return formatarBRL(totals.VLRLIQUIDO.toFixed(2));
        return idx === 0 ? "TOTAL" : "";
      });

      grid.updateConfig({
        data: () => [...dadosFiltrados, totalsRow]
      }).forceRender();
    }

    const grid = new gridjs.Grid({
      columns: colunas.map((col, idx) => {
        const formatarColuna = [10, 13, 18].includes(idx);
        return {
          name: col,
          id: col,
          resizable: true,
          formatter: cell => formatarColuna ? formatarBRL(cell) : cell
        };
      }),
      data: () => dados,
      search: false,
      sort: true,
      pagination: {
        limit: 200
      },
      fixedHeader: true,
      height: '100%'
    }).render(document.getElementById("tabela"));

    document.getElementById("export-btn").addEventListener("click", function () {
      const ws_data = [colunas, ...dadosFiltrados];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumo");
      XLSX.writeFile(wb, "resumo_financeiro.xlsx");
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

    criarFiltrosColunas();
    atualizarGrid();
  </script>
</body>
</html>
