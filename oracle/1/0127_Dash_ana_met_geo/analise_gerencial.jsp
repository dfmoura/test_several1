<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Análise Gerencial - Mapa Interativo</title>

    <!-- Bootstrap CSS -->
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />

    <!-- Font Awesome -->
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />

    <!-- Leaflet CSS -->
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />

    <style>
      /* Reset e configurações básicas */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        color: #2c3e50;
        line-height: 1.6;
        overflow-x: hidden;
      }

      /* Header fixo */
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
        z-index: 1000;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
      }

      .header-logo {
        display: flex;
        align-items: center;
      }

      .header-logo img {
        height: 25px;
        width: auto;
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
        margin-top: 40px;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
      }

      /* Cards superiores */
      .cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 15px;
      }

      .dashboard-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 138, 112, 0.1);
        padding: 15px;
        transition: all 0.3s ease;
        border-left: 4px solid #008a70;
        position: relative;
        overflow: hidden;
      }

      .dashboard-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 138, 112, 0.2);
      }

      .card-icon {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 35px;
        height: 35px;
        border-radius: 8px;
        background: linear-gradient(135deg, #00afa0, #008a70);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
      }

      .card-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #6e6e6e;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .card-value {
        font-size: 1.4rem;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .card-subtitle {
        font-size: 0.7rem;
        color: #8e8e8e;
        font-weight: 500;
      }

      /* Container do mapa */
      .map-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 138, 112, 0.1);
        overflow: hidden;
        height: 70vh;
        min-height: 500px;
        position: relative;
      }

      .map-header {
        background: linear-gradient(135deg, #008a70, #00695e);
        color: white;
        padding: 12px 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .map-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .map-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .map-control-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.7rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .map-control-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      /* Estilo do mapa Leaflet */
      #map {
        height: calc(100% - 50px);
        width: 100%;
      }

      /* Popup customizado */
      .custom-popup {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      }

      .popup-header {
        background: linear-gradient(135deg, #008a70, #00695e);
        color: white;
        padding: 8px 12px;
        margin: -10px -10px 8px -10px;
        border-radius: 6px 6px 0 0;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .popup-content {
        padding: 0;
      }

      .popup-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #f1f3f4;
        font-size: 0.8rem;
      }

      .popup-item:last-child {
        border-bottom: none;
      }

      .popup-label {
        color: #6e6e6e;
        font-weight: 500;
      }

      .popup-value {
        color: #2c3e50;
        font-weight: 600;
      }

      /* Loading */
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

        .main-container {
          padding: 8px;
        }

        .cards-container {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .dashboard-card {
          padding: 12px;
        }

        .card-icon {
          width: 30px;
          height: 30px;
          font-size: 12px;
        }

        .card-title {
          font-size: 0.7rem;
        }

        .card-value {
          font-size: 1.2rem;
        }

        .map-container {
          height: 60vh;
          min-height: 400px;
        }

        .map-header {
          padding: 8px 10px;
        }

        .map-title {
          font-size: 0.9rem;
        }

        .map-control-btn {
          padding: 4px 8px;
          font-size: 0.65rem;
        }
      }

      @media (max-width: 480px) {
        .cards-container {
          grid-template-columns: 1fr;
        }

        .map-container {
          height: 50vh;
          min-height: 350px;
        }
      }
    </style>
  </head>

  <body>
    <!-- Header Fixo -->
    <div class="fixed-header">
      <div class="header-logo">
        <a href="#" style="text-decoration: none">
          <img
            src="https://via.placeholder.com/120x30/008a70/ffffff?text=NEUON"
            alt="Neuon Logo"
          />
        </a>
      </div>
      <h1 class="header-title">Análise Gerencial - Mapa Interativo</h1>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none">
      <div>
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando dados...</div>
      </div>
    </div>

    <!-- Container Principal -->
    <div class="main-container">
      <!-- Cards Superiores -->
      <div class="cards-container">
        <div class="dashboard-card">
          <div class="card-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="card-title">Quantidade Prevista</div>
          <div class="card-value" id="qtdPrevValue">-</div>
          <div class="card-subtitle">Total planejado</div>
        </div>

        <div class="dashboard-card">
          <div class="card-icon">
            <i class="fas fa-chart-bar"></i>
          </div>
          <div class="card-title">Quantidade Real</div>
          <div class="card-value" id="qtdRealValue">-</div>
          <div class="card-subtitle">Total executado</div>
        </div>

        <div class="dashboard-card">
          <div class="card-icon">
            <i class="fas fa-dollar-sign"></i>
          </div>
          <div class="card-title">Valor Previsto</div>
          <div class="card-value" id="vlrPrevValue">-</div>
          <div class="card-subtitle">Valor planejado</div>
        </div>

        <div class="dashboard-card">
          <div class="card-icon">
            <i class="fas fa-coins"></i>
          </div>
          <div class="card-title">Valor Real</div>
          <div class="card-value" id="vlrRealValue">-</div>
          <div class="card-subtitle">Valor executado</div>
        </div>
      </div>

      <!-- Container do Mapa -->
      <div class="map-container">
        <div class="map-header">
          <h2 class="map-title">
            <i class="fas fa-map-marked-alt"></i>
            Análise Geográfica
          </h2>
          <div class="map-controls">
            <button class="map-control-btn" onclick="fitMapToMarkers()">
              <i class="fas fa-expand-arrows-alt"></i>
              Ajustar
            </button>
            <button class="map-control-btn" onclick="toggleClusters()">
              <i class="fas fa-layer-group"></i>
              Agrupar
            </button>
          </div>
        </div>
        <div id="map"></div>
      </div>
    </div>

    <!-- Leaflet JS -->
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>

    <!-- Leaflet MarkerCluster -->
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>

    <script>
      // Variáveis globais
      let map;
      let markers = [];
      let markerCluster;
      let mapData = [];
      let clustersEnabled = true;

      // Função para mostrar/ocultar loading
      function showLoading(show = true) {
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = show ? "flex" : "none";
      }

      // Função para mostrar mensagem de erro
      function showError(message) {
        const existingError = document.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }

        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = message;
        document
          .querySelector(".main-container")
          .insertBefore(errorDiv, document.querySelector(".cards-container"));

        setTimeout(() => {
          errorDiv.remove();
        }, 5000);
      }

      // Função para mostrar mensagem de sucesso
      function showSuccess(message) {
        const existingSuccess = document.querySelector(".success-message");
        if (existingSuccess) {
          existingSuccess.remove();
        }

        const successDiv = document.createElement("div");
        successDiv.className = "success-message";
        successDiv.textContent = message;
        document
          .querySelector(".main-container")
          .insertBefore(successDiv, document.querySelector(".cards-container"));

        setTimeout(() => {
          successDiv.remove();
        }, 3000);
      }

      // Função para formatar números
      function formatNumber(value) {
        if (value === null || value === undefined || value === "") return "-";
        return new Intl.NumberFormat("pt-BR").format(value);
      }

      // Função para formatar moeda
      function formatCurrency(value) {
        if (value === null || value === undefined || value === "") return "-";
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      }

      // Função para inicializar o mapa
      function initializeMap() {
        // Configuração inicial do mapa (centro do Brasil)
        map = L.map("map").setView([-14.235, -51.9253], 4);

        // Adicionar camada de tiles do OpenStreetMap
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(map);

        // Inicializar cluster de marcadores
        markerCluster = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
        });

        map.addLayer(markerCluster);
      }

      // Função para criar popup customizado
      function createCustomPopup(data) {
        return `
          <div class="custom-popup">
            <div class="popup-header">
              <i class="fas fa-map-marker-alt"></i>
              ${data.CIDADE || "N/A"}, ${data.ESTADO || "N/A"}
            </div>
            <div class="popup-content">
              <div class="popup-item">
                <span class="popup-label">País:</span>
                <span class="popup-value">${data.PAIS || "N/A"}</span>
              </div>
              <div class="popup-item">
                <span class="popup-label">Qtd. Prevista:</span>
                <span class="popup-value">${formatNumber(data.QTDPREV)}</span>
              </div>
              <div class="popup-item">
                <span class="popup-label">Qtd. Real:</span>
                <span class="popup-value">${formatNumber(data.QTDREAL)}</span>
              </div>
              <div class="popup-item">
                <span class="popup-label">Valor Previsto:</span>
                <span class="popup-value">${formatCurrency(
                  data.VLR_PREV
                )}</span>
              </div>
              <div class="popup-item">
                <span class="popup-label">Valor Real:</span>
                <span class="popup-value">${formatCurrency(data.VLRREAL)}</span>
              </div>
              <div class="popup-item">
                <span class="popup-label">% Atingido:</span>
                <span class="popup-value">${calculatePercentage(
                  data.QTDREAL,
                  data.QTDPREV
                )}%</span>
              </div>
            </div>
          </div>
        `;
      }

      // Função para calcular percentual
      function calculatePercentage(real, prev) {
        if (!real || !prev || prev === 0) return "-";
        return ((real / prev) * 100).toFixed(1);
      }

      // Função para criar marcador customizado
      function createCustomMarker(data) {
        const percentage = calculatePercentage(data.QTDREAL, data.QTDPREV);
        let color = "#008a70"; // Verde padrão

        if (percentage !== "-") {
          const perc = parseFloat(percentage);
          if (perc >= 100) color = "#50af32"; // Verde sucesso
          else if (perc >= 80) color = "#a2c73b"; // Verde médio
          else if (perc >= 60) color = "#f56e1e"; // Laranja
          else color = "#e30613"; // Vermelho
        }

        const icon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              background: ${color};
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 10px;
              font-weight: bold;
            ">
              ${percentage !== "-" ? Math.round(parseFloat(percentage)) : "?"}
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        return icon;
      }

      // Função para adicionar marcadores ao mapa
      function addMarkersToMap() {
        // Limpar marcadores existentes
        markerCluster.clearLayers();
        markers = [];

        mapData.forEach((data) => {
          if (
            data.LATITUDE &&
            data.LONGETUDE &&
            data.LATITUDE !== "-" &&
            data.LONGETUDE !== "-"
          ) {
            const lat = parseFloat(data.LATITUDE);
            const lng = parseFloat(data.LONGETUDE);

            if (!isNaN(lat) && !isNaN(lng)) {
              const marker = L.marker([lat, lng], {
                icon: createCustomMarker(data),
              });

              marker.bindPopup(createCustomPopup(data));
              markers.push(marker);
            }
          }
        });

        // Adicionar marcadores ao cluster
        if (clustersEnabled) {
          markerCluster.addLayers(markers);
        } else {
          markers.forEach((marker) => map.addLayer(marker));
        }
      }

      // Função para ajustar mapa aos marcadores
      function fitMapToMarkers() {
        if (markers.length > 0) {
          const group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }

      // Função para alternar clusters
      function toggleClusters() {
        clustersEnabled = !clustersEnabled;

        if (clustersEnabled) {
          map.removeLayer(markers);
          markerCluster.addLayers(markers);
        } else {
          markerCluster.clearLayers();
          markers.forEach((marker) => map.addLayer(marker));
        }
      }

      // Função para atualizar cards com totais
      function updateCards() {
        const totals = mapData.reduce(
          (acc, item) => {
            acc.qtdPrev += parseFloat(item.QTDPREV || 0);
            acc.qtdReal += parseFloat(item.QTDREAL || 0);
            acc.vlrPrev += parseFloat(item.VLR_PREV || 0);
            acc.vlrReal += parseFloat(item.VLRREAL || 0);
            return acc;
          },
          { qtdPrev: 0, qtdReal: 0, vlrPrev: 0, vlrReal: 0 }
        );

        document.getElementById("qtdPrevValue").textContent = formatNumber(
          totals.qtdPrev
        );
        document.getElementById("qtdRealValue").textContent = formatNumber(
          totals.qtdReal
        );
        document.getElementById("vlrPrevValue").textContent = formatCurrency(
          totals.vlrPrev
        );
        document.getElementById("vlrRealValue").textContent = formatCurrency(
          totals.vlrReal
        );
      }

      // Função para carregar dados
      async function loadData() {
        try {
          showLoading(true);

          // Query de exemplo - substitua pela sua query real
          const sql = `
            SELECT 
              t.codparc,
              cid.nomecid as CIDADE,
              ufs.DESCRICAO as ESTADO,
              'BRASIL' as PAIS,
              COALESCE(t.AD_LATI_CIDADE, '') as LATITUDE,
              COALESCE(t.AD_LONG_CIDADE, '') as LONGETUDE,
              COALESCE(SUM(v.QTDPREV), 0) as QTDPREV,
              COALESCE(SUM(v.QTDREAL), 0) as QTDREAL,
              COALESCE(SUM(v.VLR_PREV), 0) as VLR_PREV,
              COALESCE(SUM(v.VLRREAL), 0) as VLRREAL
            FROM tgfpar t
            INNER JOIN tsiend endi ON t.codend = endi.codend
            INNER JOIN tsibai bai ON t.codbai = bai.codbai
            INNER JOIN tsicid cid ON t.codcid = cid.codcid
            INNER JOIN tsiufs ufs ON cid.UF = ufs.CODUF
            LEFT JOIN vgf_vendas_satis v ON v.codparc = t.codparc
            WHERE EXISTS (
              SELECT 1 FROM vgf_vendas_satis v2 WHERE v2.codparc = t.codparc
            )
            GROUP BY t.codparc, cid.nomecid, ufs.DESCRICAO, t.AD_LATI_CIDADE, t.AD_LONG_CIDADE
            HAVING COALESCE(SUM(v.QTDPREV), 0) > 0 OR COALESCE(SUM(v.QTDREAL), 0) > 0
            ORDER BY COALESCE(SUM(v.QTDREAL), 0) DESC
          `;

          console.log("Executando consulta SQL:", sql);

          // Executar consulta usando SankhyaJX
          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            mapData = data;

            // Atualizar cards
            updateCards();

            // Adicionar marcadores ao mapa
            addMarkersToMap();

            // Ajustar mapa aos marcadores
            setTimeout(() => {
              fitMapToMarkers();
            }, 500);

            showSuccess(`${data.length} registros carregados com sucesso!`);
          } else {
            showError("Nenhum registro encontrado com coordenadas válidas");
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          showError(`Erro ao carregar dados: ${error.message}`);
        } finally {
          showLoading(false);
        }
      }

      // Inicializar quando a página carregar
      document.addEventListener("DOMContentLoaded", function () {
        initializeMap();
        loadData();
      });
    </script>
  </body>
</html>
