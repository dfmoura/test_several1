<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tabela e Gráfico</title>
    <style>
        body {
            display: flex;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            height: 100vh;
        }
        .container {
            display: flex;
            flex-grow: 1;
            padding: 20px;
            box-sizing: border-box;
        }
        .table-container {
            width: 50%;
            padding-right: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .chart-container {
            width: 50%;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .chart-box {
            position: relative;
            flex: 1;
        }
        .maximize-btn, .minimize-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
        }
        .minimize-btn {
            display: none;
        }
    </style>
    <snk:load />
</head>
<body>
    <snk:query var="dias">

                SELECT 
                CODVEND
                , APELIDO
                , SUM(QTDPREV) AS QTDPREV
                , SUM(QTDREAL) AS QTDREAL
                , CASE WHEN SUM(QTDPREV) = 0 THEN 100 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
                , SUM(VLR_PREV)  AS VLR_PREV
                , SUM(VLR_REAL) AS VLR_REAL
                , CASE WHEN SUM(VLR_PREV) = 0 THEN 100 ELSE NVL(SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0), 0) END AS PERC_VLR
                FROM
                (
                SELECT
                X.DTREF,
                X.CODMETA,
                VEN1.CODVEND,
                VEN1.APELIDO,
                VEN1.CODGER,
                X.CODPARC,
                X.PARCEIRO,
                X.MARCA,
                X.CODGRUPOPROD,
                SUM(QTDPREV) AS QTDPREV,
                SUM(QTDREAL) AS QTDREAL,
                SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                SUM(NVL(VLRREAL, 0)) AS VLR_REAL
                FROM(

                SELECT MET.CODMETA,
                MET.DTREF, 
                VEN.CODVEND,
                VEN.APELIDO,
                VEN.AD_VENDEDOR_MATRIZ,
                NVL(VGF.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC,
                NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                NVL(MET.MARCA,0) AS MARCA,
                NVL(VGF.CODGRUPOPROD,0) AS CODGRUPOPROD,
                NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                NVL(MET.QTDPREV,0) AS QTDPREV, 
                SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                SUM(NVL(VGF.VLR,0)) AS VLRREAL
                FROM TGFMET MET
                LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND

                GROUP BY MET.CODMETA,MET.DTREF,
                VEN.CODVEND, VEN.APELIDO, VEN.AD_VENDEDOR_MATRIZ,
                NVL(VGF.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODGRUPOPROD,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)

                ) X
                LEFT JOIN TGFVEN VEN1 ON CASE WHEN :VENDEDOR_MATRIZ = 'S' THEN NVL(X.AD_VENDEDOR_MATRIZ,X.CODVEND) ELSE X.CODVEND END = VEN1.CODVEND

                WHERE 
                X.CODMETA = :P_CODMETA
                AND X.DTREF BETWEEN :P_PERIODO.INI   AND  :P_PERIODO.FIN

                AND ((:P_NTEMMETA = 'S' AND (X.QTDPREV <> 0 OR X.QTDREAL <>  0 OR X.VLRREAL<>0)) OR :P_NTEMMETA = 'N')
                AND (X.CODGRUPOPROD = :P_GRUPOPROD OR :P_GRUPOPROD IS NULL)
                AND (X.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
                AND (X.CODVEND IN :P_CODVEND) 
                AND (X.CODGER IN :P_COORD)
                AND (X.MARCA IN :P_MARCA)

                AND
                (
                X.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                OR X.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO) 
                OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                )
                GROUP BY
                X.DTREF,
                X.CODMETA,
                VEN1.CODVEND,
                VEN1.APELIDO,
                VEN1.CODGER,
                X.CODPARC,
                X.PARCEIRO,
                X.MARCA,
                X.CODGRUPOPROD
                )
                GROUP BY CODVEND, APELIDO
                ORDER BY 7 DESC


</snk:query>

<div class="container">
    <div class="table-container">
        <table>
            <thead>
            <tr>
                <th>Column 1</th>
                <th>Column 2</th>
                <th>Column 3</th>
                <th>Column 4</th>
                <th>Column 5</th>
                <th>Column 6</th>
                <th>Column 7</th>
                <th>Column 8</th>
            </tr>
            </thead>
            <tbody>
            <c:forEach items="${dias.rows}" var="row"></c:forEach>
            <!-- Example rows -->APELIDO
            <tr>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
                <td>Data 7</td>
                <td>Data 8</td>
            </tr>
            <tr>
                
                
                
                
                VLR_PREV
                VLR_REAL
                PERC_VLR
                <td>${row.CODVEND}</td>
                <td>${row.APELIDO}</td>
                <td><fmt:formatNumber value="${row.QTDPREV}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.QTDREAL}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.PERC}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VOLUME_SB}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VOLUME_SB}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VOLUME_SB}" pattern="#,##0.00" /></td>
            </tr>
            </c:forEach>
            <!-- Add more rows as needed -->
            </tbody>
        </table>
    </div>
    <div class="chart-container">
        <div class="chart-box" id="chartBox1">
            <button class="maximize-btn" onclick="toggleFullscreen('chartBox1')">Maximizar</button>
            <button class="minimize-btn" onclick="toggleFullscreen('chartBox1')">Minimizar</button>
            <canvas id="chart1"></canvas>
        </div>
        <div class="chart-box" id="chartBox2">
            <button class="maximize-btn" onclick="toggleFullscreen('chartBox2')">Maximizar</button>
            <button class="minimize-btn" onclick="toggleFullscreen('chartBox2')">Minimizar</button>
            <canvas id="chart2"></canvas>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
    function createChart(chartId, labels, data1, data2) {
        var ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Series 1',
                    data: data1,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }, {
                    label: 'Series 2',
                    data: data2,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createChart('chart1', ['Jan', 'Feb', 'Mar', 'Apr', 'May'], [12, 19, 3, 5, 2], [2, 3, 20, 5, 1]);
    createChart('chart2', ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'], [15, 29, 13, 25, 22], [5, 13, 15, 7, 10]);

    function toggleFullscreen(chartBoxId) {
        var chartBox = document.getElementById(chartBoxId);
        var maximizeBtn = chartBox.querySelector('.maximize-btn');
        var minimizeBtn = chartBox.querySelector('.minimize-btn');

        if (!document.fullscreenElement) {
            if (chartBox.requestFullscreen) {
                chartBox.requestFullscreen();
            } else if (chartBox.mozRequestFullScreen) { /* Firefox */
                chartBox.mozRequestFullScreen();
            } else if (chartBox.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                chartBox.webkitRequestFullscreen();
            } else if (chartBox.msRequestFullscreen) { /* IE/Edge */
                chartBox.msRequestFullscreen();
            }
            maximizeBtn.style.display = 'none';
            minimizeBtn.style.display = 'block';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
            maximizeBtn.style.display = 'block';
            minimizeBtn.style.display = 'none';
        }
    }
</script>
</body>
</html>
