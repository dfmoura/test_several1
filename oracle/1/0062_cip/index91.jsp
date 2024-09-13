<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Exemplo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .section {
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px; /* Bordas arredondadas */
            background-color: #fff; /* Cor de fundo para contraste */            
            transition: box-shadow 0.3s ease, transform 0.3s ease; /* Transição suave */            
        }
        .section:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Sombra ao passar o mouse */
            transform: translateY(-4px); /* Leve elevação */
        }        

        .section-upper {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .section-lower {
            flex: 1;
            display: flex;
            justify-content: space-around;
            gap: 20px; /* Espaço entre as subseções */
        }

        .sub-section {
            width: 48%;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px; /* Bordas arredondadas */
            background-color: #fff; /* Cor de fundo para contraste */            
            transition: box-shadow 0.3s ease, transform 0.3s ease; /* Transição suave */            
        }

        .sub-section:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Sombra ao passar o mouse */
            transform: translateY(-4px); /* Leve elevação */
        }        

        .table-container {
            max-height: 200px; /* Diminuir a altura das tabelas */
            overflow-y: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 0.7em; /* Diminuir o tamanho da fonte */
        }

        th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
        }

        .table-container {
            max-height: 300px; /* Ajuste a altura conforme necessário */
            overflow-y: auto;
        }

        h2 {
            margin-bottom: 15px;
            text-align: center;
            width: 100%;            
        }
    </style>

<snk:load/>

