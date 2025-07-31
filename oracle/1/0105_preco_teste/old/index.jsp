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
  <style>

  </style>
  <snk:load/>
</head>
<body>
  <div class="container mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6 text-center">Resumo Material</h1>
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
    function showMsg(msg, success = true) {
      const el = document.getElementById('msg');
      el.textContent = msg;
      el.className = success ? 'text-green-600' : 'text-red-600';
      setTimeout(() => { el.textContent = ''; }, 4000);
    }

    function listarResumoMaterial() {
      const sql = `
      
      
      
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
  OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', '01/06/2025', 3) AS CUSTO_SATIS,
  ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
FROM TGFCUS
WHERE DTATUAL <= '01/06/2025'
AND CODEMP = 1 
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
AND CODEMP = 1
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
WHERE DTNEG >= ADD_MONTHS('01/06/2025', -12)
AND DTNEG < '01/06/2025'
AND CODEMP = 1
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
        WHEN EXTRACT(MONTH FROM CAST('01/06/2025' AS DATE)) <= 6 
        THEN TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') - INTERVAL '6' MONTH
        ELSE TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') + INTERVAL '6' MONTH
    END
AND 
    CASE 
        WHEN EXTRACT(MONTH FROM CAST('01/06/2025' AS DATE)) <= 6 
        THEN LAST_DAY(TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') + INTERVAL '5' MONTH)
        ELSE LAST_DAY(TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') + INTERVAL '17' MONTH)
    END
)
GROUP BY MARCA
),
FAT AS (
SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD,NVL(SUM(VLR),0) VLR,
NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_ULT_12_M,NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_ULT_12_M
FROM VGF_VENDAS_SATIS
WHERE 
DTNEG >= ADD_MONTHS('01/06/2025', -12)
AND DTNEG < '01/06/2025'
AND CODEMP = 1
GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
),
FAT1 AS (
SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD_SAFRA,NVL(SUM(VLR),0) VLR_SAFRA,
NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_SAFRA,NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_SAFRA
FROM VGF_VENDAS_SATIS
WHERE 
DTNEG BETWEEN 
CASE 
WHEN EXTRACT(MONTH FROM CAST('01/06/2025' AS DATE)) <= 6 
THEN TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') - INTERVAL '6' MONTH
ELSE TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') + INTERVAL '6' MONTH
END
AND 
CASE 
WHEN EXTRACT(MONTH FROM CAST('01/06/2025' AS DATE)) <= 6 
THEN LAST_DAY(TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') + INTERVAL '5' MONTH)
ELSE LAST_DAY(TRUNC(CAST('01/06/2025' AS DATE), 'YYYY') + INTERVAL '17' MONTH)
END
AND CODEMP = 1
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
TAB.NUTAB,
NTA.CODTAB, 
NTA.NOMETAB, 
PRO.CODPROD, 
PRO.DESCRPROD, 
PRO.MARCA,
PRO.AD_QTDVOLLT,
NVL(PON.POND_MARCA, 0) AS POND_MARCA,
TAB.DTVIGOR,
NVL(SNK_GET_PRECO(TAB.NUTAB, PRO.CODPROD, '01/06/2025'), 0) AS PRECO_TAB,
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
AND TAB.DTVIGOR <= '01/06/2025'
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
      // Substitua o conteúdo de ... pelo WITH e UNION ALL do query.sql, se necessário
      JX.consultar(sql).then(res => {
        const dados = res || [];
        const tbody = document.getElementById('tbodyResumoMaterial');
        tbody.innerHTML = '';
        dados.forEach(row => {
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
      }).catch(() => showMsg('Erro ao listar dados', false));
    }
    // Inicialização
    listarResumoMaterial();
  </script>
</body>
</html>