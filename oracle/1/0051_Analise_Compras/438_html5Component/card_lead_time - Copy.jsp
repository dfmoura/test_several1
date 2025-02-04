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
    <title>Card Dashboard</title>
<style>
    /* Estilos básicos para o layout */
		body {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			grid-template-rows: repeat(2, 1fr);
			gap: 15px;
			height: 50vh;
			padding: 20px;
		}

		.card {
			background-color: #f0f0f0;
			border-radius: 10px;
			padding: 15px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			text-align: center;
			cursor: pointer;
		}

		.card:hover {
			background-color: #e0e0e0;
		}

		.card svg {
			width: 50px;
			height: 50px;
			margin-bottom: 10px;
		}

		p {
			font-size: 35px;
			font-weight: bold;
		}

		p2 {
			font-size: 18px;
			font-weight: bold;
		}

		.header-card {
			grid-column: span 2;
			padding: 15px 20px;
			background-color: #2ca025;
			border-radius: 10px;
			display: flex;
			align-items: center;
			justify-content: left;
			color: white;
			transition: background-color 0.3s ease;
		}

		.header-card:hover {
			background-color: #028001;
		}

		.header-card h3 {
			display: flex;
			align-items: center;
			gap: 10px;
			margin: 0;
			font-size: 1.5em;
		}

		.header-card svg {
			width: 24px;
			height: 24px;
			fill: white;
		}

		.lead-time-details {
			display: flex;
			align-items: center;
			gap: 20px;
			font-size: 1.2em;
			margin-left: 10px;
		}

		.lead-time-details span {
			background-color: rgba(255, 255, 255, 0.1);
			padding: 5px 10px;
			border-radius: 5px;
		}
		
</style>
        
    <snk:load/>
        
</head>
<body>
    
<snk:query var="dias">    

SELECT 
SUM(TOTAL_REQUISICOES) AS TOTAL_REQUISICOES,
SUM(SEM_COTACAO) AS SEM_COTACAO,
SUM(COM_COTACAO) AS COM_COTACAO,
SUM(TOTAL_COTACOES) AS TOTAL_COTACOES,
SUM(COTACAO_FINALIZADA) AS COTACAO_FINALIZADA,
SUM(COTACAO_ABERTO) AS COTACAO_ABERTO,
SUM(COTACAO_CANCELADA) AS COTACAO_CANCELADA,
SUM(TOTAL_PEDIDOS) AS TOTAL_PEDIDOS,
SUM(PEDIDOS_COM_COTACAO) AS PEDIDOS_COM_COTACAO,
SUM(PEDIDOS_SEM_COTACAO) AS PEDIDOS_SEM_COTACAO,
SUM(NOTA_COM_PEDIDO)+SUM(NOTA_SEM_PEDIDO) AS TOTAL_NOTA, 
SUM(NOTA_COM_PEDIDO) AS NOTA_COM_PEDIDO,
SUM(NOTA_SEM_PEDIDO) AS NOTA_SEM_PEDIDO,
AVG(REQ_TO_COT) AS REQ_TO_COT,
AVG(COT_TO_PED) AS COT_TO_PED,
AVG(PED_TO_NOTA) AS PED_TO_NOTA,
AVG(TOTAL_DIAS) AS TOTAL_DIAS
FROM
(
SELECT 
COUNT(*) AS TOTAL_REQUISICOES,
SUM(CASE WHEN CAB.NUMCOTACAO IS NULL THEN 1 END) AS SEM_COTACAO,
SUM(CASE WHEN CAB.NUMCOTACAO IS NOT NULL THEN 1 END) AS COM_COTACAO,
NULL AS TOTAL_COTACOES,
NULL AS COTACAO_FINALIZADA,
NULL AS COTACAO_ABERTO,
NULL AS COTACAO_CANCELADA,
NULL AS TOTAL_PEDIDOS,
NULL AS PEDIDOS_COM_COTACAO,
NULL AS PEDIDOS_SEM_COTACAO,
NULL AS TOTAL_NOTA,
NULL AS NOTA_COM_PEDIDO,
NULL AS NOTA_SEM_PEDIDO,
NULL AS REQ_TO_COT,
NULL AS COT_TO_PED,
NULL AS PED_TO_NOTA,
NULL AS TOTAL_DIAS


FROM TGFCAB CAB
WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN

UNION ALL

SELECT
NULL AS TOTAL_REQUISICOES,
NULL AS SEM_COTACAO,
NULL AS COM_COTACAO,
COUNT(*) AS TOTAL_COTACOES,
SUM(CASE WHEN COT.SITUACAO = 'F' THEN 1 END) AS COTACAO_FINALIZADA,
SUM(CASE WHEN COT.SITUACAO = 'A' THEN 1 END) AS COTACAO_ABERTO,
SUM(CASE WHEN COT.SITUACAO = 'C' THEN 1 END) AS COTACAO_CANCELADA,
NULL AS TOTAL_PEDIDOS,
NULL AS PEDIDOS_COM_COTACAO,
NULL AS PEDIDOS_SEM_COTACAO,
NULL AS TOTAL_NOTA,
NULL AS NOTA_COM_PEDIDO,
NULL AS NOTA_SEM_PEDIDO,
NULL AS REQ_TO_COT,
NULL AS COT_TO_PED,
NULL AS PED_TO_NOTA,
NULL AS TOTAL_DIAS
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)


UNION ALL



/*ESSES PEDIDOS SAO O NUNOTAORIG PARA ENCONTRAR AS NOTAS DECOMPRA DA CAB*/
SELECT 
NULL AS TOTAL_REQUISICOES,
NULL AS SEM_COTACAO,
NULL AS COM_COTACAO,
NULL AS TOTAL_COTACOES,
NULL AS COTACAO_FINALIZADA,
NULL AS COTACAO_ABERTO,
NULL AS COTACAO_CANCELADA,
SUM(PEDIDOS_COM_COTACAO) + SUM(PEDIDOS_SEM_COTACAO) AS TOTAL_PEDIDOS,
SUM(PEDIDOS_COM_COTACAO) AS PEDIDOS_COM_COTACAO,
SUM(PEDIDOS_SEM_COTACAO) AS PEDIDOS_SEM_COTACAO,
NULL AS TOTAL_NOTA,
NULL AS NOTA_COM_PEDIDO,
NULL AS NOTA_SEM_PEDIDO,
NULL AS REQ_TO_COT,
NULL AS COT_TO_PED,
NULL AS PED_TO_NOTA,
NULL AS TOTAL_DIAS
FROM
(

/*PEDIDOS COM COTACAO*/

SELECT
COUNT(*) AS PEDIDOS_COM_COTACAO,
NULL AS PEDIDOS_SEM_COTACAO
FROM TGFCAB CAB
WHERE TIPMOV IN ('O') AND CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)

UNION ALL


/*PEDIDOS SEM COTACAO*/

SELECT
NULL AS PEDIDOS_COM_COTACAO,
COUNT(*) AS PEDIDOS_SEM_COTACAO
FROM TGFCAB CAB
WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND CAB.NUNOTA NOT IN(
SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)
)
)

UNION ALL


/*********** NOTA ***************** **************/

SELECT
NULL AS TOTAL_REQUISICOES,
NULL AS SEM_COTACAO,
NULL AS COM_COTACAO,
NULL AS TOTAL_COTACOES,
NULL AS COTACAO_FINALIZADA,
NULL AS COTACAO_ABERTO,
NULL AS COTACAO_CANCELADA,
NULL AS TOTAL_PEDIDOS,
NULL AS PEDIDOS_COM_COTACAO,
NULL AS PEDIDOS_SEM_COTACAO,
SUM(NOTA_COM_PEDIDO)+SUM(NOTA_SEM_PEDIDO) AS TOTAL_NOTA, 
SUM(NOTA_COM_PEDIDO) AS NOTA_COM_PEDIDO,
SUM(NOTA_SEM_PEDIDO) AS NOTA_SEM_PEDIDO,
NULL AS REQ_TO_COT,
NULL AS COT_TO_PED,
NULL AS PED_TO_NOTA,
NULL AS TOTAL_DIAS
FROM(
/*********** NOTA SEM PEDIDO **************/
SELECT 
NULL AS NOTA_COM_PEDIDO, COUNT(*) AS NOTA_SEM_PEDIDO
FROM TGFCAB CAB
WHERE CAB.TIPMOV='C'
AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND CAB.NUNOTA NOT IN (
WITH VAR AS (SELECT DISTINCT NUNOTA,NUNOTAORIG FROM TGFVAR)
SELECT 
CAB.NUNOTA
FROM TGFCAB CAB
INNER JOIN VAR ON CAB.NUNOTA = VAR.NUNOTA
WHERE CAB.TIPMOV='C'
AND VAR.NUNOTAORIG IN (
/*PEDIDOS COM COTACAO*/

SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)

UNION ALL


/*PEDIDOS SEM COTACAO*/

SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND CAB.NUNOTA NOT IN(
SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)
)
)
)


UNION ALL



/****************************** NOTA COM PEDIDO ***********************************/

SELECT COUNT(*) AS NOTA_COM_PEDIDO, NULL AS NOTA_SEM_PEDIDO
FROM
(
WITH VAR AS (SELECT DISTINCT NUNOTA,NUNOTAORIG FROM TGFVAR)
SELECT 
CAB.*
FROM TGFCAB CAB
INNER JOIN VAR ON CAB.NUNOTA = VAR.NUNOTA
WHERE CAB.TIPMOV='C'
AND VAR.NUNOTAORIG IN (
/*PEDIDOS COM COTACAO*/

SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)

UNION ALL


/*PEDIDOS SEM COTACAO*/

SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND CAB.NUNOTA NOT IN(
SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)))))

UNION ALL


/*********** LEAD TIME ***************** **************/
SELECT
NULL AS TOTAL_REQUISICOES,
NULL AS SEM_COTACAO,
NULL AS COM_COTACAO,
NULL AS TOTAL_COTACOES,
NULL AS COTACAO_FINALIZADA,
NULL AS COTACAO_ABERTO,
NULL AS COTACAO_CANCELADA,
NULL AS TOTAL_PEDIDOS,
NULL AS PEDIDOS_COM_COTACAO,
NULL AS PEDIDOS_SEM_COTACAO,
NULL AS TOTAL_NOTA, 
NULL AS NOTA_COM_PEDIDO,
NULL AS NOTA_SEM_PEDIDO,
ROUND(AVG(REQ_TO_COT),0) AS REQ_TO_COT,
ROUND(AVG(COT_TO_PED),0) AS COT_TO_PED,
ROUND(AVG(PED_TO_NOTA),0) AS PED_TO_NOTA,
ROUND(AVG(TOTAL_DIAS),0) AS TOTAL_DIAS
FROM
(

WITH
/*REQUISICAO*/
REQ AS
(SELECT 
CAB.DTMOV ,CAB.DTNEG,CAB.NUNOTA,CAB.NUMCOTACAO
FROM TGFCAB CAB
WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.NUMCOTACAO IS NOT NULL
AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN),

/*COTACAO*/
COT AS
(SELECT
COT.DHINIC,COT.NUMCOTACAO, COT.NUNOTAORIG
FROM TGFCOT COT
INNER JOIN TSIUSU USU ON COT.CODUSUREQ = USU.CODUSU
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)),


/*PEDIDOS COM COTACAO*/
PED AS
(SELECT
CAB.DTMOV,CAB.DTNEG,CAB.NUNOTA,CAB.NUMCOTACAO
FROM TGFCAB CAB
WHERE TIPMOV IN ('O') AND CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN) 
)),



/*NOTA COM COTACAO*/
NOTA AS
(SELECT 
DTNEG,DTMOV,NUNOTA,NUNOTAORIG
FROM
(
SELECT DISTINCT
CAB.DTNEG,CAB.DTMOV,CAB.NUNOTA,VAR.NUNOTAORIG
FROM TGFCAB CAB
INNER JOIN TGFVAR VAR ON CAB.NUNOTA = VAR.NUNOTA
WHERE CAB.TIPMOV='C'
AND VAR.NUNOTAORIG IN (
/*PEDIDOS COM COTACAO*/
SELECT
CAB.NUNOTA
FROM TGFCAB CAB
WHERE CAB.NUMCOTACAO IN(
SELECT
COT.NUMCOTACAO
FROM TGFCOT COT
WHERE 
COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
)
)))

SELECT 
REQ.DTMOV AS DTMOV_REQ,
REQ.DTNEG AS DTNEG_REQ,
REQ.NUNOTA AS NUNOTA_REQ,
REQ.NUMCOTACAO AS NUMCOTACAO_REQ,
COT.DHINIC AS DTINCIO_COT,
COT.NUNOTAORIG AS NUNOTA_COT,
COT.NUMCOTACAO AS NUMCOTACAO_COT, 
PED.DTMOV AS DTMOV_PED,
PED.DTNEG AS DTNEG_PED,
PED.NUNOTA AS DTNEG_PED,
PED.NUMCOTACAO AS NUMCOTACAO_PED,
NOTA.DTNEG AS DTNEG_NOTA,
NOTA.DTMOV AS DTMOV_NOTA,
NOTA.NUNOTA AS NUNOTA_NOTA,
NOTA.NUNOTAORIG AS NUNOTAORIG_NOTA,
COT.DHINIC - REQ.DTMOV AS REQ_TO_COT,
PED.DTMOV - COT.DHINIC AS COT_TO_PED,
NOTA.DTMOV - PED.DTMOV AS PED_TO_NOTA,
(COT.DHINIC - REQ.DTMOV)+(PED.DTMOV - COT.DHINIC)+(NOTA.DTMOV - PED.DTMOV) AS TOTAL_DIAS

FROM REQ
INNER JOIN COT ON REQ.NUMCOTACAO = COT.NUMCOTACAO
INNER JOIN PED ON COT.NUMCOTACAO = PED.NUMCOTACAO
LEFT JOIN NOTA ON PED.NUNOTA = NOTA.NUNOTAORIG
)



)


</snk:query>    

