<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Debug SQL</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <snk:load/>
</head>
<body>
  <div class="container mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6 text-center">Debug SQL - Teste por Partes</h1>
    
    <div class="mb-6">
      <button onclick="testarDual()" class="bg-blue-500 text-white px-4 py-2 rounded">1. Testar Dual</button>
      <button onclick="testarCUS()" class="bg-green-500 text-white px-4 py-2 rounded ml-2">2. Testar CUS</button>
      <button onclick="testarPON()" class="bg-yellow-500 text-white px-4 py-2 rounded ml-2">3. Testar PON</button>
      <button onclick="testarMET()" class="bg-purple-500 text-white px-4 py-2 rounded ml-2">4. Testar MET</button>
      <button onclick="testarFAT()" class="bg-red-500 text-white px-4 py-2 rounded ml-2">5. Testar FAT</button>
      <button onclick="testarBAS()" class="bg-indigo-500 text-white px-4 py-2 rounded ml-2">6. Testar BAS</button>
      <button onclick="testarFinal()" class="bg-pink-500 text-white px-4 py-2 rounded ml-2">7. Testar Final</button>
    </div>
    
    <div id="resultado" class="mt-4 p-4 bg-gray-100 rounded">
      <p class="text-gray-600">Clique em um botão para testar...</p>
    </div>
  </div>

  <script>
    function showResult(title, data, error = null) {
      const resultado = document.getElementById('resultado');
      let html = `<h3 class="font-bold text-lg mb-2">${title}</h3>`;
      
      if (error) {
        html += `<div class="text-red-600 mb-2">Erro: ${error}</div>`;
      }
      
      if (data && data.length > 0) {
        html += `<div class="text-green-600 mb-2">✓ Sucesso! ${data.length} registros encontrados</div>`;
        html += `<div class="text-sm text-gray-700">Primeiros 3 registros:</div>`;
        html += `<pre class="bg-white p-2 rounded text-xs overflow-auto">${JSON.stringify(data.slice(0, 3), null, 2)}</pre>`;
      } else {
        html += `<div class="text-yellow-600">⚠ Nenhum registro encontrado</div>`;
      }
      
      resultado.innerHTML = html;
    }

    function testarDual() {
      const sql = `SELECT 1 as teste FROM DUAL`;
      JX.consultar(sql).then(res => {
        showResult("Teste Dual", res);
      }).catch(err => {
        showResult("Teste Dual", null, err.message);
      });
    }

    function testarCUS() {
      const sql = `
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
        AND ROWNUM <= 5
      `;
      JX.consultar(sql).then(res => {
        showResult("Teste CUS", res);
      }).catch(err => {
        showResult("Teste CUS", null, err.message);
      });
    }

    function testarPON() {
      const sql = `
        SELECT 
          CODEMP,
          PROD,
          CODPROD,
          DESCRPROD,
          MARCA,
          CODGRUPOPROD,
          DESCRGRUPOPROD,
          ROUND(SUM(QTD) / NULLIF(SUM(SUM(QTD)) OVER (PARTITION BY CODEMP),0),2) AS POND_MARCA
        FROM VGF_VENDAS_SATIS
        WHERE DTNEG >= ADD_MONTHS('01/06/2025', -12)
        AND DTNEG < '01/06/2025'
        AND CODEMP = 1 
        GROUP BY CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD
        AND ROWNUM <= 5
      `;
      JX.consultar(sql).then(res => {
        showResult("Teste PON", res);
      }).catch(err => {
        showResult("Teste PON", null, err.message);
      });
    }

    function testarMET() {
      const sql = `
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
        AND ROWNUM <= 5
      `;
      JX.consultar(sql).then(res => {
        showResult("Teste MET", res);
      }).catch(err => {
        showResult("Teste MET", null, err.message);
      });
    }

    function testarFAT() {
      const sql = `
        SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, 
               NVL(SUM(QTD),0) QTD,NVL(SUM(VLR),0) VLR,
               NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_ULT_12_M,
               NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_ULT_12_M
        FROM VGF_VENDAS_SATIS
        WHERE DTNEG >= ADD_MONTHS('01/06/2025', -12)
        AND DTNEG < '01/06/2025'
        AND CODEMP = 1 
        GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
        AND ROWNUM <= 5
      `;
      JX.consultar(sql).then(res => {
        showResult("Teste FAT", res);
      }).catch(err => {
        showResult("Teste FAT", null, err.message);
      });
    }

    function testarBAS() {
      const sql = `
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
          LEFT JOIN (
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
          ) CUS ON PRO.CODPROD = CUS.CODPROD
          LEFT JOIN (
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
          ) CUS_ATU ON PRO.CODPROD = CUS_ATU.CODPROD
          LEFT JOIN (
            SELECT 
              CODEMP,
              PROD,
              CODPROD,
              DESCRPROD,
              MARCA,
              CODGRUPOPROD,
              DESCRGRUPOPROD,
              ROUND(SUM(QTD) / NULLIF(SUM(SUM(QTD)) OVER (PARTITION BY CODEMP),0),2) AS POND_MARCA
            FROM VGF_VENDAS_SATIS
            WHERE DTNEG >= ADD_MONTHS('01/06/2025', -12)
            AND DTNEG < '01/06/2025'
            AND CODEMP = 1 
            GROUP BY CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD
          ) PON ON PRO.CODPROD = PON.CODPROD
          LEFT JOIN (
            SELECT 
              MARCA, 
              SUM(QTDPREV) / NULLIF(SUM(QTDPREV), 0) AS TICKET_MEDIO_OBJETIVO
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
          ) MET ON PRO.MARCA = MET.MARCA
          LEFT JOIN (
            SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, 
                   NVL(SUM(QTD),0) QTD,NVL(SUM(VLR),0) VLR,
                   NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_ULT_12_M,
                   NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_ULT_12_M
            FROM VGF_VENDAS_SATIS
            WHERE DTNEG >= ADD_MONTHS('01/06/2025', -12)
            AND DTNEG < '01/06/2025'
            AND CODEMP = 1 
            GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
          ) FAT ON PRO.CODPROD = FAT.CODPROD
          LEFT JOIN (
            SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, 
                   NVL(SUM(QTD),0) QTD_SAFRA,NVL(SUM(VLR),0) VLR_SAFRA,
                   NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_SAFRA,
                   NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_SAFRA
            FROM VGF_VENDAS_SATIS
            WHERE DTNEG BETWEEN 
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
          ) FAT1 ON PRO.CODPROD = FAT1.CODPROD
          LEFT JOIN (
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
          ) PRE ON PRO.CODPROD = PRE.CODPROD AND TAB.CODTAB = PRE.CODTAB
          WHERE NTA.ATIVO = 'S'
          AND PRO.CODGRUPOPROD LIKE '1%'
          AND PRO.ATIVO = 'S'
          AND TAB.DTVIGOR <= '01/06/2025'
          ORDER BY NTA.CODTAB, PRO.CODPROD
        ) WHERE RN = 1
        AND ROWNUM <= 5
      `;
      JX.consultar(sql).then(res => {
        showResult("Teste BAS", res);
      }).catch(err => {
        showResult("Teste BAS", null, err.message);
      });
    }

    function testarFinal() {
      const sql = `
        SELECT 
          NVL(NUTAB,0)NUTAB,
          CODTAB,
          SUBSTR(NOMETAB, 1, 3) NOMETAB,
          NVL(CODPROD,0)CODPROD,
          DESCRPROD,
          NVL(MARCA,'0')MARCA
        FROM (
          SELECT 
            TAB.NUTAB,
            NTA.CODTAB, 
            NTA.NOMETAB, 
            PRO.CODPROD, 
            PRO.DESCRPROD, 
            PRO.MARCA
          FROM TGFPRO PRO
          INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
          LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
          LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
          LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
          WHERE NTA.ATIVO = 'S'
          AND PRO.CODGRUPOPROD LIKE '1%'
          AND PRO.ATIVO = 'S'
          AND TAB.DTVIGOR <= '01/06/2025'
          AND ROWNUM <= 10
        )
        ORDER BY CODTAB, MARCA, CODPROD DESC
      `;
      JX.consultar(sql).then(res => {
        showResult("Teste Final Simplificado", res);
      }).catch(err => {
        showResult("Teste Final Simplificado", null, err.message);
      });
    }
  </script>
</body>
</html> 