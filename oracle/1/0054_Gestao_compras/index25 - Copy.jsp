<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.sql.*, oracle.jdbc.*, oracle.jdbc.driver.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chamada de Procedure Oracle em JSP</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        /* Estilos CSS podem ser adicionados aqui */
    </style>
    <snk:load/>
</head>
<body>
    <%
        try {
            // Configurações de conexão com o banco de dados Oracle
            Class.forName("oracle.jdbc.driver.OracleDriver");
            String url = "jdbc:oracle:thin:@//10.40.4.47:1521/ORCL";
            String username = "SATISTST";
            String password = "sua_senha";
            Connection conn = DriverManager.getConnection(url, username, password);

            // Preparar a chamada da procedure
            CallableStatement stmt = conn.prepareCall("{call STP_TESTE_SOMA_SATIS}");

            // Executar a procedure
            stmt.execute();

            // Fechar conexões
            stmt.close();
            conn.close();
        } catch (Exception e) {
            out.println("Ocorreu um erro ao executar a procedure: " + e.getMessage());
            e.printStackTrace();
        }
    %>

    <h1>Procedure Oracle Executada com Sucesso!</h1>
    <!-- Pode adicionar mais conteúdo HTML aqui para mostrar resultados ou feedback ao usuário -->

    <snk:query var="teste">
        <!-- Aqui você pode adicionar qualquer consulta ou processamento adicional -->
    </snk:query>
</body>
</html>
