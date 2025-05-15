<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8"  isELIgnored ="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Período de Baixa</title>

  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

  <snk:load/>
</head>
<body>

<script>
  // Datas do servidor
  const inicio = "${P_BAIXA.INI}";
  const fim = "${P_BAIXA.FIN}";


  function mostrarPeriodo() {
    alert("Período de baixa:\nInício: " + inicio + "\nFim: " + fim);
  }


    // Função para formatar data
  function formatarData(dataString) {
    const [data] = dataString.split(" "); // separa data da hora
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }


    function mostrarPeriodo1() {
    alert("Período de baixa:\nInício: " + "${P_BAIXA.INI}" + "\nFim: " + "${P_BAIXA.FIN}");
  }


    // Função para formatar data
    function formatarData(dataString) {
      const [data] = dataString.split(" "); // separa data da hora
      const [ano, mes, dia] = data.split("-");
      return `${dia}/${mes}/${ano}`;
    }


            function mostrarPeriodo2() {
    alert("Período de baixa:\nInício: " + formatarData(inicio) + "\nFim: " + formatarData(fim));
  }

  
</script>

<!-- Botão que chama o alerta -->
<button onclick="mostrarPeriodo()">Mostrar Período</button>
<button onclick="mostrarPeriodo1()">Mostrar Período 1</button>
<button onclick="mostrarPeriodo2()">Mostrar Período 2</button>

</body>
</html>
