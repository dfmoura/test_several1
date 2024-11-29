<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
	<%@ page import="java.util.*" %>
		<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
			<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
				<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
					<html>

					<head>
						<title>HTML5 Component</title>
						<link rel="stylesheet" type="text/css" href="${BASE_FOLDER}css/mainCSS.css">

						<style>
							table {
								border-collapse: collapse;
								width: 100%;
							}

							table,
							th,
							td {
								border: 0.6px solid black;
								/* Define o contorno da tabela, cabeçalhos e células */
							}

							th,
							td {
								padding: 8px;
								text-align: left;
							}

							th {
								background-color: #f2f2f2;
								/* Estilo opcional para o cabeçalho */
							}
						</style>



						<snk:load />

					</head>

					<body>

						<h2>HTML5 Component Example</h2>

						<!-- Exemplo de grade utilizando a query 'teste' -->
						<snk:query var="teste">
							select 1 cod,'teste' AS CAMPO, 1500 as valor from dual
							union all
							select 2 cod,'teste1' AS CAMPO, 1500 as valor from dual
							union all
							select 3 cod,'teste1' AS CAMPO, 1500 as valor from dual

						</snk:query>

						<table border="0.6">
							<thead>
								<tr>
									<th>Cód</th>
									<th>Tipo</th>
									<th>Valor</th>
								</tr>
							</thead>
							<tbody>
								<c:set var="total" value="0" />
								<c:forEach items="${teste.rows}" var="row">
									<tr>
										<td onclick="abrir('${row.cod}')">${row.cod}</td>
										<td onclick="atualizar('${row.cod}')">${row.campo}</td>
										<td>
											<fmt:formatNumber value="${row.valor}" type="number" maxFractionDigits="2"
												minFractionDigits="2" />
										</td>
										<c:set var="total" value="${total + row.valor}" />
									</tr>
								</c:forEach>
								<tr>
									<td><b>Total</b></td>
									<td></td>
									<td><b>
											<fmt:formatNumber value="${total}" type="number" maxFractionDigits="2"
												minFractionDigits="2" />
										</b></td>
								</tr>
							</tbody>
						</table>
						<script>
							// Função para abrir o novo nível
							function abrir(codigo) {
								var params = { 'A_TESTE': parseInt(codigo) };
								var level = 'lvl_9w67xu';
								openLevel(level, params);
							}

							// Função para abrir o novo nível
							
							function atualizar(codigo) {
								const params = { 'A_TESTE': parseInt(codigo),
												 'A_TESTE2': parseInt(codigo)
								 };

								refreshDetails('svl_9w67yy', params);
							}
						</script>
					</body>

					</html>