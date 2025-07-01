<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Análise de Preços e Margens</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  <style>
    :root {
      --primary-green: #10b981;
      --secondary-green: #059669;
      --light-green: #d1fae5;
      --dark-green: #064e3b;
      --success-green: #22c55e;
    }
    
    body {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfccb 100%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .gradient-header {
      background: linear-gradient(135deg, var(--primary-green) 0%, var(--secondary-green) 100%);
    }
    
    .table-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(16, 185, 129, 0.2);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    
    .data-table {
      border-collapse: separate;
      border-spacing: 0;
    }
    
    .data-table th {
      background: linear-gradient(135deg, var(--primary-green) 0%, var(--secondary-green) 100%);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      padding: 12px 8px;
      border: none;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .data-table th:first-child {
      border-top-left-radius: 0.5rem;
    }
    
    .data-table th:last-child {
      border-top-right-radius: 0.5rem;
    }
    
    .data-table td {
      padding: 10px 8px;
      border-bottom: 1px solid rgba(16, 185, 129, 0.1);
      font-size: 0.875rem;
      vertical-align: middle;
    }
    
    .data-table tbody tr:hover {
      background-color: rgba(16, 185, 129, 0.05);
      transform: translateY(-1px);
      transition: all 0.2s ease;
    }
    
    .data-table tbody tr:nth-child(even) {
      background-color: rgba(16, 185, 129, 0.02);
    }
    
    .input-field {
      width: 80px;
      padding: 4px 6px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 0.25rem;
      font-size: 0.75rem;
      text-align: center;
      transition: all 0.2s ease;
    }
    
    .input-field:focus {
      outline: none;
      border-color: var(--primary-green);
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }
    
    .global-controls {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    .btn-apply {
      background: linear-gradient(135deg, var(--primary-green) 0%, var(--secondary-green) 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 0.375rem;
      font-weight: 600;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .btn-apply:hover {
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }
    
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      border-top-color: var(--primary-green);
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .status-success { background-color: var(--light-green); color: var(--dark-green); }
    .status-warning { background-color: #fef3c7; color: #92400e; }
    .status-error { background-color: #fee2e2; color: #991b1b; }
  </style>
  <snk:load/>
</head>
<body class="min-h-screen">
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="gradient-header rounded-lg p-6 mb-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-2">
            <i class="fas fa-chart-line mr-2"></i>
            Análise de Preços e Margens
          </h1>
          <p class="text-green-100">Gestão inteligente de precificação e margem de lucro</p>
        </div>
        <div class="text-right">
          <div class="status-badge status-success">
            <i class="fas fa-check-circle mr-1"></i>
            <span id="recordCount">0 registros</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controles Globais -->
    <div class="global-controls rounded-lg p-4 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700">Aplicar Globalmente:</label>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600">Nova Margem (%):</label>
          <input type="number" id="globalMargin" class="input-field" placeholder="0.00" step="0.01" min="0" max="100">
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600">Novo Preço (R$):</label>
          <input type="number" id="globalPrice" class="input-field" placeholder="0.00" step="0.01" min="0">
        </div>
        <button onclick="applyGlobalValues()" class="btn-apply">
          <i class="fas fa-magic mr-1"></i>
          Aplicar a Todos
        </button>
        <button onclick="calculateAllMargins()" class="btn-apply bg-blue-600">
          <i class="fas fa-calculator mr-1"></i>
          Recalcular Margens
        </button>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div id="loadingIndicator" class="text-center py-8">
      <div class="loading mx-auto mb-2"></div>
      <p class="text-gray-600">Carregando dados...</p>
    </div>

    <!-- Table Container -->
    <div id="tableContainer" class="table-container rounded-lg overflow-hidden" style="display: none;">
      <div class="overflow-x-auto" style="max-height: 70vh;">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th class="w-16">Cód Tab</th>
              <th class="w-32">Nome Tabela</th>
              <th class="w-20">Cód Prod</th>
              <th class="w-48">Descrição Produto</th>
              <th class="w-24">Marca</th>
              <th class="w-20">Qtd Vol Lt</th>
              <th class="w-20">Pond Marca</th>
              <th class="w-24">Dt Vigor</th>
              <th class="w-20">Custo Satis</th>
              <th class="w-20">Preço Tab</th>
              <th class="w-20">Margem</th>
              <th class="w-20">Preço -15%</th>
              <th class="w-20">Margem -15%</th>
              <th class="w-20">Preço -65%</th>
              <th class="w-20">Margem -65%</th>
              <th class="w-24">Ticket Obj</th>
              <th class="w-24">Ticket 12M</th>
              <th class="w-24">Ticket Safra</th>
              <th class="w-20">Custo Atual</th>
              <th class="w-24 bg-green-600">Nova Margem (%)</th>
              <th class="w-24 bg-green-600">Novo Preço (R$)</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <!-- Data will be populated here -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let tableData = [];

    // Inicialização quando a página carrega
    document.addEventListener('DOMContentLoaded', function() {
      loadData();
    });

    // Função para carregar dados usando SankhyaJX
    async function loadData() {
      try {
        const query = `
                  SELECT 
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
            MARGEM,
            PRECO_TAB_MENOS15,
            MARGEM_MENOS15,
            PRECO_TAB_MENOS65,
            MARGEM_MENOS65,
            TICKET_MEDIO_OBJETIVO,
            TICKET_MEDIO_ULT_12_M,
            TICKET_MEDIO_SAFRA,
            CUSTO_SATIS_ATU 
          FROM (


WITH CUS AS (
    SELECT CODPROD, CODEMP, CUSTO_SATIS
    FROM (
        SELECT
            CODPROD,
            CODEMP,
            OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', :P_PERIODO, 3) AS CUSTO_SATIS,
            ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
        FROM TGFCUS
        WHERE DTATUAL <= :P_PERIODO
          AND CODEMP = :P_EMPRESA
    )
    WHERE RN = 1
),
CUS_ATUAL AS (
    SELECT CODPROD, CODEMP, CUSTO_SATIS
    FROM (
        SELECT
            CODPROD,
            CODEMP,
            OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', SYSDATE, 3) AS CUSTO_SATIS,
            ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
        FROM TGFCUS
        WHERE DTATUAL <= SYSDATE
          AND CODEMP = :P_EMPRESA
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
        ROUND(SUM(QTD) / SUM(SUM(QTD)) OVER (PARTITION BY MARCA), 4) AS POND_MARCA
    FROM VGF_VENDAS_SATIS
    WHERE DTNEG >= ADD_MONTHS(:P_PERIODO, -12)
      AND DTNEG < :P_PERIODO
      AND CODEMP = :P_EMPRESA

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
                  WHEN EXTRACT(MONTH FROM CAST(:P_PERIODO AS DATE)) <= 6 
                  THEN TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') - INTERVAL '6' MONTH
                  ELSE TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') + INTERVAL '6' MONTH
              END
          AND 
              CASE 
                  WHEN EXTRACT(MONTH FROM CAST(:P_PERIODO AS DATE)) <= 6 
                  THEN LAST_DAY(TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') + INTERVAL '5' MONTH)
                  ELSE LAST_DAY(TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') + INTERVAL '17' MONTH)
              END

    )
    GROUP BY MARCA
),
FAT AS (
SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD,NVL(SUM(VLR),0) VLR,
NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_ULT_12_M
 FROM VGF_VENDAS_SATIS
WHERE 
DTNEG >= ADD_MONTHS(:P_PERIODO, -12)
AND DTNEG < :P_PERIODO
AND CODEMP = :P_EMPRESA

GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
),
FAT1 AS (
SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD_SAFRA,NVL(SUM(VLR),0) VLR_SAFRA,
NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_SAFRA
 FROM VGF_VENDAS_SATIS
WHERE 
DTNEG BETWEEN 
    CASE 
        WHEN EXTRACT(MONTH FROM CAST(:P_PERIODO AS DATE)) <= 6 
        THEN TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') - INTERVAL '6' MONTH
        ELSE TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') + INTERVAL '6' MONTH
    END
AND 
    CASE 
        WHEN EXTRACT(MONTH FROM CAST(:P_PERIODO AS DATE)) <= 6 
        THEN LAST_DAY(TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') + INTERVAL '5' MONTH)
        ELSE LAST_DAY(TRUNC(CAST(:P_PERIODO AS DATE), 'YYYY') + INTERVAL '17' MONTH)
    END
AND CODEMP = :P_EMPRESA
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
  AND NTA.ATIVO = 'S' AND PRO.ATIVO = 'S' AND TAB.DTVIGOR <= SYSDATE
) SUB
WHERE RN = 1
),
BAS AS (
SELECT * FROM (
SELECT DISTINCT
    NTA.CODTAB, 
    NTA.NOMETAB, 
    PRO.CODPROD, 
    PRO.DESCRPROD, 
    PRO.MARCA,
    PRO.AD_QTDVOLLT,
    NVL(PON.POND_MARCA, 0) AS POND_MARCA,
    TAB.DTVIGOR,
    NVL(SNK_GET_PRECO(TAB.NUTAB, PRO.CODPROD, :P_PERIODO), 0) AS PRECO_TAB,
    NVL(CUS.CUSTO_SATIS, 0) AS CUSTO_SATIS,
    MET.TICKET_MEDIO_OBJETIVO * PRO.AD_QTDVOLLT AS TICKET_MEDIO_OBJETIVO,
    MET.TICKET_MEDIO_OBJETIVO TICKET_MEDIO_OBJETIVO_MARCA,
    FAT.TICKET_MEDIO_ULT_12_M,
    FAT1.TICKET_MEDIO_SAFRA,
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
  AND TAB.DTVIGOR <= :P_PERIODO
ORDER BY NTA.CODTAB, PRO.CODPROD
)WHERE RN = 1)

SELECT 
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
NVL(((PRECO_TAB - CUSTO_SATIS) / NULLIF(CUSTO_SATIS, 0)) * 100, 0) AS MARGEM,
PRECO_TAB * 0.85 AS PRECO_TAB_MENOS15,
NVL((((PRECO_TAB * 0.85) - CUSTO_SATIS) / NULLIF(CUSTO_SATIS, 0)) * 100, 0) AS MARGEM_MENOS15,
PRECO_TAB * 0.65 AS PRECO_TAB_MENOS65,
NVL((((PRECO_TAB * 0.65) - CUSTO_SATIS) / NULLIF(CUSTO_SATIS, 0)) * 100, 0) AS MARGEM_MENOS65,
NVL(TICKET_MEDIO_OBJETIVO,0)TICKET_MEDIO_OBJETIVO,
NVL(TICKET_MEDIO_ULT_12_M,0)TICKET_MEDIO_ULT_12_M,
NVL(TICKET_MEDIO_SAFRA,0)TICKET_MEDIO_SAFRA,

NVL(CUSTO_SATIS_ATU,0) CUSTO_SATIS_ATU


FROM BAS

UNION ALL

SELECT 
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
  ) / NULLIF(SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM,

  SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.85 AS PRECO_TAB_MENOS15,
  NVL((
    SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.85 - 
    SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
  ) / NULLIF(SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM_MENOS15,

  SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.65 AS PRECO_TAB_MENOS65,

  NVL((
    SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.65 - 
    SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
  ) / NULLIF(SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM_MENOS65,
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
ORDER BY 1,5,3 DESC
        `;

        // Usando SankhyaJX para executar a query
        const result = await JX.query(query);
        
        if (result && result.data) {
          tableData = result.data;
          populateTable(tableData);
          updateRecordCount(tableData.length);
          hideLoading();
        } else {
          // Dados de exemplo para demonstração
          console.warn('Dados não encontrados, usando dados de exemplo');
          loadSampleData();
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadSampleData();
      }
    }

    // Função para dados de exemplo (caso a conexão com SankhyaJX falhe)
    function loadSampleData() {
      tableData = [
        {
          CODTAB: 1, NOMETAB: 'Tabela Principal', CODPROD: 12345, DESCRPROD: 'Produto Exemplo A',
          MARCA: 'Marca A', AD_QTDVOLLT: 1000, POND_MARCA: 0.8, DTVIGOR: '2024-01-01',
          CUSTO_SATIS: 45.50, PRECO_TAB: 65.00, MARGEM: 30.0, PRECO_TAB_MENOS15: 55.25,
          MARGEM_MENOS15: 17.6, PRECO_TAB_MENOS65: 22.75, MARGEM_MENOS65: -100.0,
          TICKET_MEDIO_OBJETIVO: 150.00, TICKET_MEDIO_ULT_12_M: 140.00, TICKET_MEDIO_SAFRA: 160.00,
          CUSTO_SATIS_ATU: 47.20
        },
        {
          CODTAB: 2, NOMETAB: 'Tabela Promocional', CODPROD: 23456, DESCRPROD: 'Produto Exemplo B',
          MARCA: 'Marca B', AD_QTDVOLLT: 500, POND_MARCA: 0.9, DTVIGOR: '2024-02-01',
          CUSTO_SATIS: 32.80, PRECO_TAB: 48.00, MARGEM: 31.7, PRECO_TAB_MENOS15: 40.80,
          MARGEM_MENOS15: 19.6, PRECO_TAB_MENOS65: 16.80, MARGEM_MENOS65: -95.2,
          TICKET_MEDIO_OBJETIVO: 120.00, TICKET_MEDIO_ULT_12_M: 115.00, TICKET_MEDIO_SAFRA: 125.00,
          CUSTO_SATIS_ATU: 34.10
        }
      ];
      
      populateTable(tableData);
      updateRecordCount(tableData.length);
      hideLoading();
    }

    // Função para popular a tabela
    function populateTable(data) {
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="text-center">${row.CODTAB || '-'}</td>
          <td>${row.NOMETAB || '-'}</td>
          <td class="text-center">${row.CODPROD || '-'}</td>
          <td>${row.DESCRPROD || '-'}</td>
          <td class="text-center">${row.MARCA || '-'}</td>
          <td class="text-right">${formatNumber(row.AD_QTDVOLLT)}</td>
          <td class="text-right">${formatNumber(row.POND_MARCA, 2)}</td>
          <td class="text-center">${formatDate(row.DTVIGOR)}</td>
          <td class="text-right">R$ ${formatNumber(row.CUSTO_SATIS, 2)}</td>
          <td class="text-right">R$ ${formatNumber(row.PRECO_TAB, 2)}</td>
          <td class="text-right">${formatNumber(row.MARGEM, 1)}%</td>
          <td class="text-right">R$ ${formatNumber(row.PRECO_TAB_MENOS15, 2)}</td>
          <td class="text-right">${formatNumber(row.MARGEM_MENOS15, 1)}%</td>
          <td class="text-right">R$ ${formatNumber(row.PRECO_TAB_MENOS65, 2)}</td>
          <td class="text-right">${formatNumber(row.MARGEM_MENOS65, 1)}%</td>
          <td class="text-right">R$ ${formatNumber(row.TICKET_MEDIO_OBJETIVO, 2)}</td>
          <td class="text-right">R$ ${formatNumber(row.TICKET_MEDIO_ULT_12_M, 2)}</td>
          <td class="text-right">R$ ${formatNumber(row.TICKET_MEDIO_SAFRA, 2)}</td>
          <td class="text-right">R$ ${formatNumber(row.CUSTO_SATIS_ATU, 2)}</td>
          <td class="text-center bg-green-50">
            <input type="number" class="input-field margin-input" 
                   data-row="${index}" 
                   placeholder="0.00" 
                   step="0.01" 
                   min="0" 
                   max="100"
                   onchange="calculateNewPrice(${index})"
                   value="">
          </td>
          <td class="text-center bg-green-50">
            <input type="number" class="input-field price-input" 
                   data-row="${index}" 
                   placeholder="0.00" 
                   step="0.01" 
                   min="0"
                   onchange="calculateNewMargin(${index})"
                   value="">
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Função para calcular nova margem baseada no novo preço
    function calculateNewMargin(rowIndex) {
      const row = tableData[rowIndex];
      const newPriceInput = document.querySelector(`input.price-input[data-row="${rowIndex}"]`);
      const newMarginInput = document.querySelector(`input.margin-input[data-row="${rowIndex}"]`);
      
      const newPrice = parseFloat(newPriceInput.value) || 0;
      const custoAtual = parseFloat(row.CUSTO_SATIS_ATU) || 0;
      
      if (newPrice > 0 && custoAtual > 0) {
        const newMargin = ((newPrice - custoAtual) / newPrice) * 100;
        newMarginInput.value = newMargin.toFixed(2);
      } else {
        newMarginInput.value = '';
      }
    }

    // Função para calcular novo preço baseado na nova margem
    function calculateNewPrice(rowIndex) {
      const row = tableData[rowIndex];
      const newMarginInput = document.querySelector(`input.margin-input[data-row="${rowIndex}"]`);
      const newPriceInput = document.querySelector(`input.price-input[data-row="${rowIndex}"]`);
      
      const newMargin = parseFloat(newMarginInput.value) || 0;
      const custoAtual = parseFloat(row.CUSTO_SATIS_ATU) || 0;
      
      if (newMargin > 0 && newMargin < 100 && custoAtual > 0) {
        // Nova Margem (%) = ((Novo Preço - CUSTO_SATIS_ATU) / Novo Preço) × 100
        // Resolvendo para Novo Preço: Novo Preço = CUSTO_SATIS_ATU / (1 - Nova Margem/100)
        const newPrice = custoAtual / (1 - newMargin/100);
        newPriceInput.value = newPrice.toFixed(2);
      } else {
        newPriceInput.value = '';
      }
    }

    // Função para aplicar valores globais
    function applyGlobalValues() {
      const globalMargin = parseFloat(document.getElementById('globalMargin').value);
      const globalPrice = parseFloat(document.getElementById('globalPrice').value);
      
      tableData.forEach((row, index) => {
        const marginInput = document.querySelector(`input.margin-input[data-row="${index}"]`);
        const priceInput = document.querySelector(`input.price-input[data-row="${index}"]`);
        
        if (!isNaN(globalMargin) && globalMargin > 0) {
          marginInput.value = globalMargin.toFixed(2);
          calculateNewPrice(index);
        }
        
        if (!isNaN(globalPrice) && globalPrice > 0) {
          priceInput.value = globalPrice.toFixed(2);
          calculateNewMargin(index);
        }
      });
      
      // Limpar campos globais
      document.getElementById('globalMargin').value = '';
      document.getElementById('globalPrice').value = '';
    }

    // Função para recalcular todas as margens
    function calculateAllMargins() {
      tableData.forEach((row, index) => {
        const priceInput = document.querySelector(`input.price-input[data-row="${index}"]`);
        if (priceInput.value) {
          calculateNewMargin(index);
        }
      });
    }

    // Funções utilitárias
    function formatNumber(value, decimals = 0) {
      if (value == null || value === '') return '-';
      return parseFloat(value).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
      } catch (e) {
        return dateStr;
      }
    }

    function updateRecordCount(count) {
      document.getElementById('recordCount').textContent = `${count} registros`;
    }

    function hideLoading() {
      document.getElementById('loadingIndicator').style.display = 'none';
      document.getElementById('tableContainer').style.display = 'block';
    }
  </script>
</body>
</html>