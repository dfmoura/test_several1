<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="br.com.sankhya.modelcore.auth.AuthenticationInfo" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exibir Código do Grupo</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load />
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            width: 300px;
        }
        h1 {
            color: #333;
        }
        .codigo-grupo {
            font-size: 24px;
            font-weight: bold;
            color: #0056b3;
            margin-top: 20px;
        }
        .botao {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #0056b3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        .botao:hover {
            background-color: #003d82;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Código do Grupo Selecionado</h1>
        <div class="codigo-grupo" id="codigo-grupo">Carregando...</div>
        <button class="botao" onclick="voltar()">Voltar</button>
    </div>

    <script>
        // Função para obter o código do grupo da URL ou do localStorage
        function obterCodigoGrupo() {
            // Aqui você pode pegar o valor do localStorage ou da URL
            // Exemplo usando localStorage (defina o valor anteriormente com openLevel)
            const codGrupo = localStorage.getItem('A_CODGRUPO');
            
            if (codGrupo) {
                return codGrupo;
            } else {
                return 'Não encontrado';
            }
        }

        // Função para exibir o código do grupo
        function exibirCodigo() {
            const codGrupo = obterCodigoGrupo();
            document.getElementById('codigo-grupo').textContent = codGrupo;
        }

        // Função para voltar (pode ser usada para redirecionar para uma página anterior)
        function voltar() {
            window.history.back();
        }

        // Executa a função para exibir o código do grupo assim que a página carrega
        window.onload = exibirCodigo;
    </script>

</body>
</html>
