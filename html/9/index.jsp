<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
    <%@ page import="java.util.*" %>
        <%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
            <%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>

                <!DOCTYPE html>
                <html>

                <head>
                    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                    <snk:load />
                </head>

                <body>

                    <snk:query var="custo">
                        WITH TOT AS (
                        SELECT TO_CHAR(CAB.dtmov, 'MM/YYYY') AS MES_ANO_VENDA,
                        SUM(
                        CASE
                        WHEN CAB.tipmov = 'D' THEN (ITE.vlrtot - ITE.vlrdesc - ITE.vlrrepred) * -1
                        ELSE (ITE.vlrtot - ITE.vlrdesc - ITE.vlrrepred)
                        END
                        ) AS FaturamentoMensal
                        FROM tsiemp EMP
                        INNER JOIN tgfcab CAB ON EMP.codemp = CAB.codemp
                        INNER JOIN tgfite ITE ON CAB.nunota = ITE.nunota
                        INNER JOIN tgftop TOP ON CAB.codtipoper = TOP.codtipoper AND CAB.dhtipoper = TOP.dhalter
                        WHERE TOP.atualest <> 'N'
                            AND CAB.tipmov IN ('V', 'D')
                            AND CAB.statusnota = 'L'
                            AND (CAB.statusnfe = 'A' OR CAB.statusnfe = 'T' OR CAB.statusnfe IS NULL)
                            AND ((TOP.atualfin <> 0 AND TOP.tipatualfin = 'I') OR TOP.codtipoper IN (1112, 1113))
                                AND CAB.dtmov BETWEEN TO_DATE('2023-01-01', 'YYYY-MM-DD') AND TO_DATE('2023-10-10',
                                'YYYY-MM-DD')
                                GROUP BY TO_CHAR(CAB.dtmov, 'MM/YYYY')
                                ),
                                TOT2 AS (SELECT TOT.MES_ANO_VENDA,
                                TOT.FaturamentoMensal FatMensal,
                                SUM(TOT.FaturamentoMensal) OVER (ORDER BY TO_DATE(TOT.MES_ANO_VENDA, 'MM/YYYY')) AS
                                ACUMULADO_FatMensal
                                FROM TOT
                                ORDER BY TOT.MES_ANO_VENDA),
                                CUS AS (
                                SELECT
                                TO_CHAR(VGF.dhbaixa, 'YYYY') AS ANO,
                                TO_CHAR(VGF.dhbaixa, 'MM') AS MES,
                                TO_CHAR(VGF.dhbaixa, 'MM/YYYY') AS MES_ANO,
                                SUM(VGF.VLRBAIXA*-1) AS CUSTO_MENSAL,
                                SUM(SUM(VGF.VLRBAIXA*-1)) OVER (ORDER BY TO_CHAR(VGF.dhbaixa, 'YYYY'),
                                TO_CHAR(VGF.dhbaixa, 'MM')) AS ACUMULADO_CUSTO_MENSAL
                                FROM
                                VGF_RESULTADO_SATIS VGF
                                INNER JOIN TSICUS CUS ON CUS.CODCENCUS = VGF.CODCENCUS
                                WHERE
                                VGF.dhbaixa BETWEEN TO_DATE('2023-01-01', 'YYYY-MM-DD') AND TO_DATE('2023-08-11',
                                'YYYY-MM-DD')
                                AND VGF.CODCENCUS LIKE '7%'
                                AND CUS.DESCRCENCUS NOT LIKE '%QUALIDADE%'
                                GROUP BY
                                TO_CHAR(VGF.dhbaixa, 'YYYY'),
                                TO_CHAR(VGF.dhbaixa, 'MM'),
                                TO_CHAR(VGF.dhbaixa, 'MM/YYYY')
                                ORDER BY ANO, MES
                                )
                                SELECT
                                TOT2.MES_ANO_VENDA,
                                TOT2.FATMENSAL,
                                CUS.CUSTO_MENSAL,
                                (CUS.CUSTO_MENSAL/
                                TOT2.FATMENSAL)*100 AS MENSAL_CUS_X_VEN,
                                TOT2.ACUMULADO_FATMENSAL,
                                CUS.ACUMULADO_CUSTO_MENSAL,
                                (CUS.ACUMULADO_CUSTO_MENSAL/
                                TOT2.ACUMULADO_FATMENSAL)*100 AS ACUMULADO_MENSAL_CUS_X_VEN
                                FROM TOT2
                                INNER JOIN CUS ON TOT2.MES_ANO_VENDA = CUS.MES_ANO
                    </snk:query>

                    <canvas id="myChart" width="400" height="200"></canvas>

                    <script>
                        var data = {
                            labels: [<c: forEach items="${custo.rows}" var="row" varStatus="loop">
                                '<c: out value="${row.MES_ANO_VENDA}" />'<c: if test="${!loop.last}">,</c: if>
                            </c: forEach>],
                            datasets: [
                                {
                                    label: 'ACUMULADO_CUSTO_MENSAL',
                                    data: [<c: forEach items="${custo.rows}" var="row" varStatus="loop">
                                        <c: out value="${row.ACUMULADO_CUSTO_MENSAL}" /><c: if test="${!loop.last}">,</c: if>
                                    </c: forEach>],
                                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 1,
                                    fill: false
                                }
                            ]
                        };

                        var options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    title: {
                                        display: true,
                                        text: 'MES_ANO_VENDA'
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'ACUMULADO_CUSTO_MENSAL'
                                    }
                                }
                            }
                        };

                        var ctx = document.getElementById('myChart').getContext('2d');
                        var myChart = new Chart(ctx, {
                            type: 'line',
                            data: data,
                            options: options
                        });
                    </script>



                </body>

                </html>


                <!-- 
                <c:forEach items="${custo.rows}" var="row">
                    <h3>
                        <c:out value="${row.MES_ANO_VENDA}" />
                    </h3>
                </c:forEach>
                <c:forEach items="${custo.rows}" var="row">
                    <h3>
                        <c:out value="${row.ACUMULADO_MENSAL_CUS_X_VEN}" />
                    </h3>
                </c:forEach> -->