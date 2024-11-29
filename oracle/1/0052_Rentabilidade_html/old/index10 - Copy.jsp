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
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<style>
    /* Estilos adicionais aqui */
    body {
        margin-top: 0; /* Remove o espaço no topo da página */
    }
    .card {
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .card:hover {
        transform: translateY(-10px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }
    .card:hover .card-body {

        border-radius: 15px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        background-color: #130455; /* Azul */
        color: #fff; /* Branco para o texto */
        
    }
    .card-footer {
        text-align: center; /* Centraliza o texto no rodapé */
    }
    .icon {
        margin: 0 auto; /* Centraliza horizontalmente */
        display: block;
        width: 35px;
        height: 35px;
        background-color: transparent; 
    }
    .card:hover .icon svg,
    .card:hover .icon img {
        filter: brightness(0) invert(1); /* Deixa o ícone branco ao passar o mouse */
    }
    .logo {
        width: 100%;
        max-width: 150px;
    }
</style>

<snk:load/>

<script>
function adicionarSeta(elementId, valor) {
    const upArrow = '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M24 12c0 6.623-5.377 12-12 12s-12-5.377-12-12 5.377-12 12-12 12 5.377 12 12zm-1 0c0 6.071-4.929 11-11 11s-11-4.929-11-11 4.929-11 11-11 11 4.929 11 11zm-11.5-4.828l-3.763 4.608-.737-.679 5-6.101 5 6.112-.753.666-3.747-4.604v11.826h-1v-11.828z" fill="green"/></svg>';
    const downArrow = '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M24 12c0-6.623-5.377-12-12-12s-12 5.377-12 12 5.377 12 12 12 12-5.377 12-12zm-1 0c0-6.071-4.929-11-11-11s-11 4.929-11 11 4.929-11 11-11 11-4.929 11 11zm-11.5 4.828l-3.763-4.608-.737.679 5 6.101 5-6.112-.753-.666-3.747 4.604v-11.826h-1v11.828z" fill="red"/></svg>';
    
    if (valor >= 1) {
        document.getElementById(elementId).innerHTML += upArrow;
    } else {
        document.getElementById(elementId).innerHTML += downArrow;
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    adicionarSeta('varVlrFat', ${row.VAR_VLRFAT});
    adicionarSeta('varVlrDevol', ${row.VAR_VLRDEVOL});
    adicionarSeta('varHl', ${row.VAR_HL});
    adicionarSeta('varVlr', ${row.VAR_VLR});
});
</script>

</head>

<body class="bg-light">

<snk:query var="dias">  
    <!-- Sua consulta SQL aqui -->
	SELECT 
		TO_CHAR(VLRFAT, '999G999G999G999D99') AS VLRFAT,
		TO_CHAR(VLRFAT_MA, '999G999G999G999D99') AS VLRFAT_MA,
		ROUND(VLRFAT/VLRFAT_MA, 2) AS VAR_VLRFAT,
		TO_CHAR(VLRDEVOL, '999G999G999G999D99') AS VLRDEVOL,
		TO_CHAR(VLRDEVOL_MA, '999G999G999G999D99') AS VLRDEVOL_MA,
		ROUND(VLRDEVOL/VLRDEVOL_MA, 2) AS VAR_VLRDEVOL,
		TO_CHAR(HL, '999G999G999G999D99') AS HL,
		TO_CHAR(HL_MA, '999G999G999G999D99') AS HL_MA,
		ROUND(HL/HL_MA, 2) AS VAR_HL,
		TO_CHAR(VLRDESC, '999G999G999G999D99') AS VLRDESC,
		TO_CHAR(VLRDESC_MA, '999G999G999G999D99') AS VLRDESC_MA,
		ROUND(VLRDESC/VLRDESC_MA, 2) AS VAR_VLR
	FROM

	(
	WITH MA AS(
	SELECT
	1 AS COD
	, ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL_MA 
	, ROUND(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST), 2) AS VLRFAT_MA
	, ROUND(SUM(ITE.VLRDESC), 2) AS VLRDESC_MA
	, ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC)END), 2) AS VLRDEVOL_MA
	FROM TGFCAB CAB
	INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
	INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
	WHERE TOP.GOLSINAL = -1
	AND TO_CHAR(CAB.DTNEG,'MM-YYYY') = TO_CHAR(ADD_MONTHS(:P_PERIODO.INI, -1),'MM-YYYY')
	AND TOP.TIPMOV IN ('V', 'D')
	AND TOP.ATIVO = 'S'
	)

	SELECT
	HL,VLRFAT,VLRDESC,VLRDEVOL,HL_MA,VLRFAT_MA,VLRDESC_MA,VLRDEVOL_MA
	FROM(
	SELECT
	1 AS COD
	, ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL 
	, ROUND(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST), 2) AS VLRFAT
	, ROUND(SUM(ITE.VLRDESC), 2) AS VLRDESC
	, ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC)END), 2) AS VLRDEVOL
	FROM TGFCAB CAB
	INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
	INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
	WHERE TOP.GOLSINAL = -1
	AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
	AND TOP.TIPMOV IN ('V', 'D')
	AND TOP.ATIVO = 'S') BAS
	INNER JOIN MA ON MA.COD = BAS.COD
	)
	
