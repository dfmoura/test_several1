<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pedidos pendentes</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
      :root {
        --brand-1: #008a70;
        --brand-2: #00afa0;
        --brand-3: #0f172a;
        --soft: #f4f6f8;
        --card: #ffffff;
        --muted: #6e6e6e;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        color: #1f2937;
        padding-top: 40px;
        min-height: 100vh;
      }
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--brand-1), #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
        z-index: 1000;
      }
      .fixed-header .header-title {
        color: #fff;
        font-weight: 700;
        letter-spacing: 0.5px;
        font-size: 0.95rem;
        margin: 0;
      }
      .main-container {
        padding: 12px 16px 24px 16px;
      }
      .page-hero {
        background: linear-gradient(135deg, rgba(0, 138, 112, 0.12), rgba(0, 175, 160, 0.1));
        border: 1px solid rgba(0, 138, 112, 0.12);
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        margin-bottom: 14px;
      }
      .hero-text h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--brand-1);
      }
      .hero-text .subtitle {
        margin: 4px 0 0 0;
        color: var(--muted);
        font-size: 0.9rem;
      }
      .pill {
        background: #fff;
        color: var(--brand-1);
        padding: 6px 10px;
        border-radius: 999px;
        font-weight: 600;
        border: 1px solid rgba(0, 138, 112, 0.18);
        box-shadow: 0 1px 8px rgba(0, 138, 112, 0.06);
        white-space: nowrap;
      }
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .summary-card {
        background: var(--card);
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        border: 1px solid rgba(0, 138, 112, 0.08);
        transition: all 0.2s ease;
      }
      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(0, 138, 112, 0.12);
      }
      .summary-card .label {
        color: var(--muted);
        font-weight: 600;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .summary-card .value {
        margin: 8px 0 0 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--brand-1);
      }
      .panel {
        background: var(--card);
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        border: 1px solid rgba(0, 138, 112, 0.08);
      }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }
      .panel-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 800;
        color: #0f172a;
      }
      .panel-subtitle {
        color: var(--muted);
        font-size: 0.85rem;
        margin: 4px 0 0 0;
      }
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .chart-wrapper {
        position: relative;
        width: 100%;
        height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
      }
      .chart-wrapper canvas {
        max-height: 100%;
        max-width: 100%;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-primary {
        background: linear-gradient(135deg, var(--brand-2), var(--brand-1));
        color: #fff;
        border-color: transparent;
        box-shadow: 0 6px 16px rgba(0, 138, 112, 0.18);
      }
      .btn-ghost {
        background: #fff;
        color: var(--brand-1);
        border: 1px solid rgba(0, 138, 112, 0.16);
      }
      .btn:hover {
        transform: translateY(-1px);
      }
      .table-wrapper {
        overflow: auto;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 960px;
      }
      thead {
        background: #f8fafc;
      }
      th,
      td {
        padding: 10px 12px;
        font-size: 0.9rem;
        text-align: left;
        border-bottom: 1px solid #eef2f7;
      }
      th {
        font-weight: 700;
        color: #0f172a;
      }
      td {
        color: #374151;
      }
      .status-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.8rem;
        color: #0f172a;
        background: #f1f5f9;
      }
      .muted {
        color: var(--muted);
      }
      .loading-overlay {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.92);
        display: none;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        z-index: 1200;
        backdrop-filter: blur(5px);
      }
      .spinner {
        width: 42px;
        height: 42px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid var(--brand-1);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (max-width: 768px) {
        .page-hero {
          flex-direction: column;
          align-items: flex-start;
        }
        .charts-grid {
          grid-template-columns: 1fr;
        }
        .table-wrapper {
          border-radius: 6px;
        }
      }
    </style>
  </head>
  <body>
    <div class="fixed-header">
      <p class="header-title"><i class="fa-solid fa-clipboard-list-check"></i>&nbsp; Dashboard • Pedidos pendentes</p>
    </div>
    <div class="loading-overlay" id="loadingOverlay">
      <div class="spinner"></div>
      <p class="muted" style="margin-top: 10px; font-weight: 600;">Carregando dados...</p>
    </div>
    <main class="main-container">
      <section class="page-hero">
        <div class="hero-text">
          <p class="muted" style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Visão gerencial</p>
          <h1>Pedidos pendentes</h1>
          <p class="subtitle">Baseado nos status e descrições operacionais</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <span class="pill" id="pillStatus">Status: EE, A, ANF, PFP, MA</span>
          <span class="pill" id="pillAtualizacao">Atualizado agora</span>
        </div>
      </section>

      <section class="summary-cards">
        <div class="summary-card">
          <div class="label"><i class="fa-solid fa-coins"></i> Valor total</div>
          <div class="value" id="cardVlrTotal">--</div>
          <p class="panel-subtitle" id="cardVlrHint">Somatório dos pedidos em análise</p>
        </div>
        <div class="summary-card">
          <div class="label"><i class="fa-solid fa-hashtag"></i> Quantidade de pedidos</div>
          <div class="value" id="cardQtdTotal">--</div>
          <p class="panel-subtitle" id="cardQtdHint">Total de registros no escopo</p>
        </div>
      </section>

      <section class="charts-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Participação por valor</h3>
              <p class="panel-subtitle">Distribuição do VLRNOTA por status</p>
            </div>
            <button class="btn btn-ghost" id="clearSelection">
              <i class="fa-solid fa-arrow-rotate-left"></i> Limpar seleção
            </button>
          </div>
          <div class="chart-wrapper">
            <canvas id="chartValor"></canvas>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Participação por quantidade</h3>
              <p class="panel-subtitle">Número de pedidos por status</p>
            </div>
            <button class="btn btn-ghost" id="clearSelectionQty">
              <i class="fa-solid fa-arrow-rotate-left"></i> Limpar seleção
            </button>
          </div>
          <div class="chart-wrapper">
            <canvas id="chartQtd"></canvas>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Detalhamento dos pedidos</h3>
            <p class="panel-subtitle" id="tableCaption">Todos os status selecionados</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="pill" id="activeFilter">Filtro: todos</span>
            <button class="btn btn-primary" id="btnRefresh">
              <i class="fa-solid fa-arrows-rotate"></i> Atualizar
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Status</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Vendedor</th>
                <th>Parceiro</th>
                <th style="text-align: right;">Vlr Nota</th>
                <th style="text-align: right;">% Faturado</th>
                <th>Comentário</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr>
                <td colspan="9" class="muted" style="text-align: center; padding: 24px;">Carregando...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <script>
      const statusLabels = {
        EE: "Em análise",
        A: "Aprovado",
        ANF: "Aguardando NF",
        ANG: "Aguardando NF",
        PFP: "Pedido faturado parcial",
        MA: "Mercadoria a caminho",
      };

      const statusColors = {
        EE: "#00c2a8",
        A: "#0ea5e9",
        ANF: "#f59e0b",
        ANG: "#f59e0b",
        PFP: "#8b5cf6",
        MA: "#22c55e",
      };

      let rawData = [];
      let selectedStatus = null;
      let chartValor = null;
      let chartQtd = null;

      function formatCurrency(value) {
        const num = Number(value || 0);
        return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
      }

      function formatNumber(value) {
        return Number(value || 0).toLocaleString("pt-BR");
      }

      function showLoading(show = true) {
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = show ? "flex" : "none";
      }

      function normalizeStatus(code) {
        if (code === "ANG") return "ANF";
        return code || "";
      }

      async function carregarPedidos() {
        try {
          showLoading(true);
          if (typeof JX === "undefined" || !JX.consultar) {
            rawData = [];
            document.getElementById("tableBody").innerHTML =
              '<tr><td colspan="9" class="muted" style="text-align:center; padding:24px;">Conector JX indisponível.</td></tr>';
            renderResumo();
            renderGraficos();
            return;
          }
          const sql = `
            SELECT
              A2W.NUNOTA,
              A2W.STATUS,
              CASE
                WHEN A2W.status = 'ENC' THEN 'PEDIDO ENCERRADO'
                WHEN A2W.status = 'ME' THEN 'MERCADORIA ENTREGUE'
                WHEN A2W.status = 'MA' THEN 'MERCDORIA A CAMINHO'
                WHEN A2W.status = 'PE' THEN 'PREVISAO ENTREGA'
                WHEN A2W.status = 'ANF' THEN 'AGUARDANDO NF'
                WHEN A2W.status = 'NFE' THEN 'NOTA FISCAL EMITIDA'
                WHEN A2W.status = 'PS' THEN 'PEDIDO EM SEPARACAO'
                WHEN A2W.status = 'R' THEN 'REJEITADO'
                WHEN A2W.status = 'A' THEN 'APROVADO'
                WHEN A2W.status = 'EE' THEN 'EM ANALISE'
                WHEN A2W.status = 'C' THEN 'CANCELADO'
                WHEN A2W.status = 'PFP' THEN 'PEDIDO FATURADO PARCIAL'
              END AS STATUS_DESCRICAO,
              A2W.COMENTARIO,
              A2W.PERC_FATURADO,
              CAB.DTNEG,
              CAB.CODVEND,
              VEN.APELIDO,
              CAB.CODPARC,
              PAR.NOMEPARC,
              CAB.VLRNOTA
            FROM AD_VGFSTATUSA2W A2W
            INNER JOIN TGFCAB CAB ON A2W.NUNOTA = CAB.NUNOTA
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            WHERE A2W.STATUS IN ('EE','A','ANF','PFP','MA')
          `;

          const rows = (await JX.consultar(sql)) || [];
          rawData = rows.map((row) => ({
            NUNOTA: row.NUNOTA,
            STATUS: normalizeStatus(row.STATUS),
            STATUS_DESCRICAO: row.STATUS_DESCRICAO || statusLabels[normalizeStatus(row.STATUS)] || "-",
            COMENTARIO: row.COMENTARIO || "",
            PERC_FATURADO: Number(row.PERC_FATURADO || 0),
            DTNEG: row.DTNEG,
            CODVEND: row.CODVEND,
            APELIDO: row.APELIDO || "",
            CODPARC: row.CODPARC,
            NOMEPARC: row.NOMEPARC || "",
            VLRNOTA: Number(row.VLRNOTA || 0),
          }));

          renderResumo();
          renderGraficos();
          renderTabela();
          document.getElementById("pillAtualizacao").textContent = "Atualizado: " + new Date().toLocaleString("pt-BR");
        } catch (error) {
          console.error("Erro ao carregar pedidos:", error);
          document.getElementById("tableBody").innerHTML =
            '<tr><td colspan="9" class="muted" style="text-align:center; padding:24px;">Erro ao buscar dados.</td></tr>';
        } finally {
          showLoading(false);
        }
      }

      function agrupadosPorStatus() {
        const base = {};
        rawData.forEach((item) => {
          const st = normalizeStatus(item.STATUS);
          if (!base[st]) {
            base[st] = { status: st, valor: 0, qtd: 0 };
          }
          base[st].valor += Number(item.VLRNOTA || 0);
          base[st].qtd += 1;
        });
        return base;
      }

      function renderResumo() {
        const totalValor = rawData.reduce((sum, r) => sum + Number(r.VLRNOTA || 0), 0);
        const totalQtd = rawData.length;
        document.getElementById("cardVlrTotal").textContent = formatCurrency(totalValor);
        document.getElementById("cardVlrHint").textContent = "Somatório de " + formatNumber(totalQtd) + " pedidos";
        document.getElementById("cardQtdTotal").textContent = formatNumber(totalQtd);
        document.getElementById("cardQtdHint").textContent = "Considerando status elegíveis";
        document.getElementById("pillStatus").textContent = "Status: EE, A, ANF, PFP, MA";
      }

      function renderGraficos() {
        const agrupado = agrupadosPorStatus();
        const labels = Object.keys(agrupado).map((st) => statusLabels[st] || st);
        const codes = Object.keys(agrupado);
        const valores = codes.map((st) => agrupado[st].valor);
        const quantidades = codes.map((st) => agrupado[st].qtd);
        const cores = codes.map((st) => statusColors[st] || "#94a3b8");

        if (chartValor) chartValor.destroy();
        if (chartQtd) chartQtd.destroy();

        const ctxValor = document.getElementById("chartValor").getContext("2d");
        const ctxQtd = document.getElementById("chartQtd").getContext("2d");

        chartValor = new Chart(ctxValor, {
          type: "doughnut",
          data: {
            labels,
            datasets: [
              {
                data: valores,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: "#fff",
                hoverOffset: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } } },
            onClick: (evt) => handleChartClick(evt, chartValor, codes),
          },
        });

        chartQtd = new Chart(ctxQtd, {
          type: "doughnut",
          data: {
            labels,
            datasets: [
              {
                data: quantidades,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: "#fff",
                hoverOffset: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatNumber(ctx.parsed)}` } } },
            onClick: (evt) => handleChartClick(evt, chartQtd, codes),
          },
        });
        chartValor.$codes = codes;
        chartQtd.$codes = codes;
        aplicarSelecaoVisual();
      }

      function handleChartClick(evt, chart, codes) {
        const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);
        if (!points.length) return;
        const index = points[0].index;
        const statusCode = codes[index];
        selectedStatus = selectedStatus === statusCode ? null : statusCode;
        aplicarSelecaoVisual();
        renderTabela();
      }

      function aplicarSelecaoVisual() {
        const charts = [chartValor, chartQtd];
        charts.forEach((chart) => {
          if (!chart) return;
          const codes = chart.$codes || [];
          const baseColors = codes.map((st) => statusColors[st] || "#94a3b8");
          const softened = baseColors.map((c) => hexToRgba(c, 0.25));
          chart.data.datasets[0].backgroundColor = baseColors.map((color, idx) => {
            const code = codes[idx];
            if (!selectedStatus) return color;
            return selectedStatus === code ? color : softened[idx];
          });
          chart.update();
        });
        const tag = document.getElementById("activeFilter");
        if (selectedStatus) {
          tag.textContent = "Filtro: " + (statusLabels[selectedStatus] || selectedStatus);
          document.getElementById("tableCaption").textContent = "Filtrando por " + (statusLabels[selectedStatus] || selectedStatus);
        } else {
          tag.textContent = "Filtro: todos";
          document.getElementById("tableCaption").textContent = "Todos os status elegíveis";
        }
      }

      function hexToRgba(hex, alpha) {
        const clean = hex.replace("#", "");
        const bigint = parseInt(clean, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }

      function renderTabela() {
        const corpo = document.getElementById("tableBody");
        const data = selectedStatus
          ? rawData.filter((r) => normalizeStatus(r.STATUS) === selectedStatus)
          : rawData;

        if (!data.length) {
          corpo.innerHTML =
            '<tr><td colspan="9" class="muted" style="text-align:center; padding:24px;">Sem dados para o filtro selecionado.</td></tr>';
          return;
        }

        const linhas = data
          .sort((a, b) => new Date(b.DTNEG) - new Date(a.DTNEG))
          .map((item) => {
            const dt = item.DTNEG ? new Date(item.DTNEG).toLocaleDateString("pt-BR") : "-";
            return `
              <tr>
                <td><strong>${item.NUNOTA || "-"}</strong></td>
                <td><span class="status-tag" style="background:${hexToRgba(statusColors[item.STATUS] || "#e2e8f0", 0.25)}">${item.STATUS}</span></td>
                <td>${item.STATUS_DESCRICAO || "-"}</td>
                <td>${dt}</td>
                <td>${item.APELIDO || "-"} <span class="muted">(${item.CODVEND || "-"})</span></td>
                <td>${item.NOMEPARC || "-"} <span class="muted">(${item.CODPARC || "-"})</span></td>
                <td style="text-align:right; font-weight:700;">${formatCurrency(item.VLRNOTA)}</td>
                <td style="text-align:right;">${item.PERC_FATURADO ? item.PERC_FATURADO.toFixed(2) + "%" : "0%"}</td>
                <td>${item.COMENTARIO || "-"}</td>
              </tr>
            `;
          })
          .join("");

        corpo.innerHTML = linhas;
      }

      document.getElementById("clearSelection").addEventListener("click", () => {
        selectedStatus = null;
        aplicarSelecaoVisual();
        renderTabela();
      });
      document.getElementById("clearSelectionQty").addEventListener("click", () => {
        selectedStatus = null;
        aplicarSelecaoVisual();
        renderTabela();
      });
      document.getElementById("btnRefresh").addEventListener("click", () => {
        carregarPedidos();
      });

      document.addEventListener("DOMContentLoaded", () => {
        carregarPedidos();
      });
    </script>
  </body>
</html>
