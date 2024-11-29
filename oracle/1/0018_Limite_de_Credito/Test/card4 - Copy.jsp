<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8"  isELIgnored ="false"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
<html lang="en">
	<html>
		<head>
			<title>Card Dashboard</title>
			
            <style>
                /* Style for the card */
                .card {
                    width: 200px;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    background-color: #f9f9f9;
                }
        
                /* Style for the paragraph within the card */
                .card p {
                    font-size: 24px;
                    text-align: center;
                    margin: 0;
                }

                .titulo {
                    font-size: 18px;
                    color: #666;
                    text-align: center;
                }


                .description {
                    font-size: 16px;
                    color: #666;
                    text-align: center;                    
                }


            </style>



			<snk:load/>	
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
		
		
			<div class="card">
				<div class="titulo">PONTUALIDADE</div>
                <c:forEach items="${dias.rows}" var="row">                   
				<div><fmt:formatNumber value="${row.DIAS}" pattern="#0"/></div>
				</c:forEach>
                <div class="description">Dias</div>
			</div>
		</body>
	</html>
