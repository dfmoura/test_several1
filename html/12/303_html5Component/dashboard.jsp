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
			<link rel="stylesheet" type="text/css" href="${BASE_FOLDER}styles.css">
			<link href="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">
			<link src="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/css/bootstrap.min.js"></script>
			<link src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>

			<snk:load/>	
		</head>

		<body>
				<snk:query var="faturameto">
				SELECT 
				  DISTINCT to_CHAR(CAB.DTMOV, 'YYYY') ANO, 
				  to_CHAR(CAB.DTMOV, 'MM') MES, 
				  CAB.CODEMP, 
				  EMP.RAZAOSOCIAL, 
				  ENDI.NOMEEND, 
				  EMP.NUMEND, 
				  EMP.COMPLEMENTO, 
				  BAI.NOMEBAI, 
				  CID.NOMECID, 
				  UFS.UF, 
				  EMP.CEP, 
				  EMP.CGC, 
				  SUM(CASE WHEN CAB.CODTIPOPER IN (1100, 1112, 1152) THEN VLRNOTA ELSE 0 END) AS Saidas, 
				  SUM(CASE WHEN CAB.CODTIPOPER IN (1200, 1201, 1216, 1217) THEN VLRNOTA * -1 ELSE 0 END) AS Devolucoes, 
				  SUM(CASE WHEN CAB.CODTIPOPER IN (1105) THEN VLRNOTA ELSE 0 END) AS Servicos, 
				  SUM(CASE WHEN CAB.CODTIPOPER IN (1100, 1112, 1152) THEN VLRNOTA ELSE 0 END) + 
				  SUM(CASE WHEN CAB.CODTIPOPER IN (1200, 1201, 1216, 1217) THEN VLRNOTA * -1 ELSE 0 END) + 
				  SUM(CASE WHEN CAB.CODTIPOPER IN (1105) THEN VLRNOTA ELSE 0 END ) AS Total 
				FROM 
				  TGFCAB CAB 
				  INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP 
				  INNER JOIN TSIEND ENDI on EMP.CODEND = ENDI.CODEND 
				  INNER JOIN TSIBAI BAI on EMP.CODBAI = BAI.CODBAI 
				  INNER JOIN TSICID CID on EMP.CODCID = CID.CODCID 
				  INNER JOIN TSIUFS UFS ON CID.UF = UFS.CODUF 
				WHERE 
				  TO_CHAR(CAB.DTMOV,'MM-YYYY') = :P_PERIODO
				  AND CAB.CODTIPOPER IN (
					1100, 1112, 1152, 1200, 1201, 1216, 1217, 
					1105) 
				  AND CAB.CODEMP IN (:P_EMPRESA)
				  AND CAB.STATUSNOTA = 'L' 
				GROUP BY 
				  to_CHAR(CAB.DTMOV, 'YYYY'), 
				  to_CHAR(CAB.DTMOV, 'MM'), 
				  CAB.CODEMP, 
				  EMP.RAZAOSOCIAL, 
				  ENDI.NOMEEND, 
				  EMP.NUMEND, 
				  EMP.COMPLEMENTO, 
				  BAI.NOMEBAI, 
				  CID.NOMECID, 
				  UFS.UF, 
				  EMP.CEP, 
				  EMP.CGC 
				ORDER BY 
				  1, 
				  2
				</snk:query>	
		
		
			<div class="dashboard">
				<c:forEach items="${faturameto.rows}" var="row">
					<div class="card">
						<h2>Faturamento</h2>
						<p><fmt:formatNumber value="${row.Total}" pattern="#,##0.00" /></p>
					</div>
					</c:forEach>
					<c:forEach items="${faturameto.rows}" var="row">
					<div class="card">
						<h2>Devolução</h2>
					<p><fmt:formatNumber value="${row.Devolucoes}" pattern="#,##0.00" /></p>
					</div>
					</c:forEach>
					<c:forEach items="${faturameto.rows}" var="row">
					<div class="card">
						<h2>Saídas</h2>
						<p><fmt:formatNumber value="${row.Saidas}" pattern="#,##0.00" /></p>
					</div>
					</c:forEach>
					<c:forEach items="${faturameto.rows}" var="row">					
					<div class="card">
						<h2>Serviços</h2>
						<p><fmt:formatNumber value="${row.Servicos}" pattern="#,##0.00" /></p>
					</div>
					</c:forEach>
			</div>
		</body>
	</html>