</head>
<body>


    <snk:query var="cip">

    WITH T AS (
        SELECT
        DATA,
        0 AS CODPROD,
        AD_TPPROD,
        AVG(CUSTO) AS CUSTO,
        AVG(CUSTOT) AS CUSTOT
        FROM (
        SELECT
            DHINICIO AS DATA,
            CODPRODPA AS CODPROD,
            AD_TPPROD,
            MAX(CUSTO) AS CUSTO,
            SUM(CUSTOT) + (SELECT SUM(CIP.QTD * NVL(CUS.CUSSEMICM,0)) AS CUSTO_CIP
        FROM TPRTPP CIP INNER JOIN TGFCUS CUS ON CIP.CODPRODTAR = CUS.CODPROD AND CUS.CODEMP = 1 AND CUS.DTATUAL = (SELECT MAX(DTATUAL) FROM TGFCUS WHERE DTATUAL <= X.DHINICIO AND CODPROD = CIP.CODPRODTAR AND CODEMP = 1)
        WHERE CIP.CODPRODPA = X.CODPRODPA AND CIP.IDPROC = (SELECT MAX(IDPROC) FROM TPRTPP WHERE CODPRODPA = X.CODPRODPA) ) AS CUSTOT  
        FROM (
        SELECT MAX(ATV.IDEFX)IDEFX
        , LAST_DAY(TRUNC(NVL(ATV.DHINICIO, ATV.DHINCLUSAO))) AS DHINICIO
        , PA.CODPRODPA 
        , PRO.AD_TPPROD
        , MP.CODPRODMP 
        , MP.QTDMISTURA
        , CUS.CUSSEMICM
        , CUSPA.CUSSEMICM AS CUSTO
        , MP.QTDMISTURA * CUS.CUSSEMICM AS CUSTOT
        FROM TPRIATV ATV
        INNER JOIN TPRIPA PA ON PA.IDIPROC = ATV.IDIPROC
        INNER JOIN TPRLMP MP ON MP.CODPRODPA = PA.CODPRODPA AND MP.IDEFX = ATV.IDEFX
        INNER JOIN TGFCUS CUS ON MP.CODPRODMP = CUS.CODPROD AND 1 = CUS.CODEMP
        AND CUS.DTATUAL = (SELECT MAX(DTATUAL)FROM TGFCUS WHERE DTATUAL <= LAST_DAY(TRUNC(NVL(ATV.DHINICIO, ATV.DHINCLUSAO))) AND CODPROD = MP.CODPRODMP AND CODEMP = 1)
        INNER JOIN TGFPRO PRO ON PA.CODPRODPA = PRO.CODPROD  /*foi efetuado esta ligaçao para trazer o pro.ad_tpprod***/
        INNER JOIN TGFCUS CUSPA ON PA.CODPRODPA = CUSPA.CODPROD AND CUSPA.CODEMP = 1
        AND CUSPA.DTATUAL = (SELECT MAX(DTATUAL) FROM TGFCUS WHERE DTATUAL <= LAST_DAY(TRUNC(NVL(ATV.DHINICIO, ATV.DHINCLUSAO))) AND CODPROD = PA.CODPRODPA AND CODEMP = 1)
        
        WHERE ((:A_TPPROD IN (1, 2, 4, 5, 6) AND PRO.AD_TPPROD = :A_TPPROD) OR (:A_TPPROD = 9999))
        
        AND LAST_DAY(TRUNC(NVL(ATV.DHINICIO, ATV.DHINCLUSAO))) >= ADD_MONTHS(:P_PERIODO.FIN, -12) 
        AND TRUNC(NVL(ATV.DHINICIO, ATV.DHINCLUSAO)) < :P_PERIODO.FIN
        GROUP BY LAST_DAY(TRUNC(NVL(ATV.DHINICIO, ATV.DHINCLUSAO)))
        , PA.CODPRODPA 
        , PRO.AD_TPPROD
        , MP.CODPRODMP 
        , MP.QTDMISTURA
        , CUS.CUSSEMICM
        , CUSPA.CUSSEMICM
        ) X
        GROUP BY
            DHINICIO,
            CODPRODPA,
            AD_TPPROD
        ) Y
        GROUP BY
        DATA,
        AD_TPPROD
        
        )
        SELECT 
        
        
        TO_CHAR(DATA,'DD-MM-YYYY') AS DATA,
        CODPROD,
        AD_TPPROD,
        CUSTO,
        CUSTOT,
        CUSTO - CUSTOT AS DIF
        
        FROM T
        ORDER BY 1

    </snk:query>

    <snk:query var="cip_analitico">
        WITH CTE AS (
            SELECT 
                TO_CHAR(LAN.REFERENCIA,'MM-YYYY') AS MES_ANO,
                LAN.REFERENCIA,
                SUM(CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END) AS "VLRLANC",
                LAG(SUM(CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END), 1) OVER (ORDER BY LAN.REFERENCIA) AS "VLRLANC_ANTERIOR"
            FROM TCBLAN LAN, TCBPLA PLA
            WHERE 
                LAN.CODCTACTB=PLA.CODCTACTB
                AND (PLA.CTACTB  LIKE '3.1.04.005%'  OR
                    PLA.CTACTB  LIKE '3.1.04.006%' OR
                    PLA.CTACTB  LIKE '3.1.04.009%' OR
                    PLA.CTACTB  LIKE '3.1.04.010%')
                AND LAN.DTMOV BETWEEN ADD_MONTHS(:P_PERIODO.FIN, -12) AND :P_PERIODO.FIN
                AND NUMLOTE <> 999
                AND PLA.CTACTB <> '3.1.04.010.0001'
            GROUP BY LAN.REFERENCIA
            ORDER BY LAN.REFERENCIA DESC
        )
        SELECT 
            :A_TPPROD AS A_TPPROD,
            MES_ANO,
            TO_CHAR(REFERENCIA,'DD-MM-YYYY')REFERENCIA,
            VLRLANC,
            CASE WHEN VLRLANC_ANTERIOR IS NULL THEN 0 ELSE (((VLRLANC/VLRLANC_ANTERIOR)-1)*100) END AS PERC
        FROM CTE
        
    </snk:query>


    <snk:query var="cip_ana_nat">
        SELECT 
        TO_CHAR(LAN.REFERENCIA,'MM-YYYY') AS MES_ANO,
        TO_CHAR(LAN.REFERENCIA,'DD-MM-YYYY') AS REFERENCIA, 
        LAN.CODCTACTB,
        PLA.DESCRCTA, 
        PLA.CTACTB, 
        PLA.DESCRCTA, 
        SUM(CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END) AS "VLRLANC" 
        FROM TCBLAN LAN
        INNER JOIN TCBPLA PLA ON LAN.CODCTACTB = PLA.CODCTACTB
        WHERE
        (PLA.CTACTB  LIKE '3.1.04.005%' OR
        PLA.CTACTB  LIKE '3.1.04.006%'  OR
        PLA.CTACTB  LIKE '3.1.04.009%'  OR
        PLA.CTACTB  LIKE '3.1.04.010%') AND
        (LAN.DTMOV BETWEEN ADD_MONTHS(:P_PERIODO.FIN, -12) AND :P_PERIODO.FIN) AND 
        NUMLOTE<>999 AND
        LAN.REFERENCIA = :A_PERIODO AND
        PLA.CTACTB <> '3.1.04.010.0001'
        GROUP BY TO_CHAR(LAN.REFERENCIA,'MM-YYYY'),LAN.REFERENCIA, LAN.CODCTACTB,PLA.DESCRCTA, PLA.CTACTB, PLA.DESCRCTA
        ORDER BY LAN.REFERENCIA DESC
    </snk:query>


    <h2>Custo Indireto de Produção</h2>
    <div class="section section-upper">
        <canvas id="lineChart"></canvas>
    </div>

    <div class="section section-lower">
        <div class="sub-section">
            <h2>Consolidado por Referencia</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Mês / Ano</th>
                            <th>Refência</th>
                            <th>CIP Total</th>
                            <th>% Var. CIP</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:forEach var="row" items="${cip_analitico.rows}">
                        <tr>
                            <td onclick="abrir_cip_det('${row.MES_ANO}')">${row.MES_ANO}</td>
                            <td onclick="ref_fat1('${row.REFERENCIA}','${row.A_TPPROD}')">${row.REFERENCIA}</td>
                            <td><fmt:formatNumber value="${row.VLRLANC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                            <td><fmt:formatNumber value="${row.PERC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                            <c:set var="total" value="${total + row.VLRLANC}" />
                        </tr>
                        </c:forEach>
                        <tr>
                            <td><b>Total</b></td>
                            <td></td>
                            <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                            <td></td>
                        </tr>                        
                    </tbody>
                </table>
            </div>
        </div>        
        
        <div class="sub-section">
            <h2>Detalhamento por Referencia</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Mês / Ano</th>
                            <th>Refência</th>
                            <th>Cód. CTA. CTB.</th>
                            <th>Conta Contábil</th>                                                
                            <th>Descrição</th>
                            <th>Vlr. CIP</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:forEach var="row" items="${cip_ana_nat.rows}">
                        <tr>
                            <td>${row.MES_ANO}</td>
                            <td>${row.REFERENCIA}</td>
                            <td onclick="abrir_cip_filtro('${row.MES_ANO}','${row.CODCTACTB}')">${row.CODCTACTB}</td>
                            <td>${row.CTACTB}</td>
                            <td>${row.DESCRCTA}</td>
                            <td><fmt:formatNumber value="${row.VLRLANC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                            <c:set var="total1" value="${total1 + row.VLRLANC}" />
                        </tr>                    
                        </c:forEach>
                        <tr>
                            <td><b>Total</b></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td><b><fmt:formatNumber value="${total1}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                        </tr>                    
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>


        // Função para abrir o novo nível
        function abrir_cip_det(periodo) {
            
            var partes = periodo.split('-');
            var parte1 = partes[0];
            var parte2 = partes[1];            
            
            var params = { 
                
                'A_MES' : parseInt(parte1),
                'A_ANO' : parseInt(parte2)
             };
            var level = 'lvl_t4aslw';
            
            openLevel(level, params);
        }

        function abrir_cip_filtro(periodo,ctb) {
            
            var partes = periodo.split('-');
            var parte1 = partes[0];
            var parte2 = partes[1];            
            
            var params = { 
                
                'A_MES' : parseInt(parte1),
                'A_ANO' : parseInt(parte2),
                'A_CODCTACTB' : parseInt(ctb)

             };
            var level = 'lvl_t4aslw';
            
            openLevel(level, params);
        }

        // Função para atualizar a query

        function ref_fat1(periodo,tpprod) {
            const params1 = {'A_PERIODO': periodo,
                            'A_TPPROD' : tpprod
            };
            refreshDetails('html5_t4arsi', params1);   
        }

        const ctx = document.getElementById('lineChart').getContext('2d');
        const dateLabels = [
            <c:forEach items="${cip.rows}" var="row">
                "${row.DATA}",
            </c:forEach>              
        ];

        const custoData = [
            <c:forEach items="${cip.rows}" var="row">
                ${row.CUSTO},
            </c:forEach>        
        ];  
        
        const custoPrevistoData = [
            <c:forEach items="${cip.rows}" var="row">
                ${row.CUSTOT},
            </c:forEach>        
        ];  

        const diferencaData = [
            <c:forEach items="${cip.rows}" var="row">
                ${row.DIF},
            </c:forEach>        
        ];                          

        const lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [
                    {
                        label: 'Custo Médio de Produção',
                        data: custoData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false
                    },
                    {
                        label: 'Custo Previsto Produção',
                        data: custoPrevistoData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: false
                    },
                    {
                        label: 'Diferença',
                        data: diferencaData,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });    
    </script>
</body>
</html>
