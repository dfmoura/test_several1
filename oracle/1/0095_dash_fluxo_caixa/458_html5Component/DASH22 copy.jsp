<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard com Chart.js</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background-color: #F0F7EF;
            color: #2F4F2F;
        }

        .container {
            width: 100%;
            padding: 20px;
        }

        .card-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .card {
            flex: 1;
            margin: 0 10px;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 64, 32, 0.1);
            color: #1E2F1E;
            background: #E6F2E6;
            transition: transform 0.2s ease;
        }

        .card:hover {
            transform: translateY(-3px);
        }

        .receita-baixada {
            background: linear-gradient(135deg, #A8D5A2, #7CBF74);
            color: #1E2F1E;
        }

        .despesa-baixada {
            background: linear-gradient(135deg, #D8F3DC, #95D5B2);
            color: #1E2F1E;
        }

        .previsto-receita {
            background: linear-gradient(135deg, #C7EFCF, #A1D99B);
            color: #1E2F1E;
        }

        .previsto-despesa {
            background: linear-gradient(135deg, #D9F2D9, #B8E0B8);
            color: #1E2F1E;
        }

        .card h2 {
            font-size: 2rem;
            margin: 0;
        }

        .card p {
            margin: 10px 0 0;
            font-weight: bold;
        }

        .section {
            display: flex;
            justify-content: space-between;
            height: calc(100vh - 260px);
            margin-bottom: 20px;
        }

        .chart-container {
            flex: 1;
            margin: 0 10px;
            height: 100%;
            background: #FFFFFF;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 64, 32, 0.1);
            padding: 10px;
        }

        .footer {
            display: flex;
            justify-content: center;
            padding: 15px;
            background: #E8F5E9;
            border-top: 1px solid #D0EAD0;
        }

        .footer button {
            margin: 0 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            background: linear-gradient(135deg, #88C98D, #5B9B61);
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.3s ease;
        }

        .footer button:hover {
            background: linear-gradient(135deg, #5B9B61, #417548);
        }

        .logo-overlay {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
        .logo-overlay:hover {
            opacity: 1;
        }
        .logo-overlay img {
            width: 72px;
            height: auto;
        }        

    </style>
    
    <snk:load/>
</head>
<body>
    <snk:query var="receita_baixada">

    SELECT SUM(VWF.VLRBAIXA_CALC)VLTOTANT 
    FROM VW_FIN_RESUMO_SATIS VWF
    LEFT JOIN TGFFIN FIN ON VWF.NUFIN = FIN.NUFIN
    WHERE VWF.RECDESP = 1 
    AND VWF.PROVISAO = 'N' 
    AND VWF.DHBAIXA BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
    AND VWF.DHBAIXA IS NOT NULL
    AND (
        (NVL(:P_FILTRO_PADRAO_REC, 'N') = 'N' 
         AND VWF.CODNAT IN (:P_NATUREZA) 
         AND VWF.CONTA_BAIXA IN (:P_CONTA))
        OR 
        (:P_FILTRO_PADRAO_REC = 'S' 
         AND VWF.CODNAT = 1010000 
         AND VWF.CONTA_BAIXA NOT IN (0, 1) 
         AND FIN.CODTIPOPER IN (1101, 1111))
      )
    </snk:query>

    <snk:query var="despesa_baixada">

    SELECT SUM(VLRBAIXA_CALC)VLTOTANT2 
    FROM VW_FIN_RESUMO_SATIS 
    WHERE RECDESP = -1 
    AND PROVISAO = 'N' 
    AND DHBAIXA BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
    AND DHBAIXA IS NOT NULL
    AND CODNAT IN (:P_NATUREZA)
    AND CONTA_BAIXA IN (:P_CONTA)
    AND ((NVL(:P_FILTRO_PADRAO_REC, 'N') = 'N') OR (:P_FILTRO_PADRAO_REC = 'S' AND CONTA_BAIXA NOT IN (0)))
        
    </snk:query>

    <snk:query var="previsto_receita">
        SELECT
        SUM(VFIN.VLRLIQUIDO) AS TOTALPROVISAO   
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        LEFT JOIN TGFMBC B ON FIN.NUBCO = B.NUBCO
        LEFT JOIN TSICTA C ON B.CODCTABCOINT = C.CODCTABCOINT        
        WHERE FIN.PROVISAO = 'S'
        AND FIN.RECDESP = 1
        AND FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND FIN.DHBAIXA IS NULL
        
        AND (
            (NVL(:P_FILTRO_PADRAO_REC, 'N') = 'N' 
             AND FIN.CODNAT IN (:P_NATUREZA))
            
            OR
            
            (:P_FILTRO_PADRAO_REC = 'S' 
             AND FIN.CODNAT = 1010000 
             AND NVL(B.CODCTABCOINT,0) NOT IN (0, 1) 
             AND FIN.CODTIPOPER IN (1101, 1111))
          )

    </snk:query>

    <snk:query var="previsto_despesa">
        SELECT
        SUM(VFIN.VLRLIQUIDO) AS TOTAL_PROVISAO_REC
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
		LEFT JOIN VW_FIN_RESUMO_SATIS VWF ON FIN.NUFIN = VWF.NUFIN
        WHERE FIN.PROVISAO = 'S'
        AND FIN.RECDESP = -1
        AND FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND FIN.CODNAT IN (:P_NATUREZA)
        AND FIN.DHBAIXA IS NULL					
		AND ((NVL(:P_FILTRO_PADRAO_REC, 'N') = 'N') OR (:P_FILTRO_PADRAO_REC = 'S' AND VWF.CONTA_BAIXA NOT IN (0) ))

    </snk:query>

    <snk:query var="valoresf">
        SELECT
        TO_CHAR(FIN.DTVENC, 'DD-MM') AS DATA,
        SUM(CASE WHEN FIN.PROVISAO = 'N' THEN VFIN.VLRLIQUIDO ELSE 0 END) AS TOTAL_PROVISAO_DESDOB,
        SUM(CASE WHEN FIN.PROVISAO = 'N'AND FIN.DHBAIXA IS NOT NULL AND EXISTS (SELECT 1 
        FROM TSICTA, TGFMBC 
        WHERE TGFMBC.NUBCO = FIN.NUBCO 
        AND TSICTA.CODCTABCOINT = TGFMBC.CODCTABCOINT
        AND TSICTA.CODCTABCOINT <> 0) THEN FIN.VLRBAIXA  ELSE 0 END) AS TOTAL_REAL_BAIXA
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        WHERE FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND FIN.RECDESP = 1
        AND FIN.CODNAT IN (:P_NATUREZA)
        GROUP BY 
        TO_CHAR(FIN.DTVENC, 'DD-MM')
        ORDER BY
        TO_CHAR(FIN.DTVENC, 'DD-MM')
    </snk:query>

    <snk:query var="valoresnat">
        SELECT
        NATUREZA,
        TOTAL_PROVISAO_DESDOB2,
        TOTAL_REAL_BAIXA2
        FROM
        (SELECT
            
        NAT.DESCRNAT AS NATUREZA,
        SUM(CASE WHEN FIN.PROVISAO = 'N' THEN VFIN.VLRLIQUIDO ELSE 0 END) AS TOTAL_PROVISAO_DESDOB2,
        SUM(CASE WHEN FIN.PROVISAO = 'N'AND FIN.DHBAIXA IS NOT NULL AND EXISTS (SELECT 1 
        FROM TSICTA, TGFMBC 
        WHERE TGFMBC.NUBCO = FIN.NUBCO 
        AND TSICTA.CODCTABCOINT = TGFMBC.CODCTABCOINT
        AND TSICTA.CODCTABCOINT <> 0) THEN FIN.VLRBAIXA  ELSE 0 END) AS TOTAL_REAL_BAIXA2
        
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        WHERE FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        
        
        AND FIN.CODNAT IN (:P_NATUREZA)
        GROUP BY 
        NAT.DESCRNAT)       
        WHERE ROWNUM <= 10
        AND TOTAL_REAL_BAIXA2 >0
        AND TOTAL_PROVISAO_DESDOB2 >0
        ORDER BY TOTAL_PROVISAO_DESDOB2 DESC,TOTAL_REAL_BAIXA2 DESC
            
    </snk:query>

    <div class="container">
        <!-- Primeira Seção: Cards -->
        <div class="card-container">
            <div class="card receita-baixada"onclick=" abrir_rec_bai_per()" style="cursor: pointer;">
                <c:forEach items="${receita_baixada.rows}" var="row">
                <td><h2><fmt:formatNumber value="${row.VLTOTANT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></h2></td>
            </c:forEach>
                <p><b>Receitas Baixadas no Período</b></p>
            </div>
            <div class="card despesa-baixada" onclick="abrir_des_bai_per()" style="cursor: pointer;">
                <c:forEach items="${despesa_baixada.rows}" var="row">
                    <td><h2><fmt:formatNumber value="${row.VLTOTANT2}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></h2></td>
                </c:forEach>
                    <p><b>Despesas Baixadas no Período</b></p>
            </div>
            <div class="card previsto-receita" onclick="abrir_det_prev_rec()" style="cursor: pointer;">
                <c:forEach items="${previsto_receita.rows}" var="row">
                    <td><h2><fmt:formatNumber value="${row.TOTALPROVISAO}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></h2></td>
                </c:forEach>
                    <p><b>Previsto de Receitas do Periodo</b></p>
            </div>
            <div class="card previsto-despesa" onclick="abrir_det_prev_des()" style="cursor: pointer;">
                <c:forEach items="${previsto_despesa.rows}" var="row">
                    <td><h2><fmt:formatNumber value="${row.TOTAL_PROVISAO_REC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></h2></td>
                </c:forEach>
                    <p><b>Previsto de Despesas do Periodo</b></p>
            </div>
        </div>

        <!-- Segunda Seção: Gráficos -->
        <div class="section">
            <!-- Gráfico de Linhas (Esquerda) -->
            <div class="chart-container">
                <canvas id="lineChart"></canvas>
            </div>
            <!-- Gráfico de Colunas Horizontais (Direita) -->



            
        </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
        <button onclick="abrir_nivel()"><u>Provisões de Despesas por Título</u></button>
         <button onclick="abrir_nivel2()"><u>Provisões de Receitas por Título</u></button>
          <button onclick="abrir_nivel3()"><u>Financeiro Real Receitas</u></button>
           <button onclick="abrir_nivel4()"><u>Financeiro Real Despesas</u></button>
            <button onclick="abrir_nivel5()"><u>Financeiro Real por Naturezas</u></button>
    </div>

<!-- Inclusão da Biblioteca Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>

function abrir_rec_bai_per(){
        var params = '';
        var level = 'lvl_auvlsbz';
        openLevel(level, params);
    }
    
    function abrir_des_bai_per(){
        var params = '';
        var level = 'lvl_a110b8b';
        openLevel(level, params);
    }    

    function abrir_det_prev_rec(){
        var params = '';
        var level = 'lvl_a110b9g';
        openLevel(level, params);
    }    

    function abrir_det_prev_des(){
        var params = '';
        var level = 'lvl_a110cbn';
        openLevel(level, params);
    }        

    
    

function abrir_nivel(){
        var params = '';
        var level = 'lvl_azhltjj';
        openLevel(level, params);
    }

    function abrir_nivel2(){
        var params = '';
        var level = 'lvl_sucywz';
        openLevel(level, params);
    }

    function abrir_nivel3(){
        var params = '';
        var level = 'lvl_a0pnrmd';
        openLevel(level, params);
    }
    function abrir_nivel4(){
        var params = '';
        var level = 'lvl_sucyw5';
        openLevel(level, params);
    }

    function abrir_nivel5(){
        var params = '';
        var level = 'lvl_a0ti002';
        openLevel(level, params);
    }


    // Dados e configuração do gráfico de linhas
    const labels = [];
    const realBaixaData = [];
    const provisaoData = [];
    
    <c:forEach items="${valoresf.rows}" var="row">
        labels.push('${row.DATA}');
        realBaixaData.push('${row.TOTAL_REAL_BAIXA}');
        provisaoData.push('${row.TOTAL_PROVISAO_DESDOB}');
    </c:forEach>

    const lineCtx = document.getElementById('lineChart').getContext('2d');
    const lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total em Receitas Baixadas',
                    data: realBaixaData,
                    borderColor: '#5B9B61',
                    backgroundColor: 'rgba(91, 155, 97, 0.2)',
                    borderWidth: 2
                },
                {
                    label: 'Total em Provisão do Período',
                    data: provisaoData,
                    borderColor: '#A8D5A2',
                    backgroundColor: 'rgba(168, 213, 162, 0.2)',
                    borderWidth: 2
                }
            ]

        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

    }
        
        });

        // Dados e configuração do gráfico de colunas horizontais

 
    </script>


    <div class="logo-overlay">
        <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
            <img src="https://neuon.com.br/logos/logo-5.svg" alt="Neuon Logo">
        </a>
    </div>
 </body>
</html>
