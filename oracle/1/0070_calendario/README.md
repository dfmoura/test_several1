
com esta bibliotecas

<script src="jx.js"></script> <!-- Homologação e Debug -->
<script src="jx.min.js"></script> <!-- Produção -->
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>


adaptar no CODIGO PRINCIPAL  abaixo para consultar o banco de dados
utilizando este padrao e as bibliotecas citadas acima:
consultar(query): Realiza consultas SQL. Retorna uma promessa com os resultados da consulta.
/* Consulta ao banco com resposta formatada em JS */
JX.consultar ('SELECT * FROM TGFMAR').then (console.log);


utilizar este select para popular as informacoes de DESCRICAO

select
cal.codigo AS codcal,
cal.cod_desenv_proj,
nov.codigo AS codigo,
nov.descricao AS descricao,
to_char(cal.dtainicio,'YYYY-MM-DD')dtainicio,
to_char(cal.dtafim,'YYYY-MM-DD')dtafim,
cal.obs,
case when cal.concluido = 'S' then 'Sim' else 'Nao' end concluido
from AD_CALENDINOV cal
INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico






CODIGO PRINCIPAL:


<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href='https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css' rel='stylesheet' />
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js'></script>
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/locales/pt-br.js'></script>
    <title>Calendário Responsivo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        #calendar {
            width: 100%;
            height: calc(100vh - 100px);
            max-width: 1200px;
            margin: 20px auto;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
    </style>
      <snk:load/>
</head>
<body>
    <div id="calendar"></div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const calendarEl = document.getElementById('calendar');

            const calendar = new FullCalendar.Calendar(calendarEl, {
                locale: 'pt-br',
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                editable: false,
                selectable: false,
                events: []
            });

            calendar.render();
        });
    </script>
</body>
</html>
