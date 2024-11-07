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
  <title>Tabela de Dados</title>
  <script src="jx.js"></script> <!-- Homologação e Debug -->
  <script src="jx.min.js"></script> <!-- Produção -->
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css" rel="stylesheet" />
  
  <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }

        #calendar {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
        }

  </style>
  <snk:load/>
</head>
<body>
    <!-- Container do calendário -->
    <div id="calendar"></div>

    <!-- Incluindo os scripts do FullCalendar -->
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js"></script>

    <!-- Script para carregar os dados e inicializar o calendário -->
    <!-- <script src="app.js"></script> -->
</body>


<script>
// Função para formatar a data no formato necessário para o FullCalendar
function formatDate(date) {
    return moment(date).format('YYYY-MM-DD');
}

// Função para consultar os dados do banco e popular o calendário
function loadCalendarData() {
    const query = `
        SELECT 
            cal.dtainicio,
            cal.dtafim,
            cal.cod_desenv_proj || '|' || nov.codigo || '|' || nov.descricao AS descricao,
            CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
        FROM AD_CALENDINOV cal
        INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
    `;

    // Usando a função consultar da biblioteca SankhyaJX
    JX.consultar(query).then(function(results) {
        // Processar os resultados e criar os eventos
        const events = results.map(function(row) {
            return {
                title: row.descricao, // Título do evento
                start: formatDate(row.dtainicio), // Data de início
                end: formatDate(row.dtafim), // Data de fim
                description: row.descricao, // Descrição
                concluded: row.concluido // Status de conclusão
            };
        });

        // Inicializar o calendário com os eventos
        initializeCalendar(events);
    }).catch(function(error) {
        console.error("Erro ao consultar os dados:", error);
    });
}

// Função para inicializar o calendário FullCalendar
function initializeCalendar(events) {
    const calendarEl = document.getElementById('calendar');

    // Inicializando o FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', // Visão inicial do calendário
        locale: 'pt-br', // Localização em português
        events: events, // Passando os eventos para o calendário
        eventClick: function(info) {
            // Exibir detalhes ao clicar no evento
            alert("Evento: " + info.event.title + "\nDescrição: " + info.event.extendedProps.description);
        }
    });

    // Renderizando o calendário
    calendar.render();
}

// Carregar os dados do calendário
loadCalendarData();
</script>


</html>
