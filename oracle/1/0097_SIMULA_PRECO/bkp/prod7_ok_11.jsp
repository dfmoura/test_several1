<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<fmt:setLocale value="pt_BR"/>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  <style>
    html, body {
      font-size: 12.6px; 
    }
    
    table {
      font-size: 0.81rem;
    }
    
    input, button, select, textarea {
      font-size: 0.81rem; 
      padding: 0.45rem 0.675rem;
    }
    
    th {
      font-size: 0.85rem;
      padding: 0.45rem 0.675rem;
    }
    
    td {
      padding: 0.36rem 0.54rem;
    }
    
    .fixed-header thead th {
      position: sticky;
      top: 0;
      z-index: 20;
      background-color: #d1fae5;
    }
    
    #dataTable {
      width: 100%;
      border-collapse: collapse;
    }
    
    #dataTable th, #dataTable td {
      white-space: normal;
      overflow-wrap: break-word; 
      text-overflow: ellipsis;
      word-break: break-all; 
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    
    #dataTable thead {
      position: sticky;
      top: 0;
      z-index: 30;
    }
    
    #table-container {
      width: 100%;
      overflow: auto;
      max-height: 85vh;
    }
    
    body {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      padding-bottom: 1.5rem;
    }    
    
    @media (min-width: 1024px) {
      body {
        padding-left: 1rem;
        padding-right: 1rem;
        padding-bottom: 2rem;
      }
    }
    
    /* Larguras específicas para as colunas */
    .col-codtab { width: 40px; }
    .col-tabela { width: 40px; }
    .col-codprod { width: 60px; }
    .col-produto { width: 80px; }
    .col-marca { width: 70px; }
    .col-vol { width: 50px; }
    .col-pond { width: 70px; }
    .col-custo { width: 80px; }
    .col-preco { width: 80px; }
    .col-margem { width: 70px; }
    .col-preco15 { width: 80px; }
    .col-margem15 { width: 70px; }
    .col-preco35 { width: 80px; }
    .col-margem35 { width: 70px; }
    .col-ticket-obj { width: 80px; }
    .col-ticket-12m { width: 80px; }
    .col-ticket-safra { width: 80px; }
    .col-custo-atu { width: 80px; }
    .col-nova-margem { width: 90px; }
    .col-novo-preco { width: 90px; }
    .col-dt-vigor { width: 90px; }
  </style>
  <snk:load/>
