<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<snk:load/>

<snk:query var="base">
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
</snk:query>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Análise de Preços e Margens</title>
  
  <!-- CSS Inline para garantir compatibilidade -->
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfccb 100%);
      color: #1f2937;
      line-height: 1.4;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .status-info {
      background: rgba(34, 197, 94, 0.1);
      color: #064e3b;
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
    }
    
    .controls {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .control-label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
    }
    
    .input-field {
      width: 80px;
      padding: 6px 8px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 4px;
      font-size: 12px;
      text-align: center;
      transition: border-color 0.2s;
    }
    
    .input-field:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
    }
    
    .btn {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }
    
    .btn-secondary:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    }
    
    .table-container {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .table-wrapper {
      overflow-x: auto;
      overflow-y: auto;
      max-height: 600px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 11px;
    }
    
    .data-table th {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 8px 6px;
      text-align: center;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: sticky;
      top: 0;
      z-index: 10;
      white-space: nowrap;
      min-width: 60px;
    }
    
    .data-table td {
      padding: 6px 4px;
      border-bottom: 1px solid rgba(16, 185, 129, 0.1);
      vertical-align: middle;
      white-space: nowrap;
    }
    
    .data-table tbody tr:nth-child(even) {
      background-color: rgba(16, 185, 129, 0.02);
    }
    
    .data-table tbody tr:hover {
      background-color: rgba(16, 185, 129, 0.05);
      transition: background-color 0.2s;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    .col-highlight {
      background-color: rgba(34, 197, 94, 0.08) !important;
    }
    
    .input-small {
      width: 70px;
      padding: 4px 6px;
      font-size: 11px;
    }
    
    @media (max-width: 768px) {
      .container { padding: 10px; }
      .controls { flex-direction: column; align-items: stretch; }
      .control-group { justify-content: space-between; }
      .data-table { font-size: 10px; }
      .data-table th, .data-table td { padding: 4px 2px; }
    }
  </style>
</head>

<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Análise de Preços e Margens</h1>
      <p>Gestão inteligente de precificação e margem de lucro</p>
      <div class="status-info">
        ✅ ${base.size()} registros carregados
      </div>
    </div>

    <!-- Controles Globais -->
    <div class="controls">
      <div class="control-group">
        <span class="control-label">Aplicar Globalmente:</span>
      </div>
      <div class="control-group">
        <label class="control-label">Nova Margem (%):</label>
        <input type="number" id="globalMargin" class="input-field" placeholder="0.00" step="0.01" min="0" max="100">
      </div>
      <div class="control-group">
        <label class="control-label">Novo Preço (R$):</label>
        <input type="number" id="globalPrice" class="input-field" placeholder="0.00" step="0.01" min="0">
      </div>
      <button onclick="applyGlobalValues()" class="btn">
        ✨ Aplicar a Todos
      </button>
      <button onclick="calculateAllMargins()" class="btn btn-secondary">
        🧮 Recalcular Margens
      </button>
    </div>

    <!-- Tabela de Dados -->
    <div class="table-container">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cód Tab</th>
              <th>Nome Tabela</th>
              <th>Cód Prod</th>
              <th>Descrição Produto</th>
              <th>Marca</th>
              <th>Qtd Vol</th>
              <th>Pond Marca</th>
              <th>Dt Vigor</th>
              <th>Custo Satis</th>
              <th>Preço Tab</th>
              <th>Margem</th>
              <th>Preço -15%</th>
              <th>Marg -15%</th>
              <th>Preço -65%</th>
              <th>Marg -65%</th>
              <th>Ticket Obj</th>
              <th>Ticket 12M</th>
              <th>Ticket Safra</th>
              <th>Custo Atual</th>
              <th style="background: #22c55e;">Nova Margem (%)</th>
              <th style="background: #22c55e;">Novo Preço (R$)</th>
            </tr>
          </thead>
          <tbody>
            <c:forEach var="row" items="${base.rows}" varStatus="status">
              <tr>
                <td class="text-center">${row.CODTAB}</td>
                <td>${row.NOMETAB}</td>
                <td class="text-center">${row.CODPROD}</td>
                <td>${row.DESCRPROD}</td>
                <td class="text-center">${row.MARCA}</td>
                <td class="text-right">
                  <fmt:formatNumber value="${row.AD_QTDVOLLT}" pattern="#,##0" />
                </td>
                <td class="text-right">
                  <fmt:formatNumber value="${row.POND_MARCA}" pattern="#,##0.00" />
                </td>
                <td class="text-center">
                  <fmt:formatDate value="${row.DTVIGOR}" pattern="dd/MM/yyyy" />
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.CUSTO_SATIS}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.PRECO_TAB}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  <fmt:formatNumber value="${row.MARGEM}" pattern="#,##0.0" />%
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.PRECO_TAB_MENOS15}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  <fmt:formatNumber value="${row.MARGEM_MENOS15}" pattern="#,##0.0" />%
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.PRECO_TAB_MENOS65}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  <fmt:formatNumber value="${row.MARGEM_MENOS65}" pattern="#,##0.0" />%
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.TICKET_MEDIO_OBJETIVO}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.TICKET_MEDIO_ULT_12_M}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.TICKET_MEDIO_SAFRA}" pattern="#,##0.00" />
                </td>
                <td class="text-right">
                  R$ <fmt:formatNumber value="${row.CUSTO_SATIS_ATU}" pattern="#,##0.00" />
                </td>
                <td class="text-center col-highlight">
                  <input type="number" 
                         class="input-field input-small margin-input" 
                         data-row="${status.index}" 
                         data-custo="${row.CUSTO_SATIS_ATU}"
                         placeholder="0.00" 
                         step="0.01" 
                         min="0" 
                         max="100"
                         onchange="calculateNewPrice(${status.index})"
                         title="Digite a nova margem desejada">
                </td>
                <td class="text-center col-highlight">
                  <input type="number" 
                         class="input-field input-small price-input" 
                         data-row="${status.index}" 
                         data-custo="${row.CUSTO_SATIS_ATU}"
                         placeholder="0.00" 
                         step="0.01" 
                         min="0"
                         onchange="calculateNewMargin(${status.index})"
                         title="Digite o novo preço desejado">
                </td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script type="text/javascript">
    // Função para calcular nova margem baseada no novo preço
    function calculateNewMargin(rowIndex) {
      try {
        var newPriceInput = document.querySelector('input.price-input[data-row="' + rowIndex + '"]');
        var newMarginInput = document.querySelector('input.margin-input[data-row="' + rowIndex + '"]');
        
        if (!newPriceInput || !newMarginInput) return;
        
        var newPrice = parseFloat(newPriceInput.value) || 0;
        var custoAtual = parseFloat(newPriceInput.getAttribute('data-custo')) || 0;
        
        if (newPrice > 0 && custoAtual > 0) {
          var newMargin = ((newPrice - custoAtual) / newPrice) * 100;
          newMarginInput.value = newMargin.toFixed(2);
        } else {
          newMarginInput.value = '';
        }
      } catch (e) {
        console.error('Erro ao calcular margem:', e);
      }
    }

    // Função para calcular novo preço baseado na nova margem
    function calculateNewPrice(rowIndex) {
      try {
        var newMarginInput = document.querySelector('input.margin-input[data-row="' + rowIndex + '"]');
        var newPriceInput = document.querySelector('input.price-input[data-row="' + rowIndex + '"]');
        
        if (!newMarginInput || !newPriceInput) return;
        
        var newMargin = parseFloat(newMarginInput.value) || 0;
        var custoAtual = parseFloat(newMarginInput.getAttribute('data-custo')) || 0;
        
        if (newMargin > 0 && newMargin < 100 && custoAtual > 0) {
          // Nova Margem (%) = ((Novo Preço - CUSTO_SATIS_ATU) / Novo Preço) × 100
          // Resolvendo para Novo Preço: Novo Preço = CUSTO_SATIS_ATU / (1 - Nova Margem/100)
          var newPrice = custoAtual / (1 - newMargin/100);
          newPriceInput.value = newPrice.toFixed(2);
        } else {
          newPriceInput.value = '';
        }
      } catch (e) {
        console.error('Erro ao calcular preço:', e);
      }
    }

    // Função para aplicar valores globais
    function applyGlobalValues() {
      try {
        var globalMargin = parseFloat(document.getElementById('globalMargin').value);
        var globalPrice = parseFloat(document.getElementById('globalPrice').value);
        
        var marginInputs = document.querySelectorAll('input.margin-input');
        var priceInputs = document.querySelectorAll('input.price-input');
        
        // Aplicar margem global
        if (!isNaN(globalMargin) && globalMargin > 0) {
          for (var i = 0; i < marginInputs.length; i++) {
            marginInputs[i].value = globalMargin.toFixed(2);
            calculateNewPrice(i);
          }
        }
        
        // Aplicar preço global
        if (!isNaN(globalPrice) && globalPrice > 0) {
          for (var i = 0; i < priceInputs.length; i++) {
            priceInputs[i].value = globalPrice.toFixed(2);
            calculateNewMargin(i);
          }
        }
        
        // Limpar campos globais
        document.getElementById('globalMargin').value = '';
        document.getElementById('globalPrice').value = '';
        
        alert('Valores aplicados com sucesso!');
      } catch (e) {
        console.error('Erro ao aplicar valores globais:', e);
        alert('Erro ao aplicar valores. Verifique os dados inseridos.');
      }
    }

    // Função para recalcular todas as margens
    function calculateAllMargins() {
      try {
        var priceInputs = document.querySelectorAll('input.price-input');
        for (var i = 0; i < priceInputs.length; i++) {
          if (priceInputs[i].value) {
            calculateNewMargin(i);
          }
        }
        alert('Margens recalculadas com sucesso!');
      } catch (e) {
        console.error('Erro ao recalcular margens:', e);
        alert('Erro ao recalcular margens.');
      }
    }

    // Inicialização
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Componente BI carregado com sucesso');
    });
  </script>
</body>
</html>