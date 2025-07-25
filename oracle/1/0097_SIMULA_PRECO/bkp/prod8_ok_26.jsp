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
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
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
      z-index: 50;
      background-color: #d1fae5;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    #dataTable thead th {
      position: sticky;
      top: 0;
      z-index: 50;
      background-color: #d1fae5;
      border: 1px solid #e5e7eb;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
    
    #dataTable thead tr:first-child th {
      position: sticky;
      top: 0;
      z-index: 51;
    }
    
    #dataTable thead tr:nth-child(2) th {
      position: sticky;
      top: 28px;
      z-index: 50;
    }
    
    #table-container {
      width: 100%;
      overflow: auto;
      max-height: 85vh;
      position: relative;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    /* Ensure table takes full width of container */
    #dataTable {
      width: 100%;
      border-collapse: collapse;
      background-color: white;
    }
    
    /* Improve sticky header compatibility */
    @supports (position: sticky) {
      #dataTable thead {
        position: -webkit-sticky;
        position: sticky;
        top: 0;
      }
      
      #dataTable thead th {
        position: -webkit-sticky;
        position: sticky;
        top: 0;
      }
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
    .col-nutab { width: 40px; }    
    .col-codtab { width: 50px; }
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


    .export-btn-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    
    .export-btn-overlay:hover {
      background-color: #45a049;
      transform: scale(1.1);
    }
    
    .export-btn-overlay i {
      pointer-events: none;
    }

    /* Loading overlay styles */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .loading-content {
      background-color: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 400px;
      width: 90%;
    }

    .loading-spinner {
      border: 4px solid #e5e7eb;
      border-top: 4px solid #10b981;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-title {
      color: #065f46;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .loading-message {
      color: #047857;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .loading-progress {
      background-color: #d1fae5;
      border-radius: 8px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .loading-progress-bar {
      background-color: #10b981;
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 8px;
    }

    /* Status overlay styles */
    .status-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .status-content {
      background-color: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 350px;
      width: 90%;
    }

    .status-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .status-icon.success {
      color: #10b981;
    }

    .status-icon.error {
      color: #ef4444;
    }

    .status-icon.processing {
      color: #f59e0b;
    }

    .status-title {
      color: #065f46;
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .status-message {
      color: #047857;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .status-button {
      background-color: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .status-button:hover {
      background-color: #059669;
    }

    /* Cores de fundo para grupos de tabela/marca */
    tr.bg-codtab-marca-0 {
      background-color: #ffffff; /* Branco para o primeiro grupo */
    }
    
    tr.bg-codtab-marca-1 {
      background-color: #f0fdf4; /* Verde muito claro para o segundo grupo */
    }
    
    /* Remove increment/decrement controls from number inputs */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    /*
    input[type="number"] {
      -moz-appearance: textfield;
    }
    */
    /* Destaque ao passar o mouse */
    tr:hover {
      background-color: #dcfce7 !important;
      transition: background-color 0.2s ease;
    }
    
    /* Borda de separação entre grupos distintos */
    tr.group-separator {
      border-top: 2px solid #bbf7d0;
    }
    
    /* Linhas mais escuras */
    #dataTable tbody tr {
      border-bottom: 2px solid #d1fae5;
    }
    
    #dataTable tbody tr td {
      border: 1px solid #bbf7d0;
    }
    
    /* Estilo especial para linhas de resumo (NUTAB = 0, CODPROD = NULL, DESCRPROD = 1) */
    tr.summary-row {
      background-color: #e0f2e9 !important;
      border-bottom: 3px solid #10b981;
    }
    
    tr.summary-row td {
      border: 1px solid #10b981;
    }    
  </style>
  <snk:load/>
</head>
<body class="bg-green-50 min-h-screen flex flex-col items-center py-6">
  <snk:query var="base">

  SELECT 
  NVL(NUTAB,0)NUTAB,
  CODTAB,
  SUBSTR(NOMETAB, 1, 3) NOMETAB,
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
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
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
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
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
AND MARCA IN (:P_MARCA)
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
AND (:P_CODPARC IS NULL OR CODPARC = :P_CODPARC)
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
AND MET.MARCA IN (:P_MARCA)
AND (:P_CODPARC IS NULL OR MET.CODPARC = :P_CODPARC)
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
SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTDNEG),0) QTD,NVL(SUM(VLR),0) VLR,
NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_ULT_12_M
FROM VGF_VENDAS_SATIS
WHERE 
DTNEG >= ADD_MONTHS(:P_PERIODO, -12)
AND DTNEG < :P_PERIODO
AND CODEMP = :P_EMPRESA
AND MARCA IN (:P_MARCA)
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
AND (:P_CODPARC IS NULL OR CODPARC = :P_CODPARC)
GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
),
FAT1 AS (
SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTDNEG),0) QTD_SAFRA,NVL(SUM(VLR),0) VLR_SAFRA,
NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_SAFRA
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
AND MARCA IN (:P_MARCA)
AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
AND (:P_CODPARC IS NULL OR CODPARC = :P_CODPARC)
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
AND (:P_CODTAB IS NULL OR TAB.CODTAB = :P_CODTAB)
AND (:P_CODPROD IS NULL OR PRO.CODPROD = :P_CODPROD)
AND PRO.MARCA IN (:P_MARCA)
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

