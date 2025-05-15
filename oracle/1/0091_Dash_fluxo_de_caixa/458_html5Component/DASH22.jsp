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
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .receita-baixada {
            background: linear-gradient(145deg, rgba(10,175, 160, 0.3), rgba(0, 110, 79, 0.776));
        }
        .despesa-baixada {
            background: linear-gradient(145deg, rgba(175, 10, 10, 0.3), rgba(110, 0, 0, 0.776));
        }
        .previsto-receita {
            background: linear-gradient(145deg, rgba(10,175, 160, 0.3), rgba(0, 110, 79, 0.776));
        }
        .previsto-despesa {
            background: linear-gradient(145deg, rgba(175, 153, 10, 0.3), rgba(110, 0, 0, 0.776));
        }
        .card h2 {
            font-size: 2rem;
            margin: 0;
        }
        .card p {
            margin: 10px 0 0;
        }
        .section {
            display: flex;
            justify-content: space-between;
            height: calc(100vh - 260px); /* Ajuste para utilizar o espaço disponível da tela */
            margin-bottom: 20px;
        }
        .chart-container {
            flex: 1;
            margin: 0 10px;
            height: 100%; /* Faz com que o container do gráfico ocupe toda a altura disponível */
        }
        .footer {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #f1f1f1;
        }
        .footer button {
            margin: 0 10px;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: linear-gradient(145deg, #008a70, #2c6b2f);
            color: white;
            font-size: 1rem;
            cursor: pointer;
        }
    </style>
    <snk:load/>
</head>
<body>
    <snk:query var="receita_baixada">

    SELECT SUM(VLRBAIXA_CALC)VLTOTANT 
    FROM VW_FIN_RESUMO_SATIS 
    WHERE RECDESP = 1 
    AND PROVISAO = 'N' 
    AND DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
    AND CODNAT IN (:P_NATUREZA)
    AND CONTA_BAIXA IN (:P_CONTA)
   
        
    </snk:query>

    <snk:query var="despesa_baixada">

    SELECT SUM(VLRBAIXA_CALC)VLTOTANT2 
    FROM VW_FIN_RESUMO_SATIS 
    WHERE RECDESP = -1 
    AND PROVISAO = 'N' 
    AND DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
    AND CODNAT IN (:P_NATUREZA)
    AND CONTA_BAIXA IN (:P_CONTA)    
        
    </snk:query>

    <snk:query var="previsto_receita">
        SELECT
        SUM(VFIN.VLRLIQUIDO) AS TOTALPROVISAO   
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        WHERE FIN.PROVISAO = 'N'
        AND FIN.RECDESP = 1
        AND FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND FIN.CODNAT IN (:P_NATUREZA)
    </snk:query>

    <snk:query var="previsto_despesa">
        SELECT
        SUM(VFIN.VLRLIQUIDO) AS TOTAL_PROVISAO_REC
        FROM TGFFIN FIN
        LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
        LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        WHERE FIN.PROVISAO = 'N'
        AND FIN.RECDESP = -1
        AND FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND FIN.CODNAT IN (:P_NATUREZA)
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
            <div class="card despesa-baixada">
                <c:forEach items="${despesa_baixada.rows}" var="row">
                    <td><h2><fmt:formatNumber value="${row.VLTOTANT2}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></h2></td>
                </c:forEach>
                    <p><b>Despesas Baixadas no Período</b></p>
            </div>
            <div class="card previsto-receita">
                <c:forEach items="${previsto_receita.rows}" var="row">
                    <td><h2><fmt:formatNumber value="${row.TOTALPROVISAO}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></h2></td>
                </c:forEach>
                    <p><b>Previsto de Receitas do Periodo</b></p>
            </div>
            <div class="card previsto-despesa">
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
        <button onclick="abrir_nivel()"><u>Provisão de por Titulo Despesas</u></button>
         <button onclick="abrir_nivel2()"><u>Provisão de por Titulo Receitas</u></button>
          <button onclick="abrir_nivel3()"><u>Financeiro Real Receitas</u></button>
           <button onclick="abrir_nivel4()"><u>Financeiro Real Despesas</u></button>
            <button onclick="abrir_nivel5()"><u>Financeiro por Naturezas Real</u></button>
    </div>

<!-- Inclusão da Biblioteca Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>

function abrir_rec_bai_per(){
        var params = '';
        var level = 'lvl_auvlsbz';
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
                    borderColor: 'rgba(0, 138, 112, 1)', // Verde escuro
                    backgroundColor: 'rgba(0, 100, 0, 0.2)',
                    borderWidth: 2
                },
                {
                    label: 'Total em Provisão do Período',
                    data: provisaoData,
                    borderColor: 'rgba(100, 60, 150, 1)', // Uva
                    backgroundColor: 'rgba(0, 0, 255, 0.2)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
        });

        // Dados e configuração do gráfico de colunas horizontais

 
    </script>
 </body>
</html>
