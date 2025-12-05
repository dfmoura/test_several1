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
    <title>Tabela Coordenadas Geográficas</title>
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
    <!-- SheetJS para exportação Excel -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <!-- jsPDF para exportação PDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>

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

      /* Estilos da tabela */
      .table-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 138, 112, 0.1);
        overflow: hidden;
        margin-bottom: 15px;
      }

      .table-header {
        background: linear-gradient(135deg, #008a70, #00695e);
        color: white;
        padding: 12px;
        text-align: center;
      }

      .table-header h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
      }

      .data-table th {
        background: linear-gradient(135deg, #00afa0, #008a70);
        color: white;
        padding: 8px 6px;
        text-align: left;
        font-weight: 600;
        font-size: 0.8rem;
        border: none;
        position: sticky;
        top: 0;
        z-index: 10;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        padding-right: 25px;
      }

      .data-table th.sortable:hover {
        background: linear-gradient(135deg, #008a70, #00695e);
        color: white;
      }

      .sort-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.7rem;
        transition: all 0.2s;
      }

      .data-table th.sortable:hover .sort-icon {
        color: white;
      }

      .data-table td {
        padding: 6px;
        border-bottom: 1px solid #ebebeb;
        font-size: 0.8rem;
        vertical-align: middle;
      }

      /* Botão de geocodificação */
      .btn-geocode {
        background: linear-gradient(135deg, #00b4cd, #00afa0);
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.7rem;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 3px;
        min-width: 80px;
        justify-content: center;
      }

      .btn-geocode:hover {
        background: linear-gradient(135deg, #00afa0, #008a70);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 180, 205, 0.3);
      }

      .btn-geocode:disabled {
        background: #9c9c9c;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .btn-geocode.loading {
        background: #9c9c9c;
        cursor: not-allowed;
      }

      .btn-geocode.success {
        background: linear-gradient(135deg, #50af32, #a2c73b);
      }

      .btn-geocode.error {
        background: linear-gradient(135deg, #e30613, #f56e1e);
      }

      .data-table tbody tr:hover {
        background-color: rgba(0, 175, 160, 0.05);
        transition: background-color 0.2s ease;
      }

      .data-table tbody tr:nth-child(even) {
        background-color: rgba(0, 175, 160, 0.02);
      }

      /* Botões de ação */
      .action-buttons {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .btn-action {
        background: linear-gradient(135deg, #00afa0, #008a70);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.8rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .btn-action:hover {
        background: linear-gradient(135deg, #008a70, #00695e);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.3);
      }

      .btn-action:active {
        transform: translateY(0);
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

      /* Mensagem de erro */
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

      /* Mensagem de sucesso */
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

        .action-buttons {
          flex-direction: column;
          gap: 6px;
        }

        .btn-action {
          justify-content: center;
          padding: 5px 10px;
          font-size: 0.75rem;
        }

        .data-table th,
        .data-table td {
          padding: 4px 3px;
          font-size: 0.7rem;
        }

        .btn-geocode {
          min-width: 70px;
          padding: 3px 6px;
          font-size: 0.65rem;
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
      <h1 class="header-title">Coordenadas Geográficas</h1>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none">
      <div>
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando dados...</div>
      </div>
    </div>

    <div class="main-container">
      <!-- Botões de Ação -->
      <div class="action-buttons">
        <button class="btn-action" onclick="loadData()">
          <i class="fas fa-sync-alt"></i>
          Atualizar Dados
        </button>
        <button class="btn-action" onclick="exportToExcel()">
          <i class="fas fa-file-excel"></i>
          Exportar Excel
        </button>
        <button class="btn-action" onclick="exportToPDF()">
          <i class="fas fa-file-pdf"></i>
          Exportar PDF
        </button>
      </div>

      <!-- Container da Tabela -->
      <div class="table-container">
        <div class="table-header">
          <h2>
            <i class="fas fa-map-marker-alt"></i>
            Tabela AD_LATLONGPARC - Coordenadas Geográficas
          </h2>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="coordinatesTable">
            <thead>
              <tr>
                <th
                  class="sortable"
                  data-sort="CODIGO"
                  onclick="sortTable('CODIGO')"
                >
                  Código <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="CODPARC"
                  onclick="sortTable('CODPARC')"
                >
                  Código Parceiro <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="LATITUDE"
                  onclick="sortTable('LATITUDE')"
                >
                  Latitude <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="LONGETUDE"
                  onclick="sortTable('LONGETUDE')"
                >
                  Longitude <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="CIDADE"
                  onclick="sortTable('CIDADE')"
                >
                  Cidade <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="ESTADO"
                  onclick="sortTable('ESTADO')"
                >
                  Estado <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="PAIS"
                  onclick="sortTable('PAIS')"
                >
                  País <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="MUNICIPALITY"
                  onclick="sortTable('MUNICIPALITY')"
                >
                  Município <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="REGION"
                  onclick="sortTable('REGION')"
                >
                  Região <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="POSTCODE"
                  onclick="sortTable('POSTCODE')"
                >
                  CEP <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="COUNTRY_CODE"
                  onclick="sortTable('COUNTRY_CODE')"
                >
                  Código País <i class="fas fa-sort sort-icon"></i>
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="coordinatesTableBody">
              <tr>
                <td
                  colspan="12"
                  style="text-align: center; padding: 40px; color: #6e6e6e"
                >
                  <i class="fas fa-spinner fa-spin"></i>
                  Carregando dados...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <script>
      // Variáveis globais para armazenar os dados e controle de ordenação
      let coordinatesData = [];
      let currentSortField = null;
      let currentSortDirection = "asc";

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

        // Remove mensagens anteriores
        const existingError = container.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }

        container.insertBefore(errorDiv, container.firstChild);

        // Remove a mensagem após 5 segundos
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

        // Remove mensagens anteriores
        const existingSuccess = container.querySelector(".success-message");
        if (existingSuccess) {
          existingSuccess.remove();
        }

        container.insertBefore(successDiv, container.firstChild);

        // Remove a mensagem após 3 segundos
        setTimeout(() => {
          successDiv.remove();
        }, 3000);
      }

      // Função para carregar dados da tabela AD_LATLONGPARC
      async function loadData() {
        try {
          showLoading(true);

          // Verificar se SankhyaJX está disponível
          if (typeof JX === "undefined" || !JX.consultar) {
            throw new Error(
              "SankhyaJX não está disponível para carregar os dados"
            );
          }

          // Query SQL para buscar dados da tabela AD_LATLONGPARC
          const sql = `
            SELECT 
                CODIGO,
                CODPARC,
                LATITUDE,
                LONGETUDE,
                cidade,
                estado,
                pais,
                municipality,
                region,
                postcode,
                country_code
            FROM AD_LATLONGPARC
            ORDER BY CODIGO
          `;

          // Executar consulta usando SankhyaJX
          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            // Armazenar dados globalmente
            coordinatesData = data;

            // Renderizar tabela diretamente
            renderTable();

            showSuccess(`${data.length} registros carregados com sucesso!`);
          } else {
            // Mostrar mensagem quando não há dados
            renderEmptyTable();
            showError("Nenhum registro encontrado na tabela AD_LATLONGPARC");
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          showError(`Erro ao carregar dados: ${error.message}`);
          renderEmptyTable();
        } finally {
          showLoading(false);
        }
      }

      // Função para renderizar a tabela com dados
      function renderTable() {
        const tbody = document.getElementById("coordinatesTableBody");
        tbody.innerHTML = "";

        coordinatesData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${item.CODIGO || "-"}</td>
            <td>${item.CODPARC || "-"}</td>
            <td>${item.LATITUDE || "-"}</td>
            <td>${item.LONGETUDE || "-"}</td>
            <td>${item.CIDADE || "-"}</td>
            <td>${item.ESTADO || "-"}</td>
            <td>${item.PAIS || "-"}</td>
            <td>${item.MUNICIPALITY || "-"}</td>
            <td>${item.REGION || "-"}</td>
            <td>${item.POSTCODE || "-"}</td>
            <td>${item.COUNTRY_CODE || "-"}</td>
            <td>
              <button 
                class="btn-geocode" 
                onclick="geocodeAddress(${index})"
                data-codparc="${item.CODPARC}"
                data-cidade="${item.CIDADE || ""}"
                data-estado="${item.ESTADO || ""}"
                data-pais="${item.PAIS || ""}"
                title="Buscar coordenadas no OpenStreetMap"
              >
                <i class="fas fa-map-marker-alt"></i>
                Geocodificar
              </button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }

      // Função para ordenar dados
      function sortData(field, direction) {
        coordinatesData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          // Tratar valores nulos/vazios
          if (!aVal || aVal === "-") aVal = "";
          if (!bVal || bVal === "-") bVal = "";

          // Converter para número se possível
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return direction === "asc" ? aNum - bNum : bNum - aNum;
          }

          // Comparação de strings
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();

          if (aStr < bStr) return direction === "asc" ? -1 : 1;
          if (aStr > bStr) return direction === "asc" ? 1 : -1;
          return 0;
        });
      }

      // Função para ordenar tabela (chamada pelo clique no cabeçalho)
      function sortTable(field) {
        if (currentSortField === field) {
          currentSortDirection =
            currentSortDirection === "asc" ? "desc" : "asc";
        } else {
          currentSortField = field;
          currentSortDirection = "asc";
        }

        sortData(field, currentSortDirection);
        updateSortIndicators();
        renderTable();
      }

      // Função para atualizar indicadores de ordenação
      function updateSortIndicators() {
        // Remover todos os indicadores
        document.querySelectorAll(".sort-icon").forEach((icon) => {
          icon.className = "fas fa-sort sort-icon";
        });

        // Adicionar indicador na coluna atual
        if (currentSortField) {
          const header = document.querySelector(
            `th[data-sort="${currentSortField}"]`
          );
          if (header) {
            const icon = header.querySelector(".sort-icon");
            if (icon) {
              icon.className =
                currentSortDirection === "asc"
                  ? "fas fa-sort-up sort-icon"
                  : "fas fa-sort-down sort-icon";
            }
          }
        }
      }

      // Função para renderizar tabela vazia
      function renderEmptyTable() {
        const tbody = document.getElementById("coordinatesTableBody");
        tbody.innerHTML = `
          <tr>
            <td colspan="12" style="text-align: center; padding: 40px; color: #6e6e6e;">
              <i class="fas fa-info-circle"></i>
              Nenhum dado encontrado
            </td>
          </tr>
        `;
      }

      // Função para fazer geocodificação via Nominatim OpenStreetMap
      async function geocodeAddress(index) {
        const button = document.querySelector(
          `button[onclick="geocodeAddress(${index})"]`
        );
        const codparc = button.getAttribute("data-codparc");
        const cidade = button.getAttribute("data-cidade");
        const estado = button.getAttribute("data-estado");
        const pais = button.getAttribute("data-pais");

        // Verificar se há dados suficientes para geocodificação
        if (!cidade || !estado || !pais) {
          showError(
            "Dados insuficientes para geocodificação. Verifique se cidade, estado e país estão preenchidos."
          );
          return;
        }

        try {
          // Atualizar estado do botão para loading
          button.disabled = true;
          button.classList.add("loading");
          button.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Buscando...';

          // Construir query para Nominatim
          const query = `${cidade}, ${estado}, ${pais}`;
          const encodedQuery = encodeURIComponent(query);

          // Fazer requisição para Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=1`,
            {
              headers: {
                "User-Agent": "MinhaApp/1.0 (diogomou@gmail.com)",
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              `Erro na requisição: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();

          if (data && data.length > 0) {
            const result = data[0];
            const latitude = result.lat;
            const longitude = result.lon;

            // Capturar dados adicionais da API
            const address = result.address || {};
            const municipality = address.municipality || "";
            const region = address.region || "";
            const postcode = address.postcode || "";
            const country = address.country || "";
            const country_code = address.country_code || "";

            // Salvar coordenadas e dados adicionais no banco
            await saveCoordinatesToDatabase(
              codparc,
              latitude,
              longitude,
              municipality,
              region,
              postcode,
              country,
              country_code
            );

            // Atualizar estado do botão para sucesso
            button.classList.remove("loading");
            button.classList.add("success");
            button.innerHTML = '<i class="fas fa-check"></i> Concluído';

            // Atualizar os dados na tabela
            coordinatesData[index].LATITUDE = latitude;
            coordinatesData[index].LONGETUDE = longitude;
            coordinatesData[index].MUNICIPALITY = municipality;
            coordinatesData[index].REGION = region;
            coordinatesData[index].POSTCODE = postcode;
            coordinatesData[index].PAIS = country;
            coordinatesData[index].COUNTRY_CODE = country_code;

            // Atualizar a linha na tabela
            const row = button.closest("tr");
            const latitudeCell = row.cells[2];
            const longitudeCell = row.cells[3];
            const municipalityCell = row.cells[7];
            const regionCell = row.cells[8];
            const postcodeCell = row.cells[9];
            const countryCell = row.cells[6];
            const countryCodeCell = row.cells[10];

            latitudeCell.textContent = latitude;
            longitudeCell.textContent = longitude;
            municipalityCell.textContent = municipality;
            regionCell.textContent = region;
            postcodeCell.textContent = postcode;
            countryCell.textContent = country;
            countryCodeCell.textContent = country_code;

            showSuccess(
              `Coordenadas encontradas e salvas: ${latitude}, ${longitude}`
            );

            // Resetar botão após 3 segundos
            setTimeout(() => {
              button.disabled = false;
              button.classList.remove("success");
              button.innerHTML =
                '<i class="fas fa-map-marker-alt"></i> Geocodificar';
            }, 3000);
          } else {
            throw new Error(
              "Nenhum resultado encontrado para o endereço informado"
            );
          }
        } catch (error) {
          console.error("Erro na geocodificação:", error);

          // Atualizar estado do botão para erro
          button.classList.remove("loading");
          button.classList.add("error");
          button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro';

          showError(`Erro na geocodificação: ${error.message}`);

          // Resetar botão após 5 segundos
          setTimeout(() => {
            button.disabled = false;
            button.classList.remove("error");
            button.innerHTML =
              '<i class="fas fa-map-marker-alt"></i> Geocodificar';
          }, 5000);
        }
      }

      // Função para salvar coordenadas no banco usando JX.salvar
      async function saveCoordinatesToDatabase(
        codparc,
        latitude,
        longitude,
        municipality,
        region,
        postcode,
        country,
        country_code
      ) {
        try {
          console.log("Iniciando salvamento no banco...");
          console.log("CODPARC:", codparc);
          console.log("Latitude:", latitude);
          console.log("Longitude:", longitude);
          console.log("Municipality:", municipality);
          console.log("Region:", region);
          console.log("Postcode:", postcode);
          console.log("Country:", country);
          console.log("Country Code:", country_code);

          // Verificar se SankhyaJX está disponível
          if (typeof JX === "undefined") {
            throw new Error("SankhyaJX não está disponível");
          }

          console.log("Métodos disponíveis no JX:", Object.keys(JX));

          // Tentar diferentes métodos de persistência
          let result;

          // Método 1: JX.salvar (se disponível)
          if (JX.salvar) {
            console.log("Usando JX.salvar...");

            // Primeiro verificar se o registro existe
            const checkSql = `SELECT CODIGO, CODPARC FROM AD_LATLONGPARC WHERE CODPARC = ${codparc}`;
            console.log("Verificando se registro existe:", checkSql);
            const checkResult = await JX.consultar(checkSql);
            console.log("Resultado da verificação:", checkResult);

            if (checkResult && checkResult.length > 0) {
              // Registro existe, fazer UPDATE usando JX.salvar
              console.log("Registro existe, fazendo UPDATE...");
              const existingRecord = checkResult[0];

              // Dados para atualizar
              const dadosParaAtualizar = {
                LATITUDE: latitude,
                LONGETUDE: longitude,
                MUNICIPALITY: municipality,
                REGION: region,
                POSTCODE: postcode,
                PAIS: country,
                COUNTRY_CODE: country_code,
              };

              // Chave primária para identificar o registro
              const chavePrimaria = {
                CODIGO: existingRecord.CODIGO,
                CODPARC: existingRecord.CODPARC,
              };

              console.log("Dados para atualizar:", dadosParaAtualizar);
              console.log("Chave primária:", chavePrimaria);

              result = await JX.salvar(
                dadosParaAtualizar,
                "AD_LATLONGPARC",
                chavePrimaria
              );
              console.log("Resultado JX.salvar UPDATE:", result);
            } else {
              // Registro não existe, fazer INSERT usando JX.salvar
              console.log("Registro não existe, fazendo INSERT...");

              // Dados para inserir
              const dadosParaInserir = {
                CODPARC: codparc,
                LATITUDE: latitude,
                LONGETUDE: longitude,
                MUNICIPALITY: municipality,
                REGION: region,
                POSTCODE: postcode,
                PAIS: country,
                COUNTRY_CODE: country_code,
              };

              console.log("Dados para inserir:", dadosParaInserir);

              result = await JX.salvar(dadosParaInserir, "AD_LATLONGPARC");
              console.log("Resultado JX.salvar INSERT:", result);
            }
          }
          // Método 2: JX.executar (alternativa comum)
          else if (JX.executar) {
            console.log("Usando JX.executar...");

            // Primeiro verificar se o registro existe
            const checkSql = `SELECT COUNT(*) as TOTAL FROM AD_LATLONGPARC WHERE CODPARC = ${codparc}`;
            console.log("Verificando se registro existe:", checkSql);
            const checkResult = await JX.consultar(checkSql);
            console.log("Resultado da verificação:", checkResult);

            if (
              checkResult &&
              checkResult.length > 0 &&
              checkResult[0].TOTAL > 0
            ) {
              // Registro existe, fazer UPDATE
              const updateSql = `
                UPDATE AD_LATLONGPARC 
                SET LATITUDE = '${latitude}', 
                    LONGETUDE = '${longitude}',
                    MUNICIPALITY = '${municipality}',
                    REGION = '${region}',
                    POSTCODE = '${postcode}',
                    PAIS = '${country}',
                    COUNTRY_CODE = '${country_code}'
                WHERE CODPARC = ${codparc}
              `;
              console.log("SQL UPDATE:", updateSql);
              result = await JX.executar(updateSql);
              console.log("Resultado JX.executar UPDATE:", result);
            } else {
              // Registro não existe, fazer INSERT
              const insertSql = `
                INSERT INTO AD_LATLONGPARC (CODPARC, LATITUDE, LONGETUDE, MUNICIPALITY, REGION, POSTCODE, PAIS, COUNTRY_CODE)
                VALUES (${codparc}, '${latitude}', '${longitude}', '${municipality}', '${region}', '${postcode}', '${country}', '${country_code}')
              `;
              console.log("SQL INSERT:", insertSql);
              result = await JX.executar(insertSql);
              console.log("Resultado JX.executar INSERT:", result);
            }
          }
          // Método 3: JX.consultar com INSERT/UPDATE (se suportado)
          else if (JX.consultar) {
            console.log("Tentando usar JX.consultar para UPDATE...");

            // Primeiro verificar se o registro existe
            const checkSql = `SELECT COUNT(*) as TOTAL FROM AD_LATLONGPARC WHERE CODPARC = ${codparc}`;
            console.log("Verificando se registro existe:", checkSql);
            const checkResult = await JX.consultar(checkSql);
            console.log("Resultado da verificação:", checkResult);

            if (
              checkResult &&
              checkResult.length > 0 &&
              checkResult[0].TOTAL > 0
            ) {
              // Registro existe, fazer UPDATE
              const updateSql = `
                UPDATE AD_LATLONGPARC 
                SET LATITUDE = '${latitude}', 
                    LONGETUDE = '${longitude}',
                    MUNICIPALITY = '${municipality}',
                    REGION = '${region}',
                    POSTCODE = '${postcode}',
                    PAIS = '${country}',
                    COUNTRY_CODE = '${country_code}'
                WHERE CODPARC = ${codparc}
              `;
              console.log("SQL UPDATE:", updateSql);
              result = await JX.consultar(updateSql);
              console.log("Resultado JX.consultar UPDATE:", result);
            } else {
              // Registro não existe, fazer INSERT
              const insertSql = `
                INSERT INTO AD_LATLONGPARC (CODPARC, LATITUDE, LONGETUDE, MUNICIPALITY, REGION, POSTCODE, PAIS, COUNTRY_CODE)
                VALUES (${codparc}, '${latitude}', '${longitude}', '${municipality}', '${region}', '${postcode}', '${country}', '${country_code}')
              `;
              console.log("SQL INSERT:", insertSql);
              result = await JX.consultar(insertSql);
              console.log("Resultado JX.consultar INSERT:", result);
            }
          } else {
            throw new Error(
              "Nenhum método de persistência encontrado no SankhyaJX"
            );
          }

          console.log("Salvamento concluído com sucesso!");

          // Verificar se os dados foram realmente salvos
          const verifySql = `SELECT LATITUDE, LONGETUDE FROM AD_LATLONGPARC WHERE CODPARC = ${codparc}`;
          console.log("Verificando dados salvos:", verifySql);
          const verifyResult = await JX.consultar(verifySql);
          console.log("Dados verificados:", verifyResult);

          if (verifyResult && verifyResult.length > 0) {
            const savedLat = verifyResult[0].LATITUDE;
            const savedLon = verifyResult[0].LONGETUDE;
            console.log(
              `Dados salvos - Latitude: ${savedLat}, Longitude: ${savedLon}`
            );

            if (savedLat === latitude && savedLon === longitude) {
              console.log("✅ Dados confirmados no banco!");
            } else {
              console.warn("⚠️ Dados não coincidem com o que foi salvo");
            }
          } else {
            console.warn("⚠️ Nenhum dado encontrado após salvamento");
          }

          return result;
        } catch (error) {
          console.error("Erro detalhado ao salvar no banco:", error);
          console.error("Stack trace:", error.stack);
          throw new Error(
            `Erro ao salvar coordenadas no banco: ${error.message}`
          );
        }
      }

      // Função para exportar dados para Excel
      function exportToExcel() {
        if (coordinatesData.length === 0) {
          showError("Não há dados para exportar. Carregue os dados primeiro.");
          return;
        }

        try {
          // Preparar dados para exportação
          const exportData = coordinatesData.map((item) => ({
            Código: item.CODIGO || "",
            "Código Parceiro": item.CODPARC || "",
            Latitude: item.LATITUDE || "",
            Longitude: item.LONGETUDE || "",
            Cidade: item.CIDADE || "",
            Estado: item.ESTADO || "",
            País: item.PAIS || "",
            Município: item.MUNICIPALITY || "",
            Região: item.REGION || "",
            CEP: item.POSTCODE || "",
            "Código País": item.COUNTRY_CODE || "",
          }));

          // Criar workbook
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(exportData);

          // Adicionar worksheet ao workbook
          XLSX.utils.book_append_sheet(wb, ws, "Coordenadas Geográficas");

          // Salvar arquivo
          XLSX.writeFile(
            wb,
            `coordenadas_geograficas_${
              new Date().toISOString().split("T")[0]
            }.xlsx`
          );

          showSuccess("Arquivo Excel exportado com sucesso!");
        } catch (error) {
          console.error("Erro ao exportar Excel:", error);
          showError(`Erro ao exportar Excel: ${error.message}`);
        }
      }

      // Função para exportar dados para PDF
      function exportToPDF() {
        if (coordinatesData.length === 0) {
          showError("Não há dados para exportar. Carregue os dados primeiro.");
          return;
        }

        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          // Configurar título
          doc.setFontSize(16);
          doc.setTextColor(0, 138, 112); // Cor verde da paleta
          doc.text("Coordenadas Geográficas - AD_LATLONGPARC", 20, 20);

          // Configurar data de exportação
          doc.setFontSize(10);
          doc.setTextColor(110, 110, 110); // Cor cinza da paleta
          doc.text(
            `Exportado em: ${new Date().toLocaleString("pt-BR")}`,
            20,
            30
          );

          // Preparar dados para tabela
          const tableData = coordinatesData.map((item) => [
            item.CODIGO || "",
            item.CODPARC || "",
            item.LATITUDE || "",
            item.LONGETUDE || "",
            item.CIDADE || "",
            item.ESTADO || "",
            item.PAIS || "",
            item.MUNICIPALITY || "",
            item.REGION || "",
            item.POSTCODE || "",
            item.COUNTRY_CODE || "",
          ]);

          // Configurar cabeçalhos da tabela
          const headers = [
            "Código",
            "Código Parceiro",
            "Latitude",
            "Longitude",
            "Cidade",
            "Estado",
            "País",
            "Município",
            "Região",
            "CEP",
            "Código País",
          ];

          // Gerar tabela
          doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 40,
            styles: {
              fontSize: 8,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [0, 138, 112], // Cor verde da paleta
              textColor: 255,
              fontStyle: "bold",
            },
            alternateRowStyles: {
              fillColor: [235, 235, 235], // Cor cinza claro da paleta
            },
          });

          // Salvar arquivo
          doc.save(
            `coordenadas_geograficas_${
              new Date().toISOString().split("T")[0]
            }.pdf`
          );

          showSuccess("Arquivo PDF exportado com sucesso!");
        } catch (error) {
          console.error("Erro ao exportar PDF:", error);
          showError(`Erro ao exportar PDF: ${error.message}`);
        }
      }

      // Carregar dados automaticamente quando a página carrega
      document.addEventListener("DOMContentLoaded", function () {
        loadData();
      });
    </script>
  </body>
</html>
