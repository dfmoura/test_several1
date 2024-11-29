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
                            CODPARC,
                            RAZAOSOCIAL,
                            COALESCE(AD_DTVENCCAD,SYSDATE) AS AD_DTVENCCAD,
                            CASE
                            WHEN AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
                            WHEN AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' 
                            ELSE 'Sem Data de Cadastro' 
                            END AS STATUS_CADASTRO, 
                            SIGN(NVL(AD_DTVENCCAD, SYSDATE) - SYSDATE) AS A, 
                            NVL(AD_DTVENCCAD,SYSDATE) - SYSDATE AS DIAS 
                            FROM TGFPAR 
                            WHERE CODPARC = :A_CODPARC 

                        </snk:query>


                                <c:forEach items="${dias.rows}" var="row">
                                    <div class="card ${row.DIAS >= 0 ? 'blue-card' : 'red-card'}">
                                        <div class="card-title">DIAS VENC. CADASTRO</div>
                                        <div class="card-content">
                                            <strong><fmt:formatDate value="${row.AD_DTVENCCAD}" pattern="dd-MM-yyyy"/></strong>
                                        </div>
                                        <div></div>
                                        <div class="card-description">${row.STATUS_CADASTRO}</div>
                                    </div>
                                </c:forEach>
                    </body>

                    </html>