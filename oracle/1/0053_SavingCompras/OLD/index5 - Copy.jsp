<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Saving e Evolução de Compra</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            display: flex;
            height: 100vh;
            background-color: #f8f9fa;
        }

        .container {
            display: flex;
            width: 100%;
        }

        .side {
            flex: 1;
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .card {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
            padding: 20px;
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .card-number {
            font-size: 48px;
            font-weight: bold;
            color: #28a745;
        }

        .card-text {
            font-size: 18px;
            color: #6c757d;
        }

        .chart-container {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .chart-container:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .chart-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }

        .buttons-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .button {
            flex: 1 1 calc(25% - 10px);
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 10px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
        }

        .button:hover {
            background-color: #218838;
            transform: translateY(-2px);
        }

        .button img {
            margin-right: 5px;
        }
    </style>

<snk:load/>

</head>
<body>

    <snk:query var="compras_saving">  
        SELECT TO_CHAR(SUM(ITE.VLRDESC), '999,999,999,999,990.00') AS SAVING
        FROM TGFITE ITE
        INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
        WHERE CAB.TIPMOV = 'O'
        AND CAB.STATUSNOTA = 'L'
        AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND ITE.VLRDESC IS NOT NULL
    </snk:query> 

    <snk:query var="compras_saving_analitico">  
        SELECT 
        TO_CHAR(CAB.DTNEG,'YYYY') AS ANO,
        TO_CHAR(CAB.DTNEG,'MM') AS MES,
        TO_CHAR(CAB.DTNEG,'MM-YYYY') AS MES_ANO,
        SUM(ITE.VLRDESC) AS SAVING
        FROM TGFITE ITE
        INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
        WHERE CAB.TIPMOV = 'O'
        AND CAB.STATUSNOTA = 'L'
        AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND ITE.VLRDESC IS NOT NULL
        GROUP BY 
        TO_CHAR(CAB.DTNEG,'YYYY'),
        TO_CHAR(CAB.DTNEG,'MM'),
        TO_CHAR(CAB.DTNEG,'MM-YYYY')
        ORDER BY 1,2    
    </snk:query>

    <div class="container">
        <div class="side">
            <c:forEach items="${compras_saving.rows}" var="row">
                <div class="card">
                    <div class="card-number">${row.SAVING}</div>
                    <div class="card-text">Saving</div>
                </div>
            </c:forEach>
            <div class="chart-container">
                <div class="chart-title">Evolução Saving</div>
                <div id="chart-left"></div>
            </div>
            <div class="buttons-container">
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <!-- Repita o botão abaixo até ter 8 -->
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
            </div>
        </div>
        <div class="side">
            <div class="card">
                <div class="card-number">15.000</div>
                <div class="card-text">Saving</div>
            </div>
            <div class="chart-container">
                <div class="chart-title">Evolução Saving</div>
                <div id="chart-right"></div>
            </div>
            <div class="buttons-container">
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <!-- Repita o botão abaixo até ter 8 -->
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
            </div>
        </div>
    </div>
    <script>
        var mesAno = [];
        var saving = [];
        <c:forEach items="${compras_saving_analitico.rows}" var="row">
            mesAno.push('${row.MES_ANO}');
            saving.push(${row.SAVING});
        </c:forEach>

        var trace1 = {
            x: mesAno,
            y: saving,
            mode: 'lines+markers',
            marker: {
                color: '#28a745',
                size: 8
            },
            line: {
                color: '#28a745',
                width: 2
            }
        };

        var layout = {
            title: '',
            xaxis: {
                title: 'Mês/Ano'
            },
            yaxis: {
                title: 'Saving'
            },
            margin: {
                l: 50,
                r: 30,
                t: 30,
                b: 50
            },
            plot_bgcolor: '#f8f9fa',
            paper_bgcolor: '#ffffff',
            font: {
                size: 12,
                color: '#333'
            }
        };

        Plotly.newPlot('chart-left', [trace1], layout);
        Plotly.newPlot('chart-right', [trace1], layout);
    </script>
</body>
</html>
