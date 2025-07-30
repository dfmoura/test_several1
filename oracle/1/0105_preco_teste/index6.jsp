<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <!-- Add Flatpickr CSS and JS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://npmcdn.com/flatpickr/dist/l10n/pt.js"></script>
  <style>
    .filter-container {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin: 0 0 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .filter-header {
      padding: 12px 20px;
      background: #ffffff;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      transition: background-color 0.2s ease;
    }

    .filter-header:hover {
      background: #f8f9fa;
    }

    .filter-content {
      padding: 0 20px;
      max-height: 0;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(-10px);
    }

    .filter-content.expanded {
      padding: 20px;
      max-height: 500px;
      opacity: 1;
      transform: translateY(0);
    }

    .toggle-icon {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: #666;
      font-size: 12px;
    }

    .toggle-icon.expanded {
      transform: rotate(180deg);
    }

    .filter-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      align-items: end;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .input-group label {
      font-size: 13px;
      color: #444;
      font-weight: 500;
    }

    input[type="text"] {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    button {
      padding: 10px 20px;
      background: #23a059;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      height: 40px;
      min-width: 120px;
    }

    button:hover {
      background: #0e4928;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    button:active {
      transform: translateY(0);
    }

    .flatpickr-input {
      background-color: white;
      cursor: pointer;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      width: 100%;
    }
    
    .flatpickr-input:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 3px rgba(35, 160, 89, 0.1);
    }

    select {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      width: 100%;
      background-color: white;
    }

    select:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 3px rgba(35, 160, 89, 0.1);
    }

    /* Filtro Múltiplo por Marca */
    .filter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .filter-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow: hidden;
      animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    .filter-modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    }

    .filter-modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }

    .filter-modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .filter-modal-close:hover {
      background: #e9ecef;
      color: #333;
    }

    .filter-modal-content {
      padding: 24px;
      max-height: 400px;
      overflow-y: auto;
    }

    .filter-search {
      margin-bottom: 20px;
    }

    .filter-search input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .filter-search input:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 3px rgba(35, 160, 89, 0.1);
    }

    .filter-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .filter-option {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }

    .filter-option:hover {
      border-color: #23a059;
      background: #f8fff9;
    }

    .filter-option.selected {
      background: #23a059;
      border-color: #23a059;
      color: white;
    }

    .filter-option input[type="checkbox"] {
      margin-right: 8px;
      accent-color: #23a059;
    }

    .filter-option label {
      cursor: pointer;
      font-size: 14px;
      margin: 0;
      flex: 1;
    }

    .filter-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .filter-actions button {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .filter-actions .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .filter-actions .btn-secondary:hover {
      background: #5a6268;
    }

    .filter-actions .btn-primary {
      background: #23a059;
      color: white;
    }

    .filter-actions .btn-primary:hover {
      background: #0e4928;
    }

    .filter-badge {
      display: inline-flex;
      align-items: center;
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin: 2px;
      border: 1px solid #bbdefb;
    }

    .filter-badge .remove {
      margin-left: 6px;
      cursor: pointer;
      font-weight: bold;
      opacity: 0.7;
    }

    .filter-badge .remove:hover {
      opacity: 1;
    }

    .filter-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      color: #495057;
    }

    .filter-trigger:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    .filter-trigger i {
      font-size: 12px;
    }

    .filter-summary {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .no-filters {
      color: #6c757d;
      font-style: italic;
      font-size: 14px;
    }
  </style>
  <snk:load/>
</head>
<body>
  <div class="container mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6 text-center">Resumo Material</h1>
    
    <!-- Filtros -->
    <div class="filter-container">
      <div class="filter-header" onclick="toggleFilters()">
        <h3 style="margin: 0;">Filtros de Pesquisa</h3>
        <span class="toggle-icon">▼</span>
      </div>
      <div class="filter-content" id="filterContent">
        <div class="filter-form">
          <div class="input-group">
            <label for="empresaSelect">Empresa: *</label>
            <select id="empresaSelect" name="empresaSelect" required>
              <option value="">Carregando...</option>
            </select>
          </div>
          
          <div class="input-group">
            <label for="periodoInput">Período de Referência: *</label>
            <input type="text" id="periodoInput" name="periodoInput" placeholder="DD/MM/YYYY (obrigatório)" maxlength="10" required>
          </div>
          
          <div class="input-group">
            <label for="produtoSelect">Produto: (opcional)</label>
            <select id="produtoSelect" name="produtoSelect">
              <option value="">Carregando...</option>
            </select>
          </div>
          
          <button onclick="listarResumoMaterial()">Consultar</button>
        </div>
      </div>
    </div>

    <!-- Filtro Múltiplo por Marca -->
    <div class="filter-overlay" id="filterOverlay">
      <div class="filter-modal">
        <div class="filter-modal-header">
          <h3 class="filter-modal-title">Filtrar por Marca</h3>
          <button class="filter-modal-close" onclick="closeFilterModal()">&times;</button>
        </div>
        <div class="filter-modal-content">
          <div class="filter-search">
            <input type="text" id="filterSearch" placeholder="Pesquisar marcas..." onkeyup="filterBrands()">
          </div>
          <div class="filter-options" id="filterOptions">
            <!-- Opções serão carregadas dinamicamente -->
          </div>
          <div class="filter-actions">
            <button class="btn-secondary" onclick="clearAllFilters()">Limpar Todos</button>
            <button class="btn-primary" onclick="applyFilters()">Aplicar Filtros</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Controles de Filtro -->
    <div class="mb-4">
      <div class="flex items-center gap-4 mb-2">
        <button class="filter-trigger" onclick="openFilterModal()">
          <i class="fas fa-filter"></i>
          Filtrar por Marca
        </button>
        <button class="filter-trigger" onclick="clearAllFilters()" style="background: #fff3cd; border-color: #ffeaa7; color: #856404;">
          <i class="fas fa-times"></i>
          Limpar Filtros
        </button>
      </div>
      <div class="filter-summary" id="filterSummary">
        <span class="no-filters">Nenhum filtro aplicado</span>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded shadow">
        <thead>
          <tr class="bg-gray-200 text-gray-700">
            <th class="py-2 px-2 text-center">NUTAB</th>
            <th class="py-2 px-2 text-center">CODTAB</th>
            <th class="py-2 px-2 text-center">NOMETAB</th>
            <th class="py-2 px-2 text-center">CODPROD</th>
            <th class="py-2 px-2 text-center">DESCRPROD</th>
            <th class="py-2 px-2 text-center">MARCA</th>
            <th class="py-2 px-2 text-center">AD_QTDVOLLT</th>
            <th class="py-2 px-2 text-center">POND_MARCA</th>
            <th class="py-2 px-2 text-center">CUSTO_SATIS</th>
            <th class="py-2 px-2 text-center">PRECO_TAB</th>
            <th class="py-2 px-2 text-center">MARGEM</th>
            <th class="py-2 px-2 text-center">PRECO_TAB_MENOS15</th>
            <th class="py-2 px-2 text-center">MARGEM_MENOS15</th>
            <th class="py-2 px-2 text-center">PRECO_TAB_MENOS65</th>
            <th class="py-2 px-2 text-center">MARGEM_MENOS65</th>
            <th class="py-2 px-2 text-center">TICKET_MEDIO_OBJETIVO</th>
            <th class="py-2 px-2 text-center">TICKET_MEDIO_ULT_12_M</th>
            <th class="py-2 px-2 text-center">TICKET_MEDIO_SAFRA</th>
            <th class="py-2 px-2 text-center">CUSTO_SATIS_ATU</th>
          </tr>
        </thead>
        <tbody id="tbodyResumoMaterial">
          <!-- Dados dinâmicos -->
        </tbody>
      </table>
    </div>
    <div id="msg" class="mt-4 text-center"></div>
  </div>
  <script>
    // Variáveis globais para o filtro múltiplo
    let allBrands = [];
    let selectedBrands = [];
    let currentTableData = [];
    let originalTableData = [];

    // Função para formatar data de DD/MM/YYYY para DDMMYYYY
    function formatDateForQuery(dateStr) {
      if (!dateStr) return '';
      // Remove barras e espaços
      return dateStr.replace(/[\/\s]/g, '');
    }

    // Função para validar formato de data DD/MM/YYYY
    function isValidDate(dateStr) {
      if (!dateStr) return true; // Vazio é válido
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!regex.test(dateStr)) return false;
      
      const [, day, month, year] = dateStr.match(regex);
      const date = new Date(year, month - 1, day);
      return date.getDate() === parseInt(day) &&
             date.getMonth() === parseInt(month) - 1 &&
             date.getFullYear() === parseInt(year) &&
             date <= new Date(); // Garante que a data não é no futuro
    }

    function showMsg(msg, success = true) {
      const el = document.getElementById('msg');
      el.textContent = msg;
      el.className = success ? 'text-green-600' : 'text-red-600';
      setTimeout(() => { el.textContent = ''; }, 4000);
    }

    function toggleFilters() {
      const content = document.getElementById('filterContent');
      const icon = document.querySelector('.toggle-icon');
      
      content.classList.toggle('expanded');
      icon.classList.toggle('expanded');
    }

    function carregarEmpresas() {
      const sql = `SELECT CODEMP, NOMEFANTASIA FROM TSIEMP WHERE CODEMP <> 999 ORDER BY 1`;
      
      JX.consultar(sql).then(res => {
        const empresas = res || [];
        const select = document.getElementById('empresaSelect');
        select.innerHTML = '<option value="">Selecione uma empresa *</option>';
        
        empresas.forEach(empresa => {
          const option = document.createElement('option');
          option.value = empresa.CODEMP;
          option.textContent = `${empresa.CODEMP} - ${empresa.NOMEFANTASIA}`;
          select.appendChild(option);
        });
      }).catch(() => {
        showMsg('Erro ao carregar empresas', false);
      });
    }

    function carregarProdutos() {
      const sql = `SELECT CODPROD, DESCRPROD FROM tgfpro WHERE SUBSTR(CODGRUPOPROD, 1, 1) = '1' AND ATIVO='S' ORDER BY 2`;
      
      JX.consultar(sql).then(res => {
        const produtos = res || [];
        const select = document.getElementById('produtoSelect');
        select.innerHTML = '<option value="">Todos os produtos</option>';
        
        produtos.forEach(produto => {
          const option = document.createElement('option');
          option.value = produto.CODPROD;
          option.textContent = `${produto.CODPROD} - ${produto.DESCRPROD}`;
          select.appendChild(option);
        });
      }).catch(() => {
        showMsg('Erro ao carregar produtos', false);
      });
    }

    function listarResumoMaterial() {
      const periodoInput = document.getElementById('periodoInput').value;
      const empresaSelect = document.getElementById('empresaSelect');
      const produtoSelect = document.getElementById('produtoSelect');
      const empresa = empresaSelect.value;
      const codproduto = produtoSelect.value;

      // Validar se empresa foi selecionada
      if (!empresa) {
        showMsg('Por favor, selecione uma empresa', false);
        return;
      }

      // Validar se período foi informado
      if (!periodoInput) {
        showMsg('Por favor, informe o período de referência', false);
        return;
      }

      // Validar formato da data
      if (!isValidDate(periodoInput)) {
        showMsg('Por favor, insira a data no formato DD/MM/YYYY', false);
        return;
      }

      const periodo = formatDateForQuery(periodoInput);

      const sql = `
      
      SELECT 
          NVL(NUTAB,0) AS NUTAB,
          NVL(CODTAB,0)CODTAB,
          NVL(SUBSTR(NOMETAB, 1, 3),'0')  AS NOMETAB,
          NVL(CODPROD,0) AS CODPROD,
          NVL(DESCRPROD,0) AS DESCRPROD,
          NVL(MARCA,0) AS MARCA,
          NVL(AD_QTDVOLLT,0) AS AD_QTDVOLLT,
          NVL(POND_MARCA,0) AS POND_MARCA,
          NVL(CUSTO_SATIS,0) AS CUSTO_SATIS,
          NVL(PRECO_TAB,0) AS PRECO_TAB,
          NVL(MARGEM,0) AS MARGEM,
          NVL(PRECO_TAB_MENOS15,0) AS PRECO_TAB_MENOS15,
          NVL(MARGEM_MENOS15,0) AS MARGEM_MENOS15,
          NVL(PRECO_TAB_MENOS65,0) AS PRECO_TAB_MENOS65,
          NVL(MARGEM_MENOS65,0) AS MARGEM_MENOS65,
          NVL(TICKET_MEDIO_OBJETIVO,0) AS TICKET_MEDIO_OBJETIVO,
          NVL(TICKET_MEDIO_ULT_12_M,0) AS TICKET_MEDIO_ULT_12_M,
          NVL(TICKET_MEDIO_SAFRA,0) AS TICKET_MEDIO_SAFRA,
          NVL(CUSTO_SATIS_ATU,0) AS CUSTO_SATIS_ATU 
        FROM (

        WITH CUS AS (
        SELECT CODPROD, CODEMP, CUSTO_SATIS
        FROM (
        SELECT
          CODPROD,
          CODEMP,
          OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', TO_DATE('${periodo}', 'DDMMYYYY'), 3) AS CUSTO_SATIS,
          ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
        FROM TGFCUS
        WHERE DTATUAL <= TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP = ${empresa} 
        AND (${codproduto || 'NULL'} IS NULL OR CODPROD = ${codproduto || 'NULL'})    
        )
        WHERE RN = 1
        ),
        CUS_ATUAL AS (
        SELECT CODPROD, CODEMP, CUSTO_SATIS
        FROM (
        SELECT
          CODPROD,
          CODEMP,
          OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', TO_DATE('${periodo}', 'DDMMYYYY'), 3) AS CUSTO_SATIS,
          ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
        FROM TGFCUS
        WHERE DTATUAL <= TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP =  ${empresa} 
        AND (${codproduto || 'NULL'} IS NULL OR CODPROD = ${codproduto || 'NULL'})    
        )
        WHERE RN = 1
        ),
        PON AS (
        SELECT 
        CODEMP,
        PROD,
        CODPROD,
        DESCRPROD,
        MARCA,
        CODGRUPOPROD,
        DESCRGRUPOPROD,
        ROUND(SUM(QTD) /  NULLIF(SUM(SUM(QTD)) OVER (PARTITION BY CODEMP),0),2) AS POND_MARCA

        FROM VGF_VENDAS_SATIS
        WHERE DTNEG >= ADD_MONTHS(TO_DATE('${periodo}', 'DDMMYYYY'), -12)
        AND DTNEG < TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP =  ${empresa} 
        AND (${codproduto || 'NULL'} IS NULL OR CODPROD = ${codproduto || 'NULL'})    
        GROUP BY CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD
        ),
        MET AS (
        SELECT 
        MARCA, 
        SUM(QTDPREV) AS QTDPREV,
        SUM(VLR_PREV) AS VLR_PREV,
        SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0) AS TICKET_MEDIO_OBJETIVO
        FROM (
        SELECT DISTINCT
          MET.CODMETA,
          MET.DTREF,
          MET.CODVEND,
          MET.CODPARC,
          MET.MARCA,
          MET.QTDPREV,
          MET.QTDPREV * PRC.VLRVENDALT AS VLR_PREV
        FROM TGFMET MET
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
        LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
        LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
        WHERE MET.CODMETA = 4
        AND MET.DTREF BETWEEN 
            CASE 
                WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
                THEN TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') - INTERVAL '6' MONTH
                ELSE TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '6' MONTH
            END
        AND 
            CASE 
                WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
                THEN LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '5' MONTH)
                ELSE LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '17' MONTH)
            END
        )
        GROUP BY MARCA
        ),
        FAT AS (
        SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD,NVL(SUM(VLR),0) VLR,
        NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_ULT_12_M,NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_ULT_12_M
        FROM VGF_VENDAS_SATIS
        WHERE 
        DTNEG >= ADD_MONTHS(TO_DATE('${periodo}', 'DDMMYYYY'), -12)
        AND DTNEG < TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP =  ${empresa} 
        AND (${codproduto || 'NULL'} IS NULL OR CODPROD = ${codproduto || 'NULL'})    
        GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
        ),
        FAT1 AS (
        SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD_SAFRA,NVL(SUM(VLR),0) VLR_SAFRA,
        NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_SAFRA,NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_SAFRA
        FROM VGF_VENDAS_SATIS
        WHERE 
        DTNEG BETWEEN 
        CASE 
        WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
        THEN TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') - INTERVAL '6' MONTH
        ELSE TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '6' MONTH
        END
        AND 
        CASE 
        WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
        THEN LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '5' MONTH)
        ELSE LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '17' MONTH)
        END
        AND CODEMP = ${empresa}
        AND (${codproduto || 'NULL'} IS NULL OR CODPROD = ${codproduto || 'NULL'})    
        GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
        ),
        PRE_ATUAL AS (
        SELECT 
        CODTAB,NOMETAB,DTVIGOR,CODPROD,VLRVENDA_ATUAL
        FROM (
        SELECT
        TAB.CODTAB,
        NTA.NOMETAB,
        TAB.DTVIGOR,
        PRO.CODPROD,
        NVL(EXC.VLRVENDA,0) VLRVENDA_ATUAL,
        ROW_NUMBER() OVER (PARTITION BY TAB.CODTAB,PRO.CODPROD ORDER BY TAB.DTVIGOR DESC) AS RN
        FROM TGFPRO PRO
        INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
        LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
        LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
        LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
        WHERE SUBSTR(PRO.CODGRUPOPROD, 1, 1) = '1'
        AND NTA.ATIVO = 'S' AND PRO.ATIVO = 'S' AND TAB.DTVIGOR <= TO_DATE('${periodo}', 'DDMMYYYY')
        AND (${codproduto || 'NULL'} IS NULL OR PRO.CODPROD = ${codproduto || 'NULL'})    
        ) SUB
        WHERE RN = 1
        ),
        BAS AS (
        SELECT * FROM (
        SELECT DISTINCT
        TAB.NUTAB,
        NTA.CODTAB, 
        NTA.NOMETAB, 
        PRO.CODPROD, 
        PRO.DESCRPROD, 
        PRO.MARCA,
        PRO.AD_QTDVOLLT,
        NVL(PON.POND_MARCA, 0) AS POND_MARCA,
        TAB.DTVIGOR,
        NVL(SNK_GET_PRECO(TAB.NUTAB, PRO.CODPROD, TO_DATE('${periodo}', 'DDMMYYYY')), 0) AS PRECO_TAB,
        NVL(CUS.CUSTO_SATIS, 0) AS CUSTO_SATIS,
        MET.TICKET_MEDIO_OBJETIVO * PRO.AD_QTDVOLLT AS TICKET_MEDIO_OBJETIVO,
        MET.TICKET_MEDIO_OBJETIVO TICKET_MEDIO_OBJETIVO_MARCA,
        FAT.TICKET_MEDIO_ULT_12_M,
        FAT.TICKET_MEDIO_PRO_ULT_12_M,
        FAT1.TICKET_MEDIO_SAFRA,
        FAT1.TICKET_MEDIO_PRO_SAFRA,
        PRE.VLRVENDA_ATUAL,
        CUS_ATU.CUSTO_SATIS CUSTO_SATIS_ATU,
        ROW_NUMBER() OVER (PARTITION BY TAB.CODTAB, PRO.CODPROD ORDER BY TAB.DTVIGOR DESC) AS RN
        FROM TGFPRO PRO
        INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
        LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
        LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
        LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
        LEFT JOIN CUS ON PRO.CODPROD = CUS.CODPROD
        LEFT JOIN CUS_ATUAL CUS_ATU ON PRO.CODPROD = CUS_ATU.CODPROD
        LEFT JOIN PON ON PRO.CODPROD = PON.CODPROD
        LEFT JOIN MET ON PRO.MARCA = MET.MARCA
        LEFT JOIN FAT ON PRO.CODPROD = FAT.CODPROD
        LEFT JOIN FAT1 ON PRO.CODPROD = FAT1.CODPROD
        LEFT JOIN PRE_ATUAL PRE ON PRO.CODPROD = PRE.CODPROD AND TAB.CODTAB = PRE.CODTAB
        WHERE NTA.ATIVO = 'S'
        AND PRO.CODGRUPOPROD LIKE '1%'
        AND PRO.ATIVO = 'S'
        AND TAB.DTVIGOR <= TO_DATE('${periodo}', 'DDMMYYYY')
        AND (${codproduto || 'NULL'} IS NULL OR PRO.CODPROD = ${codproduto || 'NULL'})    
        ORDER BY NTA.CODTAB, PRO.CODPROD
        )WHERE RN = 1)

        SELECT 
        NUTAB,
        CODTAB, 
        NOMETAB, 
        CODPROD, 
        DESCRPROD, 
        MARCA,
        AD_QTDVOLLT,
        POND_MARCA,
        DTVIGOR,
        CUSTO_SATIS,
        PRECO_TAB,
        NVL(((PRECO_TAB - CUSTO_SATIS) / NULLIF(PRECO_TAB, 0)) * 100, 0) AS MARGEM,
        PRECO_TAB * 0.85 AS PRECO_TAB_MENOS15,
        NVL((((PRECO_TAB * 0.85) - CUSTO_SATIS) / NULLIF(PRECO_TAB * 0.85, 0)) * 100, 0) AS MARGEM_MENOS15,
        PRECO_TAB * 0.65 AS PRECO_TAB_MENOS65,
        NVL((((PRECO_TAB * 0.65) - CUSTO_SATIS) / NULLIF(PRECO_TAB * 0.65, 0)) * 100, 0) AS MARGEM_MENOS65,
        NVL(TICKET_MEDIO_OBJETIVO,0)TICKET_MEDIO_OBJETIVO,
        NVL(TICKET_MEDIO_PRO_ULT_12_M,0)TICKET_MEDIO_ULT_12_M,
        NVL(TICKET_MEDIO_PRO_SAFRA,0)TICKET_MEDIO_SAFRA,
        NVL(CUSTO_SATIS_ATU,0) CUSTO_SATIS_ATU
        FROM BAS

        UNION ALL

        SELECT 
        NULL NUTAB,
        CODTAB,
        NOMETAB,
        NULL CODPROD,
        '1' DESCRPROD,
        MARCA,
        NULL AD_QTDVOLLT,
        NULL POND_MARCA,
        NULL DTVIGOR,
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) AS CUSTO_SATIS,
        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) AS PRECO_TAB,

        NVL((
        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
        ) / NULLIF(SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM,

        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.85 AS PRECO_TAB_MENOS15,

        NVL((
        SUM(((PRECO_TAB*0.85) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
        ) / NULLIF( SUM(((PRECO_TAB*0.85) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) , 0) * 100, 0) AS MARGEM_MENOS15,

        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.65 AS PRECO_TAB_MENOS65,

        NVL((
        SUM(((PRECO_TAB*0.65)  / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
        ) / NULLIF(SUM(((PRECO_TAB*0.65)  / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM_MENOS65,


        TICKET_MEDIO_OBJETIVO_MARCA TICKET_MEDIO_OBJETIVO,
        SUM(TICKET_MEDIO_ULT_12_M  * POND_MARCA) AS TICKET_MEDIO_ULT_12_M,
        SUM(TICKET_MEDIO_SAFRA  * POND_MARCA) AS TICKET_MEDIO_SAFRA,
        SUM((CUSTO_SATIS_ATU / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) CUSTO_SATIS_ATU
        FROM BAS
        GROUP BY 
        CODTAB,
        NOMETAB,
        MARCA,
        TICKET_MEDIO_OBJETIVO_MARCA
        )
        ORDER BY 2,6,4 DESC  
          
      `;
      
      JX.consultar(sql).then(res => {
        const dados = res || [];
        
        // Armazenar dados originais e atuais
        originalTableData = [...dados];
        currentTableData = [...dados];
        
        // Limpar filtros anteriores
        selectedBrands = [];
        allBrands = [];
        
        // Renderizar dados
        renderTableData();
        updateFilterSummary();
        
        showMsg('Dados carregados com sucesso!', true);
      }).catch(() => showMsg('Erro ao listar dados', false));
    }

    // Funções do Filtro Múltiplo por Marca
    function openFilterModal() {
      document.getElementById('filterOverlay').style.display = 'block';
      loadBrandsForFilter();
    }

    function closeFilterModal() {
      document.getElementById('filterOverlay').style.display = 'none';
    }

    function loadBrandsForFilter() {
      if (allBrands.length === 0) {
        // Extrair marcas únicas dos dados atuais
        const brands = [...new Set(currentTableData.map(row => row.MARCA).filter(marca => marca))];
        allBrands = brands.sort();
      }
      
      renderFilterOptions();
    }

    function renderFilterOptions() {
      const container = document.getElementById('filterOptions');
      container.innerHTML = '';
      
      allBrands.forEach(brand => {
        const isSelected = selectedBrands.includes(brand);
        const option = document.createElement('div');
        option.className = `filter-option ${isSelected ? 'selected' : ''}`;
        option.onclick = () => toggleBrandSelection(brand);
        
        option.innerHTML = `
          <input type="checkbox" id="brand_${brand}" ${isSelected ? 'checked' : ''}>
          <label for="brand_${brand}">${brand}</label>
        `;
        
        container.appendChild(option);
      });
    }

    function toggleBrandSelection(brand) {
      const index = selectedBrands.indexOf(brand);
      if (index > -1) {
        selectedBrands.splice(index, 1);
      } else {
        selectedBrands.push(brand);
      }
      renderFilterOptions();
    }

    function filterBrands() {
      const searchTerm = document.getElementById('filterSearch').value.toLowerCase();
      const options = document.querySelectorAll('.filter-option');
      
      options.forEach(option => {
        const label = option.querySelector('label').textContent.toLowerCase();
        if (label.includes(searchTerm)) {
          option.style.display = 'flex';
        } else {
          option.style.display = 'none';
        }
      });
    }

    function applyFilters() {
      if (selectedBrands.length === 0) {
        // Se nenhuma marca selecionada, mostrar todos os dados
        currentTableData = [...originalTableData];
      } else {
        // Filtrar dados pelas marcas selecionadas
        currentTableData = originalTableData.filter(row => 
          selectedBrands.includes(row.MARCA)
        );
      }
      
      renderTableData();
      updateFilterSummary();
      closeFilterModal();
      showMsg(`Filtro aplicado: ${selectedBrands.length} marca(s) selecionada(s)`, true);
    }

    function clearAllFilters() {
      selectedBrands = [];
      currentTableData = [...originalTableData];
      renderTableData();
      updateFilterSummary();
      closeFilterModal();
      showMsg('Filtros removidos', true);
    }

    function updateFilterSummary() {
      const summary = document.getElementById('filterSummary');
      
      if (selectedBrands.length === 0) {
        summary.innerHTML = '<span class="no-filters">Nenhum filtro aplicado</span>';
      } else {
        summary.innerHTML = `
          <span style="font-size: 12px; color: #666;">Marcas selecionadas:</span>
          ${selectedBrands.map(brand => `
            <span class="filter-badge">
              ${brand}
              <span class="remove" onclick="removeBrandFilter('${brand}')">&times;</span>
            </span>
          `).join('')}
        `;
      }
    }

    function removeBrandFilter(brand) {
      const index = selectedBrands.indexOf(brand);
      if (index > -1) {
        selectedBrands.splice(index, 1);
        applyFilters();
      }
    }

    function renderTableData() {
      const tbody = document.getElementById('tbodyResumoMaterial');
      tbody.innerHTML = '';
      
      currentTableData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class='py-2 px-2 text-center'>${row.NUTAB ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.CODTAB ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.NOMETAB ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.CODPROD ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.DESCRPROD ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.MARCA ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.AD_QTDVOLLT ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.POND_MARCA ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.CUSTO_SATIS ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.PRECO_TAB ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.MARGEM ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.PRECO_TAB_MENOS15 ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.MARGEM_MENOS15 ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.PRECO_TAB_MENOS65 ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.MARGEM_MENOS65 ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.TICKET_MEDIO_OBJETIVO ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.TICKET_MEDIO_ULT_12_M ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.TICKET_MEDIO_SAFRA ?? ''}</td>
          <td class='py-2 px-2 text-center'>${row.CUSTO_SATIS_ATU ?? ''}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Fechar modal ao clicar fora dele
    document.addEventListener('click', function(event) {
      const overlay = document.getElementById('filterOverlay');
      const modal = document.querySelector('.filter-modal');
      
      if (event.target === overlay) {
        closeFilterModal();
      }
    });

    // Inicialização
    document.addEventListener('DOMContentLoaded', function() {
      // Inicializar Flatpickr para o campo de data
      const dateConfig = {
        dateFormat: "d/m/Y",
        locale: "pt",
        allowInput: true,
        maxDate: "today",
        wrap: true
      };

      flatpickr("#periodoInput", dateConfig);
      
      // Carregar empresas e produtos
      carregarEmpresas();
      carregarProdutos();
    });
  </script>
</body>
</html>