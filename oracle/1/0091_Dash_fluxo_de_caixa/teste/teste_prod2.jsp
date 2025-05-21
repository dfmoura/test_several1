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
  const inicio = "${P_BAIXA.INI}";
  const fim = "${P_BAIXA.FIN}";

  if (inicio && fim && inicio !== "" && fim !== "") {
    alert("Período de baixa:\nInício: " + inicio + "\nFim: " + fim);
  } else {
    alert("Parâmetro P_BAIXA não definido ou incompleto.");
  }
</script>

</body>
</html>