</head>
<body class="bg-green-50 min-h-screen flex flex-col items-center py-6">
  <snk:query var="base">
    SELECT 
       CODTAB,
       NOMETAB,
       CODPROD,
       DESCRPROD,
       MARCA,
       AD_QTDVOLLT,
       POND_MARCA,

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

  <div class="w-full px-1 mb-4">
    <div class="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 items-center justify-between bg-green-100 rounded-lg p-4 shadow">
      <div class="flex items-center space-x-2">
        <label for="globalNewPrice" class="font-semibold text-green-900">Novo Preço (R$):</label>
        <input id="globalNewPrice" type="number" step="0.01" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-32" />
        <button id="applyGlobalPrice" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
      <div class="flex items-center space-x-2">
        <label for="globalDtVigor" class="font-semibold text-green-900">Dt. Vigor:</label>
        <input id="globalDtVigor" type="text" placeholder="dd/mm/aaaa" maxlength="10" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-40" />
        <button id="applyGlobalDtVigor" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
      <div class="flex items-center space-x-2">
        <label for="globalNewMargin" class="font-semibold text-green-900">Nova Margem (%):</label>
        <input id="globalNewMargin" type="number" step="0.01" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-32" />
        <button id="applyGlobalMargin" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
    </div>
  </div>

  <div id="table-container">
    <table id="dataTable" class="min-w-full bg-white rounded-lg shadow">
      <thead>
        <tr class="bg-green-200 text-green-900">
          <th class="col-codtab" title="Cód. Tab.">Cód.</th>
          <th class="col-tabela" title="Tabela">Tab.</th>
          <th class="col-codprod" title="Cód. Prod.">Cód. Prod.</th>
          <th class="col-produto" title="Produto">Produto</th>
          <th class="col-marca" title="Marca">Marca</th>
          <th class="col-vol">LT</th>
          <th class="col-pond">Peso</th>
          <th class="col-custo">Custo Satis</th>
          <th class="col-preco">Preço Tab.</th>
          <th class="col-margem">Margem</th>
          <th class="col-preco15">Preço (-15%)</th>
          <th class="col-margem15">Margem (-15%)</th>
          <th class="col-preco35">Preço (-35%)</th>
          <th class="col-margem35">Margem (-35%)</th>
          <th class="col-ticket-obj">Ticket Obj.</th>
          <th class="col-ticket-12m">Ticket 12M</th>
          <th class="col-ticket-safra">Ticket Safra</th>
          <th class="col-custo-atu">Custo Atual</th>
          <th class="col-nova-margem">Nova Margem</th>
          <th class="col-novo-preco">Novo Preço</th>
          <th class="col-dt-vigor">Dt. Vigor</th>
        </tr>
      </thead>
      <tbody>
        <c:forEach var="row" items="${base.rows}">
          <tr class="border-b border-green-100 hover:bg-green-50 transition">
            <td class="col-codtab" title="${row.CODTAB}">${row.CODTAB}</td>
            <td class="col-tabela" title="${row.NOMETAB}">${row.NOMETAB}</td>
            <td class="col-codprod" title="${row.CODPROD}">${row.CODPROD}</td>
            <td class="col-produto" title="${row.DESCRPROD}">${row.DESCRPROD}</td>
            <td class="col-marca" title="${row.MARCA}">${row.MARCA}</td>
            <td class="col-vol">${row.AD_QTDVOLLT}</td>
            <td class="col-pond">${row.POND_MARCA}</td>
            <td class="col-custo">
              <fmt:formatNumber value="${row.CUSTO_SATIS}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-preco">
              <fmt:formatNumber value="${row.PRECO_TAB}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-margem">
              <fmt:formatNumber value="${row.MARGEM}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-preco15">
              <fmt:formatNumber value="${row.PRECO_TAB_MENOS15}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-margem15">
              <fmt:formatNumber value="${row.MARGEM_MENOS15}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-preco35">
              <fmt:formatNumber value="${row.PRECO_TAB_MENOS65}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-margem35">
              <fmt:formatNumber value="${row.MARGEM_MENOS65}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-ticket-obj">
              <fmt:formatNumber value="${row.TICKET_MEDIO_OBJETIVO}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-ticket-12m">
              <fmt:formatNumber value="${row.TICKET_MEDIO_ULT_12_M}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-ticket-safra">
              <fmt:formatNumber value="${row.TICKET_MEDIO_SAFRA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-custo-atu">
              <fmt:formatNumber value="${row.CUSTO_SATIS_ATU}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
            </td>
            <td class="col-nova-margem">
              <input type="number" step="0.01" class="row-margin border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" />
            </td>
            <td class="col-novo-preco">
              <input type="number" step="0.01" class="row-price border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" />
            </td>
            <td class="col-dt-vigor">
              <input type="text" class="row-dtvigor border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" placeholder="dd/mm/aaaa" maxlength="10" />
            </td>
          </tr>
        </c:forEach>
      </tbody>
    </table>
  </div>

  <script>
    // Helper functions
    function calcMargin(newPrice, custo) {
      if (!newPrice || !custo) return '';
      return (((newPrice - custo) / newPrice) * 100).toFixed(2);
    }
    function calcPrice(newMargin, custo) {
      if (!newMargin || !custo) return '';
      return (custo / (1 - (newMargin / 100))).toFixed(2);
    }

    // Row event listeners
    document.querySelectorAll('.row-price').forEach(function(input) {
      input.addEventListener('input', function() {
        const custo = parseFloat(this.dataset.custo);
        const price = parseFloat(this.value);
        const row = this.closest('tr');
        const marginInput = row.querySelector('.row-margin');
        if (!isNaN(price) && !isNaN(custo)) {
          marginInput.value = calcMargin(price, custo);
        } else {
          marginInput.value = '';
        }
      });
    });
    document.querySelectorAll('.row-margin').forEach(function(input) {
      input.addEventListener('input', function() {
        const custo = parseFloat(this.dataset.custo);
        const margin = parseFloat(this.value);
        const row = this.closest('tr');
        const priceInput = row.querySelector('.row-price');
        if (!isNaN(margin) && !isNaN(custo)) {
          priceInput.value = calcPrice(margin, custo);
        } else {
          priceInput.value = '';
        }
      });
    });

    // Global input interactivity
    const globalPrice = document.getElementById('globalNewPrice');
    const globalMargin = document.getElementById('globalNewMargin');
    const globalDtVigor = document.getElementById('globalDtVigor');
    let globalSync = false;
    globalPrice.addEventListener('input', function() {
      if (globalSync) return;
      globalSync = true;
      const custo = getFirstCusto();
      if (!isNaN(parseFloat(this.value)) && !isNaN(custo)) {
        globalMargin.value = calcMargin(parseFloat(this.value), custo);
      } else {
        globalMargin.value = '';
      }
      globalSync = false;
    });
    globalMargin.addEventListener('input', function() {
      if (globalSync) return;
      globalSync = true;
      const custo = getFirstCusto();
      if (!isNaN(parseFloat(this.value)) && !isNaN(custo)) {
        globalPrice.value = calcPrice(parseFloat(this.value), custo);
      } else {
        globalPrice.value = '';
      }
      globalSync = false;
    });
    document.getElementById('applyGlobalPrice').addEventListener('click', function() {
      const price = parseFloat(globalPrice.value);
      document.querySelectorAll('.row-price').forEach(function(input) {
        if (!isNaN(price)) {
          input.value = price;
          const custo = parseFloat(input.dataset.custo);
          const row = input.closest('tr');
          const marginInput = row.querySelector('.row-margin');
          marginInput.value = calcMargin(price, custo);
        }
      });
    });
    document.getElementById('applyGlobalMargin').addEventListener('click', function() {
      const margin = parseFloat(globalMargin.value);
      document.querySelectorAll('.row-margin').forEach(function(input) {
        if (!isNaN(margin)) {
          input.value = margin;
          const custo = parseFloat(input.dataset.custo);
          const row = input.closest('tr');
          const priceInput = row.querySelector('.row-price');
          priceInput.value = calcPrice(margin, custo);
        }
      });
    });
    document.getElementById('applyGlobalDtVigor').addEventListener('click', function() {
      const dtVigor = globalDtVigor.value;
      if (!isValidBRDate(dtVigor)) {
        alert('Por favor, insira a data no formato dd/mm/aaaa.');
        return;
      }
      document.querySelectorAll('.row-dtvigor').forEach(function(input) {
        input.value = dtVigor;
      });
    });
    function getFirstCusto() {
      // Use the first row's CUSTO_SATIS_ATU as reference for global calculation
      const first = document.querySelector('.row-price');
      return first ? parseFloat(first.dataset.custo) : NaN;
    }
    // Date validation for dd/mm/yyyy
    function isValidBRDate(dateStr) {
      // Regex for dd/mm/yyyy
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
      const [d, m, y] = dateStr.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }
    // Optional: auto-format on input (for all date fields)
    function autoFormatDateInput(input) {
      input.addEventListener('input', function(e) {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
        if (v.length > 5) v = v.slice(0,5) + '/' + v.slice(5,9);
        input.value = v;
      });
    }
    autoFormatDateInput(globalDtVigor);
    document.querySelectorAll('.row-dtvigor').forEach(autoFormatDateInput);
  </script>
</body>
</html>
