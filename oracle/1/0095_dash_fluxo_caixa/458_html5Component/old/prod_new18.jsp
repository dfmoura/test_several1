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
  <h1>Detalhamento - Previsto de Despesas do Periodo</h1>

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
    VFIN.CODEMP,
    VFIN.NUFIN,
    VFIN.NUMNOTA,
    to_char(VFIN.DTNEG,'dd/mm/yyyy') DTNEG,
    to_char(VFIN.DHMOV,'dd/mm/yyyy') DHMOV,
    to_char(VFIN.DTVENCINIC,'dd/mm/yyyy') DTVENCINIC,
    to_char(VFIN.DTVENC,'dd/mm/yyyy') DTVENC,
    to_char(VFIN.DHBAIXA,'dd/mm/yyyy') DHBAIXA,
    VFIN.CODPARC,
    PAR.NOMEPARC,
    VFIN.CODTIPOPER,
    VFIN.CODBCO,
    VFIN.CODCTABCOINT,
    VFIN.CODNAT,
    NAT.DESCRNAT,
    VFIN.CODCENCUS,
    VFIN.CODPROJ,
    VFIN.VLRDESDOB,
    SUM(VFIN.VLRLIQUIDO) AS TOTALPROVISAO
    FROM TGFFIN FIN
    LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
    INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
    LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
    WHERE FIN.PROVISAO = 'N'
    AND FIN.RECDESP = -1
    AND FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    AND FIN.CODNAT IN (:P_NATUREZA)
    GROUP BY 
    VFIN.CODEMP,
    VFIN.NUFIN,
    VFIN.NUMNOTA,
    VFIN.DTNEG,
    VFIN.DHMOV,
    VFIN.DTVENCINIC,
    VFIN.DTVENC,
    VFIN.DHBAIXA,
    VFIN.CODPARC,
    PAR.NOMEPARC,
    VFIN.CODTIPOPER,
    VFIN.CODBCO,
    VFIN.CODCTABCOINT,
    VFIN.CODNAT,
    NAT.DESCRNAT,
    VFIN.CODCENCUS,
    VFIN.CODPROJ,
    VFIN.VLRDESDOB
  </snk:query>

  <script src="https://cdn.jsdelivr.net/npm/gridjs/dist/gridjs.umd.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

  <script>
    const colunas = [
      "Cód. Emp.", "NÚ.Fin.", "Nro. Nota", "Dt. Neg.", "Dt. Mov.","Dt. Venc.", "Dt. Baixa",
      "Cód. Parc.", "Parceiro",  "TOP", "Cód. Bco.", "Cód. Conta Bco.",
      "Cód. Nat.", "Descr. Nat.", "Cód. Cencus", "Cód. Proj.", "Vlr. Desdob.",
      "Total Provisão"
    ];

    const dados = [
      <c:forEach var="row" items="${receita_baixada.rows}" varStatus="rowStatus">
        [
        "${row.CODEMP}","${row.NUFIN}","${row.NUMNOTA}","${row.DTNEG}","${row.DHMOV}",
        "${row.DTVENC}","${row.DHBAIXA}","${row.CODPARC}","${row.NOMEPARC}","${row.CODTIPOPER}",
        "${row.CODBCO}","${row.CODCTABCOINT}","${row.CODNAT}","${row.DESCRNAT}","${row.CODCENCUS}",
        "${row.CODPROJ}","${row.VLRDESDOB}","${row.TOTALPROVISAO}"
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
        const formatarColuna = [16, 17].includes(idx);
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
          acc.VLRDESDO = (acc.VLRDESDO || 0) + parseFloat(row[16].replace(",", ".") || 0);
          acc.TOTALPROVISAO = (acc.TOTALPROVISAO || 0) + parseFloat(row[17].replace(",", ".") || 0);
          
          return acc;
        }, {});

        // Create totals row
        const totalsRow = colunas.map((_, idx) => {
          if (idx === 16) return formatarBRL(totals.VLRDESDO.toFixed(2));
          if (idx === 17) return formatarBRL(totals.TOTALPROVISAO.toFixed(2));
          
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
        acc.VLRDESDO = (acc.VLRDESDO || 0) + parseFloat(row[16].replace(",", ".") || 0);
        acc.TOTALPROVISAO = (acc.TOTALPROVISAO || 0) + parseFloat(row[17].replace(",", ".") || 0);
        
        return acc;
      }, {});

      // Create totals row
      const totalsRow = colunas.map((_, idx) => {
        if (idx === 16) return formatarBRL(totals.VLRDESDO.toFixed(2));
        if (idx === 17) return formatarBRL(totals.VLRBAIXA_CALC.toFixed(2));
        
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
