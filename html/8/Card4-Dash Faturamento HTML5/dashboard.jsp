<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
	<%@ page import="java.util.*" %>
		<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
			<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
				<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

					<!DOCTYPE html>
					<html lang="en">
					<html>

					<head>
						<title>Card Dashboard</title>
						<link rel="stylesheet" type="text/css" href="${BASE_FOLDER}styles.css">
						<link href="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet"
							id="bootstrap-css">
						<link src="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/css/bootstrap.min.js">
						</script>
						<link src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js">
						</script>

						<snk:load />
					</head>

					<body>
						<snk:query var="faturameto">
							SELECT
							TO_CHAR(VGF.DTNEG, 'YYYY') AS ANO,
							TO_CHAR(VGF.DTNEG, 'MM') AS MES,
							TO_CHAR(VGF.DTNEG, 'MM/YYYY') AS MES_ANO,
							SUM(VGF.VLRBAIXA*-1) AS CUSTO_MENSAL
							FROM
							VGF_RESULTADO_SATIS VGF
							INNER JOIN TSICUS CUS ON CUS.CODCENCUS = VGF.CODCENCUS
							WHERE
							VGF.DTNEG BETWEEN TO_DATE('2023-01-01', 'YYYY-MM-DD') AND TO_DATE('2023-08-11',
							'YYYY-MM-DD')
							AND VGF.CODCENCUS LIKE '7%'
							AND CUS.DESCRCENCUS NOT LIKE '%QUALIDADE%'
							GROUP BY
							TO_CHAR(VGF.DTNEG, 'YYYY'),
							TO_CHAR(VGF.DTNEG, 'MM'),
							TO_CHAR(VGF.DTNEG, 'MM/YYYY')
							ORDER BY ANO, MES
						</snk:query>


						<div class="dashboard">
							<c:forEach items="${faturameto.rows}" var="row">
								<div class="card">
									<h2>Mês / Ano</h2>
									<p>
										<fmt:formatNumber value="${row.MES_ANO}" />
									</p>
								</div>
							</c:forEach>
							<c:forEach items="${faturameto.rows}" var="row">
								<div class="card">
									<h2>Custo</h2>
									<p>
										<fmt:formatNumber value="${row.CUSTO_MENSAL}" pattern="#,##0.00" />
									</p>
								</div>
							</c:forEach>
						</div>
					</body>

					</html>