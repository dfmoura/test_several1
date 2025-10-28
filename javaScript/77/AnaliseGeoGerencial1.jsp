<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Análise Geo-Gerencial Avançada</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <!-- Leaflet para OpenStreetMap -->
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- Heatmap plugin -->
    <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>

    <style>
      /* Estilos base */
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding-top: 40px !important;
        min-height: 100vh;
      }

      /* Fixed header styles */
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 35px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
      }

      .header-logo {
        position: absolute;
        left: 20px;
        display: flex;
        align-items: center;
      }

      .header-logo img {
        width: 22px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
      }

      .header-logo img:hover {
        transform: scale(1.1);
      }

      .header-title {
        color: white;
        font-size: 1rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 1px;
      }

      /* Container principal */
      .main-container {
        padding: 12px;
        margin-top: 35px;
      }

      /* Cards de resumo */
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
        margin-bottom: 15px;
      }

      .summary-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.1);
        padding: 16px;
        transition: all 0.3s ease;
      }

      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.2);
      }

      .summary-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .summary-card-icon {
        font-size: 1.5rem;
        color: #00afa0;
      }

      .summary-card-title {
        font-size: 0.85rem;
        color: #6e6e6e;
        font-weight: 500;
        margin: 0;
      }

      .summary-card-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #008a70;
        margin: 0;
      }

      /* Container do mapa com controles */
      .map-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 138, 112, 0.1);
        overflow: hidden;
        height: 650px;
        position: relative;
      }

      #geographicMap {
        width: 100%;
        height: 100%;
      }

      /* Painel de controles flutuante */
      .map-controls {
        position: absolute;
        top: 15px;
        right: 15px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        padding: 12px;
        z-index: 1000;
        min-width: 200px;
      }

      .control-group {
        margin-bottom: 12px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-label {
        font-size: 0.8rem;
        color: #6e6e6e;
        font-weight: 600;
        margin-bottom: 6px;
        display: block;
      }

      .control-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .btn-control {
        flex: 1;
        min-width: 80px;
        padding: 6px 10px;
        border: 1px solid #ebebeb;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        color: #6e6e6e;
        transition: all 0.3s;
      }

      .btn-control:hover {
        background: #f8f9fa;
        border-color: #00afa0;
      }

      .btn-control.active {
        background: linear-gradient(135deg, #00afa0, #008a70);
        color: white;
        border-color: transparent;
      }

      /* Toggle switch */
      .toggle-switch {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #9c9c9c;
        transition: 0.4s;
        border-radius: 24px;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: #00afa0;
      }

      input:checked + .slider:before {
        transform: translateX(20px);
      }

      /* Filtros */
      .filter-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.1);
        padding: 12px;
        margin-bottom: 12px;
      }

      .filter-row {
        display: flex;
        gap: 12px;
        align-items: end;
        flex-wrap: wrap;
      }

      .filter-group {
        flex: 1;
        min-width: 200px;
      }

      .filter-label {
        font-size: 0.8rem;
        color: #6e6e6e;
        font-weight: 500;
        margin-bottom: 5px;
      }

      .filter-input {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid #ebebeb;
        border-radius: 4px;
        font-size: 0.85rem;
        transition: border-color 0.3s;
      }

      .filter-input:focus {
        outline: none;
        border-color: #00afa0;
      }

      .btn-filter {
        background: linear-gradient(135deg, #00afa0, #008a70);
        color: white;
        border: none;
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.85rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .btn-filter:hover {
        background: linear-gradient(135deg, #008a70, #00695e);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.3);
      }

      /* Loading overlay */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #ebebeb;
        border-top: 3px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        margin-top: 12px;
        color: #6e6e6e;
        font-weight: 500;
        font-size: 0.9rem;
      }

      /* Mensagens */
      .error-message {
        background: linear-gradient(135deg, #e30613, #f56e1e);
        color: white;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 12px;
        text-align: center;
        font-weight: 500;
        font-size: 0.85rem;
      }

      .success-message {
        background: linear-gradient(135deg, #50af32, #a2c73b);
        color: white;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 12px;
        text-align: center;
        font-weight: 500;
        font-size: 0.85rem;
      }

      /* Badge de legenda */
      .legend {
        position: absolute;
        bottom: 15px;
        left: 15px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        padding: 12px;
        z-index: 1000;
        font-size: 0.75rem;
      }

      .legend-title {
        font-weight: 600;
        color: #008a70;
        margin-bottom: 8px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .map-controls {
          position: relative;
          top: 0;
          right: 0;
          margin-bottom: 12px;
        }

        .legend {
          position: relative;
          bottom: 0;
          left: 0;
          margin-top: 12px;
        }

        .summary-cards {
          grid-template-columns: 1fr;
        }

        .filter-row {
          flex-direction: column;
        }

        .filter-group {
          min-width: 100%;
        }

        .map-container {
          height: 500px;
        }
      }
    </style>
  </head>

  <body>
    <!-- Fixed Header -->
    <div class="fixed-header">
      <div class="header-logo">
        <a
          href="https://neuon.com.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg"
            alt="Neuon Logo"
          />
        </a>
      </div>
      <h1 class="header-title">Análise Geo-Gerencial Avançada</h1>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none">
      <div>
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando dados...</div>
      </div>
    </div>

    <div class="main-container">
      <!-- Cards de Resumo -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-shopping-cart summary-card-icon"></i>
            <h3 class="summary-card-title">Qtd Prevista</h3>
          </div>
          <p class="summary-card-value" id="qtdPrev">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-check-circle summary-card-icon"></i>
            <h3 class="summary-card-title">Qtd Realizada</h3>
          </div>
          <p class="summary-card-value" id="qtdReal">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-dollar-sign summary-card-icon"></i>
            <h3 class="summary-card-title">Valor Previsto</h3>
          </div>
          <p class="summary-card-value" id="vlrPrev">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-chart-line summary-card-icon"></i>
            <h3 class="summary-card-title">Valor Realizado</h3>
          </div>
          <p class="summary-card-value" id="vlrReal">-</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filter-container">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">Data Inicial (DD/MM/YYYY)</label>
            <input
              type="text"
              class="filter-input"
              id="dtInicio"
              placeholder="01/10/2025"
              value="01/10/2025"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">Data Final (DD/MM/YYYY)</label>
            <input
              type="text"
              class="filter-input"
              id="dtFim"
              placeholder="31/10/2025"
              value="31/10/2025"
            />
          </div>
          <button class="btn-filter" onclick="loadData()">
            <i class="fas fa-filter"></i>
            Filtrar
          </button>
        </div>
      </div>

      <!-- Container do Mapa com Controles -->
      <div class="map-container">
        <div id="geographicMap"></div>

        <!-- Painel de Controles -->
        <div class="map-controls">
          <div class="control-group">
            <label class="control-label">Tipo de Visualização</label>
            <div class="control-buttons">
              <button
                class="btn-control active"
                onclick="switchViewMode('bubbles')"
                id="btnBubbles"
              >
                <i class="fas fa-circle"></i> Bolhas
              </button>
              <button
                class="btn-control"
                onclick="switchViewMode('heatmap')"
                id="btnHeatmap"
              >
                <i class="fas fa-fire"></i> Heatmap
              </button>
              <button
                class="btn-control"
                onclick="switchViewMode('markers')"
                id="btnMarkers"
              >
                <i class="fas fa-map-marker-alt"></i> Pontos
              </button>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">Agregação por</label>
            <div class="control-buttons">
              <button
                class="btn-control"
                onclick="switchAggregation('cidade')"
                id="btnCidade"
              >
                Cidade
              </button>
              <button
                class="btn-control"
                onclick="switchAggregation('estado')"
                id="btnEstado"
              >
                Estado
              </button>
              <button
                class="btn-control active"
                onclick="switchAggregation('pais')"
                id="btnPais"
              >
                País
              </button>
            </div>
          </div>
          <div class="control-group">
            <div class="toggle-switch">
              <span class="control-label">Auto Zoom Inteligente</span>
              <label class="switch">
                <input
                  type="checkbox"
                  id="autoZoomToggle"
                  checked
                  onchange="toggleAutoZoom()"
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Legenda -->
        <div class="legend">
          <div class="legend-title">
            <i class="fas fa-info-circle"></i> Legenda de Valores
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #9c9c9c"></div>
            <span>Zero</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #ffb914"></div>
            <span>Até R$ 1.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #f56e1e"></div>
            <span>Até R$ 10.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #e30613"></div>
            <span>Até R$ 50.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #00afa0"></div>
            <span>Até R$ 100.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #008a70"></div>
            <span>Até R$ 500.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #00695e"></div>
            <span>Acima R$ 500.000</span>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Variáveis globais
      let map;
      let markers = [];
      let heatmapLayer = null;
      let bubbleGroup = null;
      let data = [];
      let currentViewMode = "bubbles";
      let currentAggregation = "pais";
      let autoZoomEnabled = true;

      // Função para mostrar/ocultar loading
      function showLoading(show = true) {
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = show ? "flex" : "none";
      }

      // Função para mostrar mensagem de erro
      function showError(message) {
        const container = document.querySelector(".main-container");
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;

        const existingError = container.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }

        container.insertBefore(errorDiv, container.firstChild);

        setTimeout(() => {
          errorDiv.remove();
        }, 5000);
      }

      // Função para mostrar mensagem de sucesso
      function showSuccess(message) {
        const container = document.querySelector(".main-container");
        const successDiv = document.createElement("div");
        successDiv.className = "success-message";
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

        const existingSuccess = container.querySelector(".success-message");
        if (existingSuccess) {
          existingSuccess.remove();
        }

        container.insertBefore(successDiv, container.firstChild);

        setTimeout(() => {
          successDiv.remove();
        }, 3000);
      }

      // Função para formatar valor monetário
      function formatCurrency(value) {
        if (!value || value === "-" || value === 0) return "-";
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      }

      // Função para formatar número
      function formatNumber(value) {
        if (!value || value === "-" || value === 0) return "-";
        return new Intl.NumberFormat("pt-BR").format(value);
      }

      // Função para atualizar cards de resumo
      function updateSummaryCards(dados) {
        if (!dados || dados.length === 0) {
          document.getElementById("qtdPrev").textContent = "-";
          document.getElementById("qtdReal").textContent = "-";
          document.getElementById("vlrPrev").textContent = "-";
          document.getElementById("vlrReal").textContent = "-";
          return;
        }

        const totals = dados.reduce(
          (acc, item) => {
            acc.qtdPrev += parseFloat(item.QTDPREV || 0);
            acc.qtdReal += parseFloat(item.QTDREAL || 0);
            acc.vlrPrev += parseFloat(item.VLRPREV || 0);
            acc.vlrReal += parseFloat(item.VLRREAL || 0);
            return acc;
          },
          { qtdPrev: 0, qtdReal: 0, vlrPrev: 0, vlrReal: 0 }
        );

        document.getElementById("qtdPrev").textContent = formatNumber(
          totals.qtdPrev
        );
        document.getElementById("qtdReal").textContent = formatNumber(
          totals.qtdReal
        );
        document.getElementById("vlrPrev").textContent = formatCurrency(
          totals.vlrPrev
        );
        document.getElementById("vlrReal").textContent = formatCurrency(
          totals.vlrReal
        );
      }

      // Função para inicializar o mapa
      function initMap() {
        map = L.map("geographicMap").setView([-14.235, -51.925], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        if (autoZoomEnabled) {
          map.on("zoomend", function () {
            updateMapDisplay();
          });
        }
      }

      // Função para alternar modo de visualização
      function switchViewMode(mode) {
        currentViewMode = mode;

        // Atualizar botões
        document
          .querySelectorAll('[onclick^="switchViewMode"]')
          .forEach((btn) => {
            btn.classList.remove("active");
          });

        if (mode === "bubbles") {
          document.getElementById("btnBubbles").classList.add("active");
        } else if (mode === "heatmap") {
          document.getElementById("btnHeatmap").classList.add("active");
        } else if (mode === "markers") {
          document.getElementById("btnMarkers").classList.add("active");
        }

        updateMapDisplay();
      }

      // Função para alternar agregação
      function switchAggregation(level) {
        currentAggregation = level;

        // Atualizar botões
        document
          .querySelectorAll('[onclick^="switchAggregation"]')
          .forEach((btn) => {
            btn.classList.remove("active");
          });

        document
          .getElementById(
            `btn${level.charAt(0).toUpperCase() + level.slice(1)}`
          )
          .classList.add("active");

        updateMapDisplay();
      }

      // Função para alternar auto zoom
      function toggleAutoZoom() {
        autoZoomEnabled = document.getElementById("autoZoomToggle").checked;

        if (autoZoomEnabled) {
          map.on("zoomend", function () {
            updateMapDisplay();
          });
        } else {
          map.off("zoomend");
        }

        updateMapDisplay();
      }

      // Função para atualizar exibição do mapa
      function updateMapDisplay() {
        clearMapDisplay();

        if (!data || data.length === 0) return;

        const zoom = map.getZoom();
        let aggregationLevel = currentAggregation;

        // Se auto zoom estiver ativo, determina nível baseado no zoom
        if (autoZoomEnabled) {
          if (zoom >= 10) {
            aggregationLevel = "cidade";
          } else if (zoom >= 6) {
            aggregationLevel = "estado";
          } else {
            aggregationLevel = "pais";
          }
        }

        if (currentViewMode === "bubbles") {
          displayBubbles(aggregationLevel);
        } else if (currentViewMode === "heatmap") {
          displayHeatmap(aggregationLevel);
        } else if (currentViewMode === "markers") {
          displayMarkers(aggregationLevel);
        }
      }

      // Função para limpar exibição do mapa
      function clearMapDisplay() {
        // Remover marcadores
        markers.forEach((marker) => map.removeLayer(marker));
        markers = [];

        // Remover heatmap
        if (heatmapLayer) {
          map.removeLayer(heatmapLayer);
          heatmapLayer = null;
        }

        // Remover bubbles
        if (bubbleGroup) {
          map.removeLayer(bubbleGroup);
          bubbleGroup = null;
        }
      }

      // Função para agrupar dados
      function groupData(level) {
        const groupedData = {};

        data.forEach((item) => {
          const key = item[level.toUpperCase()] || "SEM_DEFINIR";

          if (!groupedData[key]) {
            groupedData[key] = {
              key: key,
              latitude: parseFloat(item.LATITUDE || 0),
              longitude: parseFloat(item.LONGETUDE || 0),
              QTDPREV: 0,
              QTDREAL: 0,
              VLRPREV: 0,
              VLRREAL: 0,
              count: 0,
            };
          }

          groupedData[key].QTDPREV += parseFloat(item.QTDPREV || 0);
          groupedData[key].QTDREAL += parseFloat(item.QTDREAL || 0);
          groupedData[key].VLRPREV += parseFloat(item.VLRPREV || 0);
          groupedData[key].VLRREAL += parseFloat(item.VLRREAL || 0);
          groupedData[key].count += 1;
        });

        return groupedData;
      }

      // Função para exibir bubbles
      function displayBubbles(level) {
        const grouped = groupData(level);

        bubbleGroup = L.layerGroup().addTo(map);

        Object.values(grouped).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;

          const value = group.VLRREAL;
          const radius = Math.max(10, Math.min(100, Math.sqrt(value / 100)));
          const color = getColorByValue(value);

          const circle = L.circleMarker([group.latitude, group.longitude], {
            radius: radius,
            fillColor: color,
            color: "white",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
          }).addTo(bubbleGroup);

          const tooltip = createTooltip(group, level);
          circle.bindTooltip(tooltip, {
            permanent: false,
            direction: "top",
          });

          markers.push(circle);
        });
      }

      // Função para exibir heatmap
      function displayHeatmap(level) {
        const grouped = groupData(level);
        const heatData = [];

        Object.values(grouped).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;
          heatData.push([
            group.latitude,
            group.longitude,
            group.VLRREAL / 1000,
          ]);
        });

        heatmapLayer = L.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.0: "#9c9c9c",
            0.2: "#ffb914",
            0.4: "#f56e1e",
            0.6: "#e30613",
            0.8: "#00afa0",
            1.0: "#008a70",
          },
        }).addTo(map);
      }

      // Função para exibir marcadores
      function displayMarkers(level) {
        const grouped = groupData(level);

        Object.values(grouped).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;

          const color = getColorByValue(group.VLRREAL);
          const icon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background-color: ${color}; border: 3px solid white; border-radius: 50%; width: 30px; height: 30px; box-shadow: 0 3px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><i class="fas fa-map-marker-alt" style="color: white; font-size: 14px;"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const marker = L.marker([group.latitude, group.longitude], {
            icon: icon,
          }).addTo(map);

          const tooltip = createTooltip(group, level);
          marker.bindTooltip(tooltip, {
            permanent: false,
            direction: "top",
          });

          markers.push(marker);
        });
      }

      // Função para criar tooltip
      function createTooltip(group, level) {
        return `
          <div style="padding: 8px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #008a70; font-weight: 600;">${
              group.key
            }</h4>
            <div style="margin-bottom: 4px;"><strong>Nível:</strong> ${level}</div>
            <div style="margin-bottom: 4px;"><strong>Valor Realizado:</strong> ${formatCurrency(
              group.VLRREAL
            )}</div>
            <div style="margin-bottom: 4px;"><strong>Valor Previsto:</strong> ${formatCurrency(
              group.VLRPREV
            )}</div>
            <div style="margin-bottom: 4px;"><strong>Qtd Realizada:</strong> ${formatNumber(
              group.QTDREAL
            )}</div>
            <div style="margin-bottom: 4px;"><strong>Qtd Prevista:</strong> ${formatNumber(
              group.QTDPREV
            )}</div>
            <div style="margin-top: 8px; font-size: 0.85em; color: #6e6e6e;">Itens: ${
              group.count
            }</div>
          </div>
        `;
      }

      // Função para determinar cor
      function getColorByValue(value) {
        if (value <= 0) return "#9c9c9c";
        if (value <= 1000) return "#ffb914";
        if (value <= 10000) return "#f56e1e";
        if (value <= 50000) return "#e30613";
        if (value <= 100000) return "#00afa0";
        if (value <= 500000) return "#008a70";
        return "#00695e";
      }

      // Função para carregar dados
      async function loadData() {
        try {
          showLoading(true);

          if (typeof JX === "undefined" || !JX.consultar) {
            throw new Error(
              "SankhyaJX não está disponível para carregar os dados"
            );
          }

          const dtInicio =
            document.getElementById("dtInicio").value || "01/10/2025";
          const dtFim = document.getElementById("dtFim").value || "31/10/2025";

          const sql = `
            SELECT LATITUDE,LONGETUDE,CIDADE,ESTADO,PAIS,SUM(QTDREAL)QTDREAL,SUM(QTDPREV)QTDPREV,SUM(VLRREAL)VLRREAL,SUM(VLRPREV)VLRPREV
            FROM(
              WITH NIVEL_BASE AS (
                SELECT 
                    NVL(MET.CODMETA, 0) AS CODMETA,
                    MET.DTREF AS DTREF,
                    NVL(MET.CODVEND, 0) AS CODVEND,
                    NVL(VEN.APELIDO, 'SEM_VENDEDOR') AS APELIDO,
                    NVL(VEN.CODGER, 0) AS CODGER,
                    NVL(MET.CODPARC, 0) AS CODPARC,
                    NVL(PAR.RAZAOSOCIAL, 'SEM_PARCEIRO') AS PARCEIRO,
                    NVL(MET.MARCA, 'SEM_MARCA') AS MARCA,
                    NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                    NVL(VGF.CODCENCUS, 0) AS CODCENCUS,
                    NVL(COO.LATITUDE, 0) AS LATITUDE,
                    NVL(COO.LONGETUDE, 0) AS LONGETUDE,
                    NVL(COO.MUNICIPALITY, 'SEM_CIDADE') AS CIDADE,
                    NVL(COO.ESTADO, 'SEM_ESTADO') AS ESTADO,
                    NVL(COO.PAIS, 'SEM_PAIS') AS PAIS,
                    NVL(MET.QTDPREV, 0) AS QTDPREV,
                    NVL(PRC.VLRVENDALT, 0) AS PRECOLT,
                    SUM(NVL(VGF.QTD, 0)) AS QTDREAL,
                    SUM(NVL(VGF.VLR, 0)) AS VLRREAL
                FROM TGFMET MET
                LEFT JOIN TGFMAR MAR 
                    ON MAR.DESCRICAO = MET.MARCA
                LEFT JOIN VGF_VENDAS_SATIS VGF 
                    ON MET.DTREF = TRUNC(VGF.DTMOV, 'MM')
                   AND MET.CODVEND = VGF.CODVEND
                   AND MET.CODPARC = VGF.CODPARC
                   AND MET.MARCA = VGF.MARCA
                   AND VGF.BONIFICACAO = 'N'
                LEFT JOIN AD_PRECOMARCA PRC 
                    ON MET.MARCA = PRC.MARCA
                   AND PRC.CODMETA = MET.CODMETA
                   AND PRC.DTREF = (
                        SELECT MAX(DTREF)
                        FROM AD_PRECOMARCA
                        WHERE CODMETA = MET.CODMETA
                          AND DTREF <= MET.DTREF
                          AND MARCA = MET.MARCA
                   )
                LEFT JOIN TGFPAR PAR 
                    ON MET.CODPARC = PAR.CODPARC
                LEFT JOIN TGFVEN VEN 
                    ON MET.CODVEND = VEN.CODVEND
                LEFT JOIN AD_LATLONGPARC COO 
                    ON MET.CODPARC = COO.CODPARC
                WHERE MET.CODMETA = 4 AND MET.DTREF BETWEEN '${dtInicio}' AND '${dtFim}'
                GROUP BY 
                    NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD),
                    NVL(MET.CODMETA, 0),
                    MET.DTREF,
                    NVL(MET.CODVEND, 0),
                    NVL(VEN.APELIDO, 'SEM_VENDEDOR'),
                    NVL(VEN.CODGER, 0),
                    NVL(MET.CODPARC, 0),
                    NVL(PAR.RAZAOSOCIAL, 'SEM_PARCEIRO'),
                    NVL(MET.MARCA, 'SEM_MARCA'),
                    NVL(VGF.CODCENCUS, 0),
                    NVL(COO.LATITUDE, 0),
                    NVL(COO.LONGETUDE, 0),
                    NVL(COO.MUNICIPALITY, 'SEM_CIDADE'),
                    NVL(COO.ESTADO, 'SEM_ESTADO'),
                    NVL(COO.PAIS, 'SEM_PAIS'),
                    NVL(MET.QTDPREV, 0),
                    NVL(PRC.VLRVENDALT, 0)
            )
            SELECT 
                CODMETA,
                DTREF,
                CODVEND,
                APELIDO,
                CODGER,
                CODPARC,
                PARCEIRO,
                MARCA,
                CODGRUPOPROD,
                CODCENCUS,
                LATITUDE,
                LONGETUDE,
                CIDADE,
                ESTADO,
                PAIS,
                QTDPREV,
                QTDREAL,
                VLRREAL,
                SUM(NVL(QTDPREV, 0) * NVL(PRECOLT, 0)) AS VLRPREV
            FROM NIVEL_BASE
            GROUP BY 
                CODMETA,
                DTREF,
                CODVEND,
                APELIDO,
                CODGER,
                CODPARC,
                PARCEIRO,
                MARCA,
                CODGRUPOPROD,
                CODCENCUS,
                LATITUDE,
                LONGETUDE,
                CIDADE,
                ESTADO,
                PAIS,
                QTDPREV,
                QTDREAL,
                VLRREAL
            ORDER BY 
                CODMETA, DTREF, CODVEND, CODPARC
            )GROUP BY LATITUDE,LONGETUDE,CIDADE,ESTADO,PAIS
          `;

          const result = await JX.consultar(sql);

          if (result && result.length > 0) {
            data = result;
            updateSummaryCards(data);
            updateMapDisplay();
            showSuccess(`${result.length} registros carregados com sucesso!`);
          } else {
            data = [];
            updateSummaryCards([]);
            clearMapDisplay();
            showError("Nenhum registro encontrado para o período selecionado");
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          showError(`Erro ao carregar dados: ${error.message}`);
          data = [];
          updateSummaryCards([]);
        } finally {
          showLoading(false);
        }
      }

      // Inicializar ao carregar
      document.addEventListener("DOMContentLoaded", function () {
        initMap();
        loadData();
      });
    </script>
  </body>
</html>
