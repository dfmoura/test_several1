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
<link href="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/locales/pt-br.js"></script>
<script src="jx.min.js"></script> <!-- Produção -->
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

// Função para gerar cores aleatórias em formato hexadecimal
function randomColor() {
return '#' + Math.floor(Math.random()*16777215).toString(16);
}


// Inicializa o FullCalendar
$(document).ready(function() {
$('#calendar').fullCalendar({
header: {
left: 'prev,next today',
center: 'title',
right: 'month,agendaWeek,agendaDay'
},
locale: 'pt-br', // Define o idioma para português
events: function(start, end, timezone, callback) {
JX.consultar(`SELECT
cal.codigo AS codcal,
cal.cod_desenv_proj,
nov.codigo AS codigo,
nov.descricao AS descricao,
cal.dtainicio,
cal.dtafim,
cal.obs,
CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END concluido
FROM AD_CALENDINOV cal
INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico`).then(function(data) {
var events = [];
data.forEach(function(item) {
var eventDateIni = moment(item.dtainicio, "DD/MM/YYYY").format("YYYY-MM-DD");
var eventDateFim = moment(item.dtafim, "DD/MM/YYYY").format("YYYY-MM-DD");

events.push({
title: item.descricao,        // Nome do projeto
start: eventDateIni,           // Data do evento
end: eventDateFim,
description: item.obs,  // descricao
//allDay: true,               // Evento de dia inteiro
id: item.codcal,            // Certifique-se de que está utilizando CODIGO como identificador
color: randomColor()        // Define uma cor aleatória para o evento
});
});
callback(events); // Passa os eventos para o calendário
}).catch(function (error) {
showMessage('Erro ao carregar os eventos: ' + error, 'alert-danger');
});
}


});
});

// Função para formatar a data no formato dd/mm/yyyy
function formatDateToDDMMYYYY(date) {
var day = ("0" + date.date()).slice(-2);
var month = ("0" + (date.month() + 1)).slice(-2);
var year = date.year();
return day + '/' + month + '/' + year;
}

</script>

<!-- Bootstrap JS -->
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

</body>
</html>