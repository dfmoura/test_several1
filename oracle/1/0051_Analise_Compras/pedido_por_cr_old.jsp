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
							html,
							body {
								margin: 0;
								padding: 0;
								height: 100%;
								width: 100%;
							}

							#treemap {
								width: 100vw;
								height: 100vh;
							}
						</style>
						<snk:load />
					</head>

					<body>
						<snk:query var="dias">

						WITH BAS AS (

						SELECT
						CODCENCUS,
						DESCRCENCUS,
						COUNT(*) AS TOTAL_PEDIDOS
						FROM
						(
						/*ESSES PEDIDOS SAO O NUNOTAORIG PARA ENCONTRAR AS NOTAS DECOMPRA DA CAB*/
						/*PEDIDOS COM COTACAO*/
						
						SELECT
						CAB.CODCENCUS,
						CUS.DESCRCENCUS
						FROM TGFCAB CAB
						INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
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
						CAB.CODCENCUS,
						CUS.DESCRCENCUS
						FROM TGFCAB CAB
						INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
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
						)A
						
						GROUP BY CODCENCUS,DESCRCENCUS
						ORDER BY 3 DESC
						)
						SELECT CODCENCUS,DESCRCENCUS,TOTAL_PEDIDOS FROM BAS
						</snk:query>

						<div id="treemap"></div>

						<script>
							// Exemplo de dados simples para o Treemap
							var data = [{
								type: "treemap",
								labels: ["Brasil", "Estados Unidos", "China", "Rússia", "Índia", "Alemanha"],
								parents: ["", "", "", "", "", ""],  // Nenhum "parent" para um único nível de dados
								values: [15, 25, 30, 10, 12, 8],   // Valores das categorias
								textinfo: "label+value+percent entry",
								marker: {
									colors: ["green", "blue", "red", "purple", "orange", "yellow"]  // Cores personalizadas
								}
							}];

							// Layout opcional
							var layout = {
								title: 'Distribuição por País',
								font: { size: 20 },
								margin: { t: 50, l: 0, r: 0, b: 0 }
							};

							// Renderizando o gráfico
							Plotly.newPlot('treemap', data, layout);
						</script>
					</body>

					</html>