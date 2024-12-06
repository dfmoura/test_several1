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
                        <title>Dashboard</title>
                        <link rel="stylesheet"
                            href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">


                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 20px;
                            }

                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 20px;
                                transition: transform 0.3s ease; 
                                font-size: 14px;
                            }

                            table:hover {
                                transform: translateX(10px); 
                            }                            

                            th,
                            td {
                                padding: 10px;
                                border: 1px solid #ddd;
                                text-align: left;
                            }

                            th {
                                background-color: #f4f4f4;
                                cursor: pointer;
                                position: sticky;
                                top: 0;
                                z-index: 2;
                            }

                            th:hover {
                                background-color: #eaeaea;
                            }

                            .sorted {
                                backgrou
                            }
                        </style>


                        <snk:load />


                    </head>

                    <body>


                        <snk:query var="dias">

                        SELECT CODPROD,DESCRPROD,COUNT(*) AS CONTAGEM FROM TGFPRO GROUP BY CODPROD,DESCRPROD
                        </snk:query>


                        <header>
                            <h1 class="titulo-header">Teste</h1>
                        </header>


                        <h2>Teste 2</h2>

                        <table>
                            
                            <thead >
                                <tr>
                                    <th>Código</th>
                                    <th>Produto</th>
                                    <th>Qtd</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:set var="total" value="0" />
                                <c:forEach items="${dias.rows}" var="row">
                                    <tr>
                                        <td>${row.CODPROD}</td>
                                        <td>${row.DESCRPROD}</td>
                                        <td>${row.CONTAGEM}</td>
                                        <c:set var="total" value="${total + row.CONTAGEM}" />
                                    </tr>
                                </c:forEach>
                                <tr>
                                    <td>Total</td>
                                    <td><b><fmt:formatNumber value="${total}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                    </body>

                    </html>