<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8"  isELIgnored ="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>

<!DOCTYPE html>
<html lang="en">

<head>

    <!--
        ===================================
        MODULO: COMERCIAL
        ROTINA: DRE GERENCIAL
        CRIADOR: DANIEL CAMPOS
        DATA: 30/08/2022
        ===================================
    -->

    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <title>Segundo Nivel</title>

    <!-- Bootstrap core CSS -->
    <link href="${BASE_FOLDER}/assets/css/styleNivel.css" rel="stylesheet">

    <snk:load/>

</head>

<body class="principal">
    <div class="cards-list" >
      
	   
	   <a href="#" onclick="javascript:abrirEntradaSemente()" class="custom-card"> 
            <div class="card 1">
                <div align="center" class="card_image" style="background-color: #FFFFFF"> 
				<img src="${BASE_FOLDER}/assets/img/evolucao.png"/> 							
				</div>
				<div class="card_title title-black">
                    <p>DRE GERENCIAL</p>				
				</div>							
            </div>
        </a>
		
     </div>
	 
     <script src='https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>
     <script src='https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js'></script>
</body>
</html>