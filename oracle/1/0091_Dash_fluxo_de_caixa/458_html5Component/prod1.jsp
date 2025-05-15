<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Detalhamento</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/gridjs/dist/gridjs.umd.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 1rem;
    }
    h1 {
      text-align: center;
      margin-bottom: 1rem;
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
  <snk:load/>
</head>
<body>

<h1>Detalhamento Financeiro</h1>

<div id="search-container">
  <input type="text" id="quick-search" placeholder="Filtro rápido (use || para múltiplos termos)..." />
  <button id="export-btn">Exportar para Excel</button>
</div>

<div id="tabela"></div>

<div id="font-controls">
  Tamanho Fonte: 
  <button onclick="alterarFonte('menor')">A-</button>
  <button onclick="alterarFonte('maior')">A+</button>
</div>

<script>
  const colunas = [
    "ANO", "MES", "MES_ANO", "DESCRNAT", "DTNEG", "ORIGEM", "NUFIN",
    "CODPARC", "NOMEPARC", "CODPROJ", "DTVENC", "VLRDESDO", "RECDESP",
    "TIPO", "VLRBAIXA_CALC", "CODNAT", "PROVISAO", "CONTA_BAIXA",
    "NOME_CONTA_BAIXA", "FINANCEIRO", "VLRLIQUIDO", "MULTIPLICACAO_RECEITA_ANTERIOR"
  ];

  let dados = [];

  // Altera tamanho da fonte
  function alterarFonte(acao) {
    const tabela = document.querySelector('.gridjs-container');
    const atual = parseFloat(window.getComputedStyle(tabela).fontSize);
    if (acao === 'menor') tabela.style.fontSize = (atual - 1) + 'px';
    if (acao === 'maior') tabela.style.fontSize = (atual + 1) + 'px';
  }

  // Exporta para Excel
  function exportarParaExcel() {
    const ws_data = [colunas, ...dados];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Detalhamento");
    XLSX.writeFile(wb, "Detalhamento_Financeiro.xlsx");
  }

  document.getElementById("export-btn").addEventListener("click", exportarParaExcel);

  // Filtro rápido
  document.getElementById("quick-search").addEventListener("input", function () {
    const termos = this.value.toLowerCase().split("||").map(t => t.trim()).filter(t => t);
    grid.updateConfig({
      data: dados.filter(linha => termos.length === 0 || termos.some(t => linha.join(" ").toLowerCase().includes(t)))
    }).forceRender();
  });

  // Busca parâmetros e carrega dados
  const ini = getParametro("P_BAIXA.INI");
  const fin = getParametro("P_BAIXA.FIN");
  const nats = getParametro("P_NATUREZA");
  const contas = getParametro("P_CONTA");

  const query = `
    SELECT 
      ANO, MES, MES_ANO, DESCRNAT, DTNEG, ORIGEM, NUFIN,
      CODPARC, NOMEPARC, CODPROJ, DTVENC, VLRDESDO, RECDESP,
      TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
      NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
    FROM VW_FIN_RESUMO_SATIS
    WHERE RECDESP = 1
      AND PROVISAO = 'N'
      AND DTVENC BETWEEN '${ini}' AND '${fin}'
      AND CODNAT IN (${nats})
      AND CONTA_BAIXA IN (${contas})
  `;

  let grid;

  JX.consultar(query).then(res => {
    dados = res.map(l => colunas.map(c => l[c]));
    grid = new gridjs.Grid({
      columns: colunas,
      data: dados,
      pagination: {
        limit: 50
      },
      sort: true,
      resizable: true,
      fixedHeader: true,
      height: "600px",
      style: {
        td: {
          whiteSpace: "nowrap"
        },
        th: {
          whiteSpace: "nowrap",
          fontWeight: "bold"
        }
      }
    }).render(document.getElementById("tabela"));
  });
</script>

</body>
</html>