</snk:query>  

<c:forEach var="row" items="${dias.rows}">
    <div class="container my-4">
        <div class="row">
            <div class="col-md-3 mb-4">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="icon">
                            <svg width="35" height="35" xmlns="http://www.w3.org/2000/svg" fill="#130455" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none"/>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </div>
                        <h5 class="card-title">${row.EMPRESA}</h5>
                        <p class="card-text">Faturamento: R$ ${row.VLRFAT}</p>
                    </div>
                    <div class="card-footer text-muted">
                        <b>Mês Anterior:</b> ${row.VLRFAT_MA} <b>Var.:</b> <span id="varVlrFat">${row.VAR_VLRFAT}</span>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="icon">
                            <svg width="35" height="35" xmlns="http://www.w3.org/2000/svg" fill="#130455" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none"/>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </div>
                        <h5 class="card-title">${row.EMPRESA}</h5>
                        <p class="card-text">Devoluções: R$ ${row.VLRDEVOL}</p>
                    </div>
                    <div class="card-footer text-muted">
                        <b>Mês Anterior:</b> ${row.VLRDEVOL_MA} <b>Var.:</b> <span id="varVlrDevol">${row.VAR_VLRDEVOL}</span>
                    </div>
                </div>
            </div>

            <div class="col-md-3 mb-4">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="icon">
                            <svg width="35" height="35" xmlns="http://www.w3.org/2000/svg" fill="#130455" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none"/>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </div>
                        <h5 class="card-title">${row.EMPRESA}</h5>
                        <p class="card-text">Volume: ${row.HL} HL</p>
                    </div>
                    <div class="card-footer text-muted">
                        <b>Mês Anterior:</b> ${row.HL_MA} <b>Var.:</b> <span id="varHl">${row.VAR_HL}</span>
                    </div>
                </div>
            </div>

            <div class="col-md-3 mb-4">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="icon">
                            <svg width="35" height="35" xmlns="http://www.w3.org/2000/svg" fill="#130455" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none"/>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </div>
                        <h5 class="card-title">${row.EMPRESA}</h5>
                        <p class="card-text">Descontos: R$ ${row.VLRDESC}</p>
                    </div>
                    <div class="card-footer text-muted">
                        <b>Mês Anterior:</b> ${row.VLRDESC_MA} <b>Var.:</b> <span id="varVlr">${row.VAR_VLR}</span>
                    </div>
                </div>
            </div>

        </div>
    </div>
</c:forEach>

</body>
</html>
