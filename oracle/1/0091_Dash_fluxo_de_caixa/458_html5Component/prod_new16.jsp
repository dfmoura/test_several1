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
      box-sizing: border-box;
      background-color: #f9f9f9;
    }

    h1 {
      text-align: center;
      margin-bottom: 1rem;
      font-size: var(--font-title);
      color: #333;
    }

    #search-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    #quick-search {
      flex: 1;
      min-width: 250px;
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    #export-btn {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease-in-out;
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

    #tabela {
      flex: 1;
      overflow: hidden;
    }

    .gridjs-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      font-size: var(--font-body);
    }

    .gridjs-wrapper {
      overflow-y: auto !important;
      max-height: 500px;
    }

    .gridjs-footer {
      flex-shrink: 0;
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
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 0.5rem;
      border-radius: 5px;
      z-index: 999;
      font-size: 0.75rem;
    }

    #font-controls button {
      background: #fff;
      color: #000;
      margin: 0 5px;
      border: none;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 4px;
    }
  </style>

  <snk:load />
</head>

<body>
  <h1>Detalhamento - Despesas Baixadas no Período</h1>

  <div id="search-container">
    <input
      type="text"
      id="quick-search"
      placeholder="Filtro rápido (Digite alguma palavra)..." />
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

  <snk:query var="receita_baixada">
    SELECT 
      ANO, MES, MES_ANO, DESCRNAT, TO_CHAR(DTNEG,'DD/MM/YYYY') DTNEG, ORIGEM, NUFIN,
      CODPARC, NOMEPARC, CODPROJ, TO_CHAR(DTVENC,'DD/MM/YYYY') DTVENC, VLRDESDO, RECDESP,
      TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
      NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
    FROM VW_FIN_RESUMO_SATIS
    WHERE RECDESP = -1 AND PROVISAO = 'N' AND DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
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

    const formatarBRL = (valor) => {
      const num = parseFloat(valor.replace(",", "."));
      return isNaN(num) ? valor : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const grid = new gridjs.Grid({
      columns: colunas.map((col, idx) => {
        const formatarColuna = [10, 13, 18, 19].includes(idx);
        return {
          name: col,
          id: col,
          resizable: true,
          formatter: cell => formatarColuna ? formatarBRL(cell) : cell
        };
      }),
      data: () => {
        // Calculate totals from filtered data
        const totals = dadosFiltrados.reduce((acc, row) => {
          acc.VLRDESDO = (acc.VLRDESDO || 0) + parseFloat(row[10].replace(",", ".") || 0);
          acc.VLRBAIXA_CALC = (acc.VLRBAIXA_CALC || 0) + parseFloat(row[13].replace(",", ".") || 0);
          acc.VLRLIQUIDO = (acc.VLRLIQUIDO || 0) + parseFloat(row[18].replace(",", ".") || 0);
          return acc;
        }, {});

        // Create totals row
        const totalsRow = colunas.map((_, idx) => {
          if (idx === 10) return formatarBRL(totals.VLRDESDO.toFixed(2));
          if (idx === 13) return formatarBRL(totals.VLRBAIXA_CALC.toFixed(2));
          if (idx === 18) return formatarBRL(totals.VLRLIQUIDO.toFixed(2));
          return idx === 0 ? "TOTAL" : "";
        });

        // Return filtered data with totals row
        return [...dadosFiltrados, totalsRow];
      },
      search: false,
      sort: true,
      pagination: {
        limit: 200
      },
      fixedHeader: true,
      height: '100%'
    }).render(document.getElementById("tabela"));

    // Add event listener for sorting
    grid.on('sort', () => {
      // Remove the totals row before sorting
      const dataWithoutTotals = dadosFiltrados.slice(0, -1);
      const totalsRow = dadosFiltrados[dadosFiltrados.length - 1];
      
      // Sort the data without totals
      const sortedData = [...dataWithoutTotals];
      
      // Add the totals row back at the end
      grid.updateConfig({ 
        data: () => [...sortedData, totalsRow]
      }).forceRender();
    });

    document.getElementById("quick-search").addEventListener("input", function (e) {
      const input = e.target.value.toLowerCase();

      dadosFiltrados = dados.filter(row => {
        return input.split("||").some(grupoOu => {
          const termosE = grupoOu.split("&&").map(t => t.trim()).filter(Boolean);
          return termosE.every(termo =>
            row.some(cell => cell.toString().toLowerCase().includes(termo))
          );
        });
      });

      // Calculate totals from filtered data
      const totals = dadosFiltrados.reduce((acc, row) => {
        acc.VLRDESDO = (acc.VLRDESDO || 0) + parseFloat(row[10].replace(",", ".") || 0);
        acc.VLRBAIXA_CALC = (acc.VLRBAIXA_CALC || 0) + parseFloat(row[13].replace(",", ".") || 0);
        acc.VLRLIQUIDO = (acc.VLRLIQUIDO || 0) + parseFloat(row[18].replace(",", ".") || 0);
        return acc;
      }, {});

      // Create totals row
      const totalsRow = colunas.map((_, idx) => {
        if (idx === 10) return formatarBRL(totals.VLRDESDO.toFixed(2));
        if (idx === 13) return formatarBRL(totals.VLRBAIXA_CALC.toFixed(2));
        if (idx === 18) return formatarBRL(totals.VLRLIQUIDO.toFixed(2));
        return idx === 0 ? "TOTAL" : "";
      });

      // Update grid with filtered data plus totals row
      grid.updateConfig({ 
        data: () => [...dadosFiltrados, totalsRow]
      }).forceRender();
    });

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
  </script>
</body>
</html>
