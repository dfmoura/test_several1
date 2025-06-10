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
            max-height: 400px; /* Diminuir a altura das tabelas */
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
            max-height: 600px; /* Ajuste a altura conforme necessário */
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


    <snk:query var="cip_analitico">

    WITH CTE AS (
        SELECT 
            TO_CHAR(LAN.REFERENCIA,'MM-YYYY') AS MES_ANO,
            LAN.REFERENCIA,
            SUM(CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END) AS "VLRLANC",
            LAG(SUM(CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END), 1) OVER (ORDER BY LAN.REFERENCIA) AS "VLRLANC_ANTERIOR"
        FROM TCBLAN LAN
        INNER JOIN TCBPLA PLA ON LAN.CODCTACTB=PLA.CODCTACTB
        WHERE 
            (CTACTB  LIKE '%3.01.03.01%' OR CTACTB  LIKE '%3.01.03.02%')
            AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        GROUP BY LAN.REFERENCIA
        ORDER BY LAN.REFERENCIA DESC
    )
    SELECT 
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
        (CTACTB  LIKE '%3.01.03.01%' OR CTACTB  LIKE '%3.01.03.02%')
        AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND TO_CHAR(LAN.REFERENCIA,'MM-YYYY') = :A_PERIODO
        
        GROUP BY TO_CHAR(LAN.REFERENCIA,'MM-YYYY'),LAN.REFERENCIA, LAN.CODCTACTB,PLA.DESCRCTA, PLA.CTACTB, PLA.DESCRCTA
        ORDER BY LAN.REFERENCIA DESC
    </snk:query>


    <h2>Custo Indireto de Produção</h2>



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
                            <td onclick="ref_fat1('${row.MES_ANO}')">${row.REFERENCIA}</td>
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



<!-- Botão de exportação para Excel -->
<div id="exportOverlay" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
    <button onclick="abrir_cip_det_sem_filtro()" style="
        background-color: #4CAF50; 
        color: white; 
        border: none; 
        padding: 10px 20px; 
        text-align: center; 
        text-decoration: none; 
        display: inline-block; 
        font-size: 16px; 
        margin: 4px 2px; 
        cursor: pointer; 
        border-radius: 5px;
    ">
        Detalhamento Sem Filtro
    </button>
</div>


    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>


        // Função para abrir o novo nível

        function abrir_cip_det_sem_filtro() {
            
            var params = ''
            var level = 'lvl_a2ictou';
            
            openLevel(level, params);
        }


        function abrir_cip_det(periodo) {
            
            var partes = periodo.split('-');
            var parte1 = partes[0];
            var parte2 = partes[1];            
            
            var params = { 
                
                'A_MES' : parseInt(parte1),
                'A_ANO' : parseInt(parte2)
             };
            var level = 'lvl_a2ictou';
            
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
            var level = 'lvl_a2ictou';
            
            openLevel(level, params);
        }

        // Função para atualizar a query

        function ref_fat1(periodo) {
            const params1 = {'A_PERIODO': periodo
            };
            refreshDetails('html5_a2ictow', params1);   
        }



    </script>
</body>
</html>
