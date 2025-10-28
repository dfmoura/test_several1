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
    <title>Análise Geo-Gerencial</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link
      rel="stylesheet"
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"
    />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <!-- Leaflet para OpenStreetMap -->
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

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

      /* Container do mapa */
      .map-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 138, 112, 0.1);
        overflow: hidden;
        height: 650px;
      }

      #geographicMap {
        width: 100%;
        height: 100%;
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

      /* Responsividade */
      @media (max-width: 768px) {
        .header-title {
          font-size: 0.9rem;
        }

        .header-logo {
          left: 10px;
        }

        .header-logo img {
          width: 20px;
        }

        .fixed-header {
          height: 30px;
          padding: 0 10px;
        }

        body {
          padding-top: 35px !important;
        }

        .main-container {
          padding: 8px;
          margin-top: 35px;
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
      <h1 class="header-title">Análise Geo-Gerencial</h1>
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

      <!-- Container do Mapa -->
      <div class="map-container">
        <div id="geographicMap"></div>
      </div>
    </div>

    <script>
      // Variáveis globais
      let map;
      let markers = [];
      let data = [];

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
        // Inicializar mapa focando no Brasil
        map = L.map("geographicMap").setView([-14.235, -51.925], 4);

        // Adicionar camada do OpenStreetMap
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Configurar comportamento inteligente de zoom
        map.on("zoomend", function () {
          adjustMarkersByZoom();
        });
      }

      // Função para ajustar marcadores por nível de zoom
      function adjustMarkersByZoom() {
        const zoom = map.getZoom();

        // Limpar todos os marcadores
        markers.forEach((marker) => map.removeLayer(marker));
        markers = [];

        // Determinar nível de agregação baseado no zoom
        if (zoom >= 10) {
          // Zoom alto: mostrar por cidade
          addMarkersByLevel("CIDADE");
        } else if (zoom >= 6) {
          // Zoom médio: mostrar por estado
          addMarkersByLevel("ESTADO");
        } else {
          // Zoom baixo: mostrar por país
          addMarkersByLevel("PAIS");
        }
      }

      // Função para adicionar marcadores por nível
      function addMarkersByLevel(level) {
        if (!data || data.length === 0) return;

        const groupedData = {};

        // Agrupar dados por nível
        data.forEach((item) => {
          const key = item[level] || "SEM_DEFINIR";

          if (!groupedData[key]) {
            groupedData[key] = {
              key: key,
              latitude: parseFloat(item.LATITUDE || 0),
              longitude: parseFloat(item.LONGETUDE || 0),
              QTDPREV: 0,
              QTDREAL: 0,
              VLRPREV: 0,
              VLRREAL: 0,
              cities: new Set(),
              states: new Set(),
              countries: new Set(),
            };
          }

          groupedData[key].QTDPREV += parseFloat(item.QTDPREV || 0);
          groupedData[key].QTDREAL += parseFloat(item.QTDREAL || 0);
          groupedData[key].VLRPREV += parseFloat(item.VLRPREV || 0);
          groupedData[key].VLRREAL += parseFloat(item.VLRREAL || 0);

          if (item.CIDADE) groupedData[key].cities.add(item.CIDADE);
          if (item.ESTADO) groupedData[key].states.add(item.ESTADO);
          if (item.PAIS) groupedData[key].countries.add(item.PAIS);
        });

        // Adicionar marcadores agrupados
        Object.values(groupedData).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;

          // Determinar cor baseada no VLRREAL
          const color = getColorByValue(group.VLRREAL);

          // Criar ícone customizado
          const icon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background-color: ${color}; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          // Adicionar marcador
          const marker = L.marker([group.latitude, group.longitude], {
            icon: icon,
          }).addTo(map);

          // Tooltip com informações
          const tooltip = `
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
              ${
                group.cities.size > 0
                  ? `<div style="margin-top: 8px; font-size: 0.85em; color: #6e6e6e;">Cidades: ${group.cities.size}</div>`
                  : ""
              }
              ${
                group.states.size > 0
                  ? `<div style="font-size: 0.85em; color: #6e6e6e;">Estados: ${group.states.size}</div>`
                  : ""
              }
              ${
                group.countries.size > 0
                  ? `<div style="font-size: 0.85em; color: #6e6e6e;">Países: ${group.countries.size}</div>`
                  : ""
              }
            </div>
          `;

          marker.bindTooltip(tooltip, {
            permanent: false,
            direction: "top",
            className: "custom-tooltip",
          });

          markers.push(marker);
        });
      }

      // Função para determinar cor baseada no valor
      function getColorByValue(value) {
        if (value <= 0) return "#9c9c9c"; // Cinza médio
        if (value <= 1000) return "#ffb914"; // Laranja
        if (value <= 10000) return "#f56e1e"; // Abóbora
        if (value <= 50000) return "#e30613"; // Vermelho
        if (value <= 100000) return "#00afa0"; // Turquesa
        if (value <= 500000) return "#008a70"; // Verde escuro
        return "#00695e"; // Floresta
      }

      // Função para carregar dados da query
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

          // Query SQL adaptada da query_base.sql
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
            adjustMarkersByZoom();
            showSuccess(`${result.length} registros carregados com sucesso!`);
          } else {
            data = [];
            updateSummaryCards([]);
            // Limpar marcadores
            markers.forEach((marker) => map.removeLayer(marker));
            markers = [];
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

      // Inicializar ao carregar a página
      document.addEventListener("DOMContentLoaded", function () {
        initMap();
        loadData();
      });
    </script>
  </body>
</html>