AND (:P_CODTAB IS NULL OR TAB.CODTAB = :P_CODTAB)
AND (:P_CODPROD IS NULL OR PRO.CODPROD = :P_CODPROD)
AND PRO.MARCA IN (:P_MARCA)
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
NVL(TICKET_MEDIO_ULT_12_M,0)TICKET_MEDIO_ULT_12_M,
NVL(TICKET_MEDIO_SAFRA,0)TICKET_MEDIO_SAFRA,
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
ORDER BY 2,6,4 DESC  


  </snk:query>

  <div class="w-full px-1 mb-4">
    <div class="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 items-center justify-between bg-green-100 rounded-lg p-4 shadow">
      <div class="flex items-center space-x-2">
        <label for="globalNewPrice" class="font-semibold text-green-900">Novo Preço (R$):</label>
        <input id="globalNewPrice" type="number" step="0.01" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-32" />
        <button id="applyGlobalPrice" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
      <div class="flex items-center space-x-2">
        <label for="tableFilter" class="font-semibold text-green-900">Filtrar:</label>
        <input id="tableFilter" type="text" placeholder="Digite para filtrar..." class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-64" />
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
        <tr class="bg-green-100">
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th>Custo</th>
          <th colspan="2" style="background-color: #E49EDD; text-align: center;">Tab.</th>
          
          <th colspan="2" style="background-color: #0000FF; text-align: center; color: white;">Tab. Consum. (-15%)</th>
          
          <th colspan="2" style="background-color: #00FF00; text-align: center;">Tab. Rev. (-35%)</th>
          <th colspan="3">Ticket</th>

          <th>Custo</th>
          <th  colspan="2">Novo</th>
          
          <th></th>
        </tr>
        <tr class="bg-green-200 text-green-900">
          <th class="col-nutab" title="Cód. Tab.">Nú.</th>
          <th class="col-codtab" title="Cód. Tab.">Cód.</th>
          <th class="col-tabela" title="Tabela">Tab.</th>
          <th class="col-codprod" title="Cód. Prod.">Cód. Prod.</th>
          <th class="col-produto" title="Produto">Produto</th>
          <th class="col-marca" title="Marca">Marca</th>
          <th class="col-vol">LT</th>
          <th class="col-pond">Peso</th>
          <th class="col-custo">Satis</th>
          <th class="col-preco" style="background-color: #E49EDD; text-align: center;">Preço</th>
          <th class="col-margem" style="background-color: #E49EDD; text-align: center;">Margem</th>
          <th class="col-preco15" style="background-color: #0000FF; text-align: center;color: white;">Preço</th>
          <th class="col-margem15" style="background-color: #0000FF; text-align: center;color: white;">Margem</th>
          <th class="col-preco35" style="background-color: #00FF00; text-align: center;">Preço</th>
          <th class="col-margem35" style="background-color: #00FF00; text-align: center;">Margem</th>
          <th class="col-ticket-obj">Objetivo</th>
          <th class="col-ticket-12m">Últ. 12M</th>
          <th class="col-ticket-safra">Safra</th>
          <th class="col-custo-atu">Atual</th>
          <th class="col-nova-margem">Margem</th>
          <th class="col-novo-preco">Preço</th>
          <th class="col-dt-vigor">Dt. Vigor</th>
        </tr>
      </thead>
        <tbody>
          <c:set var="previousCodtabMarca" value=""/>
          <c:set var="groupCounter" value="0"/>
          
          <c:forEach var="row" items="${base.rows}" varStatus="loop">
            <c:set var="currentCodtabMarca" value="${row.CODTAB}-${row.MARCA}"/>
            
            <c:if test="${currentCodtabMarca != previousCodtabMarca}">
              <c:set var="groupCounter" value="${groupCounter + 1}"/>
              <c:set var="previousCodtabMarca" value="${currentCodtabMarca}"/>
            </c:if>
            
            <c:set var="groupClass" value="bg-codtab-marca-${groupCounter % 2}"/>
            <c:set var="separatorClass" value="${currentCodtabMarca != previousCodtabMarca && !loop.first ? 'group-separator' : ''}"/>
            
            <c:set var="isSummaryRow" value="${row.NUTAB == 0 && row.DESCRPROD == '1'}"/>
            <c:set var="rowClass" value="${isSummaryRow ? 'summary-row' : groupClass}"/>
            <tr class="border-b border-green-100 ${rowClass} ${separatorClass}">
              <td class="col-codtab" title="${row.CODTAB}">
                <c:choose>
                  <c:when test="${row.NUTAB == 0}">0</c:when>
                  <c:otherwise>${row.NUTAB}</c:otherwise>
                </c:choose>
              </td>
              <td class="col-codtab" title="${row.CODTAB}">${row.CODTAB}</td>
              <td class="col-tabela" title="${row.NOMETAB}">${row.NOMETAB}</td>
              <td class="col-codprod" title="${row.CODPROD}">
                <c:choose>
                  <c:when test="${row.CODPROD == null}"></c:when>
                  <c:otherwise>${row.CODPROD}</c:otherwise>
                </c:choose>
              </td>
              <td class="col-produto" title="${row.DESCRPROD}">
                <c:choose>
                  <c:when test="${row.DESCRPROD == '1'}">1</c:when>
                  <c:otherwise>${row.DESCRPROD}</c:otherwise>
                </c:choose>
              </td>
              <td class="col-marca" title="${row.MARCA}">${row.MARCA}</td>
              <td class="col-vol">${row.AD_QTDVOLLT}</td>
              <td class="col-pond">${row.POND_MARCA}</td>
              <td class="col-custo">
                <fmt:formatNumber value="${row.CUSTO_SATIS}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
              </td>
              <td class="col-preco" style="background-color: #f3cdef;">
                <fmt:formatNumber value="${row.PRECO_TAB}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
              </td>
              <td class="col-margem" style="background-color: #f3cdef;">
                <fmt:formatNumber value="${row.MARGEM}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
              </td>
              <td class="col-preco15" style="background-color: #7575ec; color: white;">
                <fmt:formatNumber value="${row.PRECO_TAB_MENOS15}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
              </td>
              <td class="col-margem15" style="background-color: #7575ec; color: white;">
                <fmt:formatNumber value="${row.MARGEM_MENOS15}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
              </td>
              <td class="col-preco35" style="background-color: #9dec9d;">
                <fmt:formatNumber value="${row.PRECO_TAB_MENOS65}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
              </td>
              <td class="col-margem35" style="background-color: #9dec9d;">
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
                <div class="flex items-center justify-center space-x-1">
                  <input type="number" step="0.01" class="row-price border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" data-preco-tab="${row.PRECO_TAB}" />
                  <span class="price-arrow text-sm ml-1"></span>
                </div>
              </td>
              <td class="col-dt-vigor">
                <input type="text" class="row-dtvigor border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" placeholder="dd/mm/aaaa" maxlength="10" />
              </td>
            </tr>
          </c:forEach>
        </tbody>
    </table>
  </div>

  <button id="exportJsonBtn" class="export-btn-overlay" title="Exportar para Excel" style="bottom: 20px; right: 20px;">
    <i class="fas fa-file-excel"></i>
  </button>
  
  <button id="insertDataBtn" class="export-btn-overlay" title="Inserir no Banco" style="bottom: 20px; right: 90px;">
    <i class="fas fa-database"></i>
  </button>

  <!-- Loading Overlay -->
  <div id="loadingOverlay" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-title">Processando...</div>
      <div id="loadingMessage" class="loading-message">Salvando dados na tabela...</div>
      <div class="loading-progress">
        <div id="loadingProgressBar" class="loading-progress-bar"></div>
      </div>
    </div>
  </div>

  <!-- Status Overlay -->
  <div id="statusOverlay" class="status-overlay">
    <div class="status-content">
      <div id="statusIcon" class="status-icon"></div>
      <div id="statusTitle" class="status-title"></div>
      <div id="statusMessage" class="status-message"></div>
      <button id="statusCloseBtn" class="status-button">OK</button>
    </div>
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
    
    function updatePriceArrow(priceInput) {
      const novoPreco = parseFloat(priceInput.value);
      const precoTab = parseFloat(priceInput.dataset.precoTab);
      const arrowSpan = priceInput.closest('td').querySelector('.price-arrow');
      
      if (isNaN(novoPreco) || isNaN(precoTab)) {
        arrowSpan.innerHTML = '';
        return;
      }
      
      if (novoPreco > precoTab) {
        arrowSpan.innerHTML = '<i class="fas fa-arrow-up text-green-600"></i>';
      } else if (novoPreco < precoTab) {
        arrowSpan.innerHTML = '<i class="fas fa-arrow-down text-red-600"></i>';
      } else {
        arrowSpan.innerHTML = '<i class="fas fa-minus text-gray-500"></i>';
      }
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
        
        // Update price arrow
        updatePriceArrow(this);
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
          updatePriceArrow(input);
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
          updatePriceArrow(priceInput);
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
    
    // Sticky header enhancement
    const tableContainer = document.getElementById('table-container');
    const tableHeader = document.querySelector('#dataTable thead');
    
    if (tableContainer && tableHeader) {
      tableContainer.addEventListener('scroll', function() {
        // Add shadow effect when scrolled
        if (this.scrollTop > 0) {
          tableHeader.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        } else {
          tableHeader.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        }
      });
      
      // Ensure header is properly positioned on page load
      window.addEventListener('load', function() {
        tableHeader.style.position = 'sticky';
        tableHeader.style.top = '0';
        
        // Ensure both header rows are properly positioned
        const firstRow = tableHeader.querySelector('tr:first-child');
        const secondRow = tableHeader.querySelector('tr:nth-child(2)');
        
        if (firstRow) {
          firstRow.style.position = 'sticky';
          firstRow.style.top = '0';
          firstRow.style.zIndex = '51';
        }
        
        if (secondRow) {
          secondRow.style.position = 'sticky';
          secondRow.style.top = '28px';
          secondRow.style.zIndex = '50';
        }
      });
    }
  </script>

<script>
  // Função para converter data de dd/mm/aaaa para aaaa-mm-dd
  function convertDateToOracle(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    }
    return null;
  }

  // Função para coletar dados da tabela
  function collectTableData() {
    const table = document.getElementById('dataTable');
    const rows = table.querySelectorAll('tbody tr');
    const data = [];
    
    rows.forEach(row => {
      // Only process visible rows (not filtered out)
      if (row.style.display === 'none') {
        return;
      }
      
      const cells = row.cells;
      const rowData = {
        numeroTabela: cells[0].textContent.trim(),
        codigoTabela: cells[1].textContent.trim(),
        codigoProduto: cells[3].textContent.trim(),
        novoPreco: row.querySelector('.row-price').value,
        dataVigor: row.querySelector('.row-dtvigor').value
      };
      
      // Só adiciona se pelo menos um dos campos editáveis tiver valor
      if (rowData.novoPreco || rowData.dataVigor) {
        data.push(rowData);
      }
    });
    
    return data;
  }

  // Função para formatar números no padrão brasileiro
  function formatBrazilianNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Função para converter string numérica para formato brasileiro
  function convertToBrazilianFormat(value) {
    if (!value || value.trim() === '') return '';
    
    // Remove any existing formatting and convert to number
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleanValue);
    
    if (isNaN(num)) return value;
    
    // Format with Brazilian locale (comma as decimal, dot as thousands)
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Função para coletar dados da tabela para Excel (apenas linhas visíveis)
  function collectTableDataForExcel() {
    const table = document.getElementById('dataTable');
    const rows = table.querySelectorAll('tbody tr');
    const data = [];
    
    rows.forEach(row => {
      // Only process visible rows (not filtered out)
      if (row.style.display === 'none') {
        return;
      }
      
      const cells = row.cells;
      const rowData = {
        'Nú.': cells[0].textContent.trim(),
        'Cód.': cells[1].textContent.trim(),
        'Tab.': cells[2].textContent.trim(),
        'Cód. Prod.': cells[3].textContent.trim(),
        'Produto': cells[4].textContent.trim(),
        'Marca': cells[5].textContent.trim(),
        'LT': convertToBrazilianFormat(cells[6].textContent.trim()),
        'Peso': convertToBrazilianFormat(cells[7].textContent.trim()),
        'Custo Satis': convertToBrazilianFormat(cells[8].textContent.trim()),
        'Preço Tab.': convertToBrazilianFormat(cells[9].textContent.trim()),
        'Margem Tab.': convertToBrazilianFormat(cells[10].textContent.trim()),
        'Preço Consum.': convertToBrazilianFormat(cells[11].textContent.trim()),
        'Margem Consum.': convertToBrazilianFormat(cells[12].textContent.trim()),
        'Preço Rev.': convertToBrazilianFormat(cells[13].textContent.trim()),
        'Margem Rev.': convertToBrazilianFormat(cells[14].textContent.trim()),
        'Ticket Objetivo': convertToBrazilianFormat(cells[15].textContent.trim()),
        'Ticket Últ. 12M': convertToBrazilianFormat(cells[16].textContent.trim()),
        'Ticket Safra': convertToBrazilianFormat(cells[17].textContent.trim()),
        'Custo Atual': convertToBrazilianFormat(cells[18].textContent.trim()),
        'Nova Margem': convertToBrazilianFormat(row.querySelector('.row-margin').value),
        'Novo Preço': convertToBrazilianFormat(row.querySelector('.row-price').value),
        'Dt. Vigor': row.querySelector('.row-dtvigor').value
      };
      
      data.push(rowData);
    });
    
    return data;
  }

  // Event listener para exportar Excel
  document.getElementById('exportJsonBtn').addEventListener('click', function() {
    const data = collectTableDataForExcel();
    
    if (data.length === 0) {
      showStatusOverlay('Aviso', 'Nenhum dado para exportar. A tabela está vazia ou não há linhas visíveis com o filtro atual.', 'error');
      return;
    }
    
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },   // Nú.
        { wch: 8 },   // Cód.
        { wch: 6 },   // Tab.
        { wch: 12 },  // Cód. Prod.
        { wch: 40 },  // Produto
        { wch: 10 },  // Marca
        { wch: 6 },   // LT
        { wch: 8 },   // Peso
        { wch: 12 },  // Custo Satis
        { wch: 12 },  // Preço Tab.
        { wch: 12 },  // Margem Tab.
        { wch: 12 },  // Preço Consum.
        { wch: 12 },  // Margem Consum.
        { wch: 12 },  // Preço Rev.
        { wch: 12 },  // Margem Rev.
        { wch: 12 },  // Ticket Objetivo
        { wch: 12 },  // Ticket Últ. 12M
        { wch: 12 },  // Ticket Safra
        { wch: 12 },  // Custo Atual
        { wch: 12 },  // Nova Margem
        { wch: 12 },  // Novo Preço
        { wch: 12 }   // Dt. Vigor
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Resumo Material');
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filename = `resumo_material_${dateStr}_${timeStr}.xlsx`;
      
      // Export the file
      XLSX.writeFile(wb, filename);
      
      showStatusOverlay('Sucesso', `${data.length} linhas exportadas para Excel com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      showStatusOverlay('Erro', 'Erro ao exportar arquivo Excel. Verifique o console para detalhes.', 'error');
    }
  });

// Função para buscar o próximo ID disponível na tabela
async function getNextId() {
  const result = await JX.consultar('SELECT MAX(ID) AS MAXID FROM AD_TESTEPRECO');
  const maxId = result?.[0]?.MAXID || 0;
  return parseInt(maxId, 10) + 1;
}


// Status overlay functions
function showStatusOverlay(title, message, type = 'success') {
  const overlay = document.getElementById('statusOverlay');
  const icon = document.getElementById('statusIcon');
  const titleEl = document.getElementById('statusTitle');
  const messageEl = document.getElementById('statusMessage');
  
  icon.className = `status-icon ${type}`;
  
  if (type === 'success') {
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
  } else if (type === 'error') {
    icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
  } else if (type === 'processing') {
    icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  overlay.style.display = 'flex';
}

function hideStatusOverlay() {
  document.getElementById('statusOverlay').style.display = 'none';
}

    // Close button event listener
    document.getElementById('statusCloseBtn').addEventListener('click', hideStatusOverlay);

    // Table filtering functionality
    const tableFilter = document.getElementById('tableFilter');
    const dataTable = document.getElementById('dataTable');
    const tbody = dataTable.querySelector('tbody');
    const originalRows = Array.from(tbody.querySelectorAll('tr'));

    function filterTable() {
      const filterValue = tableFilter.value.toLowerCase().trim();
      
      if (!filterValue) {
        // Show all rows if filter is empty
        originalRows.forEach(row => {
          row.style.display = '';
        });
        return;
      }

      // Split filter terms by pipe character
      const searchTerms = filterValue.split('|').map(term => term.trim()).filter(term => term.length > 0);
      
      originalRows.forEach(row => {
        const cells = Array.from(row.cells);
        const rowText = cells.map(cell => cell.textContent || cell.innerText).join(' ').toLowerCase();
        
        // Check if any search term matches the row text
        const matches = searchTerms.some(term => rowText.includes(term));
        
        row.style.display = matches ? '' : 'none';
      });
    }

    // Add event listener for real-time filtering
    tableFilter.addEventListener('input', filterTable);

    // Reorganizando o evento do botão
    document.getElementById('insertDataBtn').addEventListener('click', async function () {
  const btn = this;
  btn.disabled = true;

  const rawData = collectTableData();
  
  // Validate that both novoPreco and dataVigor are filled for each record
  const invalidRecords = rawData.filter(item => 
    item.codigoProduto?.trim() !== '' && 
    (!item.novoPreco?.trim() || !item.dataVigor?.trim())
  );
  
  if (invalidRecords.length > 0) {
    showStatusOverlay('Validação', 'Todos os registros devem ter tanto o Novo Preço quanto a Data de Vigor preenchidos. Verifique os campos vazios.', 'error');
    btn.disabled = false;
    return;
  }
  
  const data = rawData.filter(item =>
    item.codigoProduto?.trim() !== '' &&
    item.novoPreco?.trim() !== '' &&
    item.dataVigor?.trim() !== ''
  );

  if (data.length === 0) {
    showStatusOverlay('Aviso', 'Nenhum dado válido encontrado para inserir. Por favor, preencha tanto o Novo Preço quanto a Data de Vigor para pelo menos um registro.', 'error');
    btn.disabled = false;
    return;
  }

  // Show processing overlay
  showStatusOverlay('Processando...', `Inserindo ${data.length} registros no banco de dados...`, 'processing');

  try {
    for (const item of data) {
      const nextId = await getNextId();

      const record = {
        ID: nextId,
        NUTAB: item.numeroTabela || '',
        CODTAB: item.codigoTabela || '',
        CODPROD: item.codigoProduto || '',
        NOVO_PRECO: item.novoPreco || '',
        DTVIGOR: item.dataVigor || ''
      };

      await JX.salvar(record, 'AD_TESTEPRECO');
      console.log(`Registro ${nextId} salvo com sucesso.`);
    }



    showStatusOverlay('Sucesso', `${data.length} registros foram salvos com sucesso!`, 'success');
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    showStatusOverlay('Erro', 'Erro ao salvar dados. Verifique o console para detalhes.', 'error');
  } finally {
    btn.disabled = false;
  }
});
</script>
</body>
</html>