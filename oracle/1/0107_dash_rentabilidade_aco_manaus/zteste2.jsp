<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  
  <style>
  </style>
  <snk:load/>
</head>
<body>

  <snk:query var="base_fat">


  WITH CTE AS (
      SELECT 
          descrgrupo_nivel1,
          SUM(totalliq) AS totalliq,
          ROW_NUMBER() OVER (ORDER BY SUM(totalliq) DESC) AS rn
      FROM vw_rentabilidade_aco 
      WHERE tipmov IN ('V', 'D')
        AND ATIVO_TOP = 'S'
        AND AD_COMPOE_FAT = 'S'
        AND dtneg BETWEEN FORMAT(DATEFROMPARTS(:A_DtInicial_Ano, :A_DtInicial_Mes, :A_DtInicial_Dia), 'dd/MM/yyyy')
                       AND FORMAT(DATEFROMPARTS(:A_DtFinal_Ano, :A_DtFinal_Mes, :A_DtFinal_Dia), 'dd/MM/yyyy')
        
      GROUP BY descrgrupo_nivel1
  )
  SELECT 
      CASE 
          WHEN rn <= 6 THEN descrgrupo_nivel1
          ELSE 'Outros'
      END AS descrgrupo_nivel1,
      SUM(totalliq) AS totalliq
  FROM CTE
  GROUP BY CASE 
               WHEN rn <= 6 THEN descrgrupo_nivel1
               ELSE 'Outros'
           END
  ORDER BY totalliq DESC
  
  </snk:query>  



  <c:forEach items="${base.rows}" var="row">
    ${row.descrgrupo_nivel1} - ${row.totalliq}


  </c:forEach>

  <script>

  </script>
  

</body>
</html>