<c:forEach items="${dias.rows}" var="row">    

		<div class="header-card" onclick="abrir_lead()">
			<h3>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M15.91 13.34l2.636-4.026-.454-.406-3.673 3.099c-.675-.138-1.402.068-1.894.618-.736.823-.665 2.088.159 2.824.824.736 2.088.665 2.824-.159.492-.55.615-1.295.402-1.95zm-3.91-10.646v-2.694h4v2.694c-1.439-.243-2.592-.238-4 0zm8.851 2.064l1.407-1.407 1.414 1.414-1.321 1.321c-.462-.484-.964-.927-1.5-1.328zm-18.851 4.242h8v2h-8v-2zm-2 4h8v2h-8v-2zm3 4h7v2h-7v-2zm21-3c0 5.523-4.477 10-10 10-2.79 0-5.3-1.155-7.111-3h3.28c1.138.631 2.439 1 3.831 1 4.411 0 8-3.589 8-8s-3.589-8-8-8c-1.392 0-2.693.369-3.831 1h-3.28c1.811-1.845 4.321-3 7.111-3 5.523 0 10 4.477 10 10z"/>
				</svg>
				Lead Time (Dias Médio): 
			</h3>
			<div class="lead-time-details">
				<span><u>Requisições</u>: ${row.REQ_TO_COT} dia(s)</span>
				<span><u>Cotações</u>: ${row.COT_TO_PED} dia(s)</span>
				<span><u>Pedidos</u>: ${row.PED_TO_NOTA} dia(s)</span>
				<span><u>Nota</u> = Total: ${row.TOTAL_DIAS} dia(s)</span>
			</div>
			

			
			
			
		</div>
    

    <!-- Primeiro Card -->
        <div class="card" onclick="abrir_req()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M19.5 8c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5-2.015-4.5-4.5-4.5zm-.5 7v-2h-2v-1h2v-2l3 2.5-3 2.5zm-5.701-11.26c-.207-.206-.299-.461-.299-.711 0-.524.407-1.029 1.02-1.029.262 0 .522.1.721.298l3.783 3.783c-.771.117-1.5.363-2.158.726l-3.067-3.067zm-.299 8.76c0-1.29.381-2.489 1.028-3.5h-14.028v2h.643c.535 0 1.021.304 1.256.784l4.101 10.216h12l1.211-3.015c-3.455-.152-6.211-2.993-6.211-6.485zm-2.299-8.76c.207-.206.299-.461.299-.711 0-.524-.407-1.029-1.02-1.029-.261 0-.522.1-.72.298l-4.701 4.702h2.883l3.259-3.26z"/></svg>
        <h3>Total de Requisições</h3>
        <p>${row.TOTAL_REQUISICOES}</p>
		<p2>Sem Cotação: ${row.SEM_COTACAO} | Com Cotação: ${row.COM_COTACAO}</p2>
        
    </div>

    
    <!-- Segundo Card -->
    <div class="card" onclick="abrir_cot()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M7 22v-16h14v7.543c0 4.107-6 2.457-6 2.457s1.518 6-2.638 6h-5.362zm16-7.614v-10.386h-18v20h8.189c3.163 0 9.811-7.223 9.811-9.614zm-10 1.614h-4v-1h4v1zm6-4h-10v1h10v-1zm0-3h-10v1h10v-1zm1-7h-17v19h-2v-21h19v2z"/></svg>
        <h3>Total de Cotações</h3>
        <p>${row.TOTAL_COTACOES}</p>
		<p2>Fechada: ${row.COTACAO_FINALIZADA} | Aberta: ${row.COTACAO_ABERTO} | Cancelada: ${row.COTACAO_CANCELADA}</p2>
    </div>

    <!-- Terceiro Card -->
    <div class="card" onclick="abrir_ped()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20 0v2h-18v18h-2v-20h20zm-7.281 20.497l-.719 3.503 3.564-.658-2.845-2.845zm8.435-8.436l2.846 2.845-7.612 7.612-2.845-2.845 7.611-7.612zm-17.154-8.061v20h6v-2h-4v-16h16v4.077l2 2v-8.077h-20z"/></svg>
		<h3>Total de Pedidos</h3>
        <p>${row.TOTAL_PEDIDOS}</p>
        <p2>Sem Cotação: ${row.PEDIDOS_SEM_COTACAO} | Com Cotação: ${row.PEDIDOS_COM_COTACAO}</p2>
    </div>

    <!-- Quarto Card -->
    <div class="card" onclick="abrir_not()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20 0v2h-18v18h-2v-20h20zm3.889 22.333l-4.76-4.761c.51-.809.809-1.764.809-2.791 0-2.9-2.35-5.25-5.25-5.25s-5.25 2.35-5.25 5.25 2.35 5.25 5.25 5.25c1.027 0 1.982-.299 2.791-.809l4.761 4.76 1.649-1.649zm-13.201-7.552c0-2.205 1.795-4 4-4s4 1.795 4 4-1.795 4-4 4-4-1.795-4-4zm6.74 7.219h-11.428v-16h16v11.615l2 2v-15.615h-20v20h15.428l-2-2z"/>
        </svg>
        <h3>Total de Notas</h3>
        <p>${row.TOTAL_NOTA}</p>
		<p2>Sem Pedido: ${row.NOTA_SEM_PEDIDO} | Com Pedido: ${row.NOTA_COM_PEDIDO}</p2>
    </div>
</c:forEach>
		<script>      
			function abrir_req(){
				var params = '';
				var level = 'lvl_j1baux';
				openLevel(level, params);
			}
			
			

			function abrir_cot(){
				var params = '';
				var level = 'lvl_j1ba4y';
				openLevel(level, params);
			}

			function abrir_ped(){
				var params = '';
				var level = 'lvl_fonk0l';
				openLevel(level, params);
			}

			function abrir_not(){
				var params = '';
				var level = 'lvl_kj5cgy';
				openLevel(level, params);
			}

			function abrir_lead(){
				var params = '';
				var level = 'lvl_noencs';
				openLevel(level, params);
			}
		
		</script> 
		
		
		
		
</html>
