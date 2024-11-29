<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
  <%@ page import="java.util.*" %>
    <%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
      <%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
        <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

          <!DOCTYPE html>
          <html lang="en">
          

          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Example</title>
            <style>
              .card {
                width: 300px;
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }

              .value {
                font-size: 40px;
                font-weight: bold;
                margin-bottom: 10px;
              }

              .description {
                font-size: 16px;
                color: #666;
              }

              .titulo {
                font-size: 18px;
                color: #666;
              }
            </style>
          </head>

          <body>



            <snk:query var="dias">

              SELECT AVG(DIAS_EM_ATRASO) AS DIAS
              FROM (
              SELECT
              NUFIN
              ,DTVENC
              ,DHBAIXA
              ,DTVENC - NVL(DHBAIXA, TRUNC(SYSDATE)) AS DIAS_EM_ATRASO
              FROM TGFFIN
              WHERE RECDESP = 1
              AND CODPARC = :A_CODPARC
              )

            </snk:query>


            <c:forEach items="${dias.rows}" var="row">
              <div class="card" id="card">
                <div class="titulo">PONTUALIDADE</div>
                <div class="value" id="value"><p><fmt:formatNumber value="${row.Total}" pattern="#,##0.00"/></p></div>
                <div class="description">Dias</div>  
              </div>
              </c:forEach>




            <script>
              // Get the value element
              var valueElement = document.getElementById('value');

              // Get the card element
              var cardElement = document.getElementById('card');

              // Convert the text content of the value element to a number
              var value = parseFloat(valueElement.textContent);

              // Set the card color based on the value
              if (value > 0) {
                cardElement.style.backgroundColor = '#3498db'; // Blue color
              } else {
                cardElement.style.backgroundColor = '#e74c3c'; // Red color
              }
            </script>

          </body>

          </html>