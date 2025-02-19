<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
    <%@ page import="java.util.*" %>
        <%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
            <%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
                <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

                    <html lang="en">

                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Card Dashboard</title>
                        <style>
                            /* Reset CSS */

                            /* Body styles */
                            body {
                                font-family: Arial, sans-serif;
                            }

                            /* Card styles */
                            .card {
                                width: 300px;
                                padding: 8px;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                text-align: center;
                            }

                            .card-title {
                                font-size: 20px;
                                color: #fff;
                                margin-bottom: 10px;
                            }

                            .card-content {
                                font-size: 45px;
                                margin-bottom: 20px;
                            }

                            .card-description {
                                font-size: 15px;
                                color: #fff;
                            }

                            /* Blue card style */
                            .blue-card {
                                background-color: #007bff;
                                color: #fff;
                                font-weight: bold;
                            }

                            /* Red card style */
                            .red-card {
                                background-color: #dc3545;
                                color: #fff;
                                font-weight: bold;
                            }
                        </style>

                        <snk:load />
                    </head>

                    <body>

                        <snk:query var="dias">

                            SELECT
                            NVL(AVG(DIAS_EM_ATRASO),0) AS DIAS_EM_ATRASO
                            FROM
                            (

                            SELECT
                            CODPARC,
                            NUFIN,
                            NUNOTA,
                            NUMNOTA,
                            DTVENC,
                            DHBAIXA,
                            CASE
                            /*WHEN DTVENC > SYSDATE AND DHBAIXA IS NULL THEN 0 'A vencer'*/
                            WHEN DTVENC < SYSDATE AND DHBAIXA IS NULL THEN DTVENC-SYSDATE/*'Aberto Vencido'*/ WHEN
                                (DTVENC - DHBAIXA)> 0 AND DHBAIXA IS NOT NULL THEN DTVENC - DHBAIXA /*'Antecipação'*/
                                WHEN (DTVENC - DHBAIXA) < 0 AND DHBAIXA IS NOT NULL THEN DTVENC - DHBAIXA /*'Pago em
                                    atraso'*/ WHEN (DTVENC - DHBAIXA)=0 AND DHBAIXA IS NOT NULL THEN DTVENC - DHBAIXA
                                    /*'No dia'*/ END AS DIAS_EM_ATRASO, CASE /*WHEN DTVENC> SYSDATE AND DHBAIXA IS NULL
                                    THEN 'A vencer'*/
                                    WHEN DTVENC < SYSDATE AND DHBAIXA IS NULL THEN 'Aberto Vencido' WHEN (DTVENC -
                                        DHBAIXA)> 0 AND DHBAIXA IS NOT NULL THEN 'Antecipação'
                                        WHEN (DTVENC - DHBAIXA) < 0 AND DHBAIXA IS NOT NULL THEN 'Pago em atraso' WHEN
                                            (DTVENC - DHBAIXA)=0 AND DHBAIXA IS NOT NULL THEN 'No dia' END AS STATUS,
                                            VLRDESDOB, VLRBAIXA FROM TGFFIN FIN WHERE RECDESP=1 AND PROVISAO='N' AND (
                                            (DTVENC < SYSDATE AND DHBAIXA IS NULL)/*'Aberto Vencido'*/ OR ((DTVENC -
                                            DHBAIXA)> 0 AND DHBAIXA IS NOT NULL) /*'Antecipação'*/
                                            OR ((DTVENC - DHBAIXA) < 0 AND DHBAIXA IS NOT NULL) /*'Pago em atraso'*/ OR
                                                ((DTVENC - DHBAIXA)=0 AND DHBAIXA IS NOT NULL) /*'No dia'*/ ) AND
                                                CODPARC=:A_CODPARC ) </snk:query>

                                                <c:forEach items="${dias.rows}" var="row">
                                                    <div class="card ${row.DIAS_EM_ATRASO >= 0 ? 'blue-card' : 'red-card'}"
                                                        onclick="abrirNotas('${A_CODPARC}')">
                                                        <div class="card-title">PONTUALIDADE</div>
                                                        <div class="card-content">
                                                            <fmt:formatNumber value="${row.DIAS_EM_ATRASO}"
                                                                pattern="#0" />
                                                        </div>
                                                        <div class="card-description">Dias</div>
                                                    </div>
                                                </c:forEach>

                                                <script>
                                                    function abrirNotas(A_CODPARC) {
                                                        var params = { 'CODPARC': A_CODPARC };
                                                        openLevel('lvl_82xfp3', params);
                                                    }
                                                </script>

                    </body>

                    </html>