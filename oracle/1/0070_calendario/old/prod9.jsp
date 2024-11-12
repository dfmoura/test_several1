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
  <title>Calendário Dinâmico</title>
  
  <!-- Importar CSS do FullCalendar -->
  <link href="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css" rel="stylesheet">
  
  <!-- Custom CSS para responsividade -->
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    #calendar-container {
      max-width: 90%;
      margin: 40px auto;
    }
    #calendar {
      max-width: 100%;
    }
  </style>
  <snk:load/>
</head>
<body>

  <div id="calendar-container">
    <div id="calendar"></div>
  </div>

  <!-- Importar JS do FullCalendar -->
  <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js"></script>

  <!-- Importar SankhyaJX -->
  <script src="https://dfmoura.github.io/SankhyaJX/SankhyaJX.min.js"></script>

  <!-- Script JavaScript para inicializar o calendário e carregar os dados -->
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      const calendarEl = document.getElementById('calendar');

      // Inicializar FullCalendar
      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: async function (fetchInfo, successCallback, failureCallback) {
          // Função para buscar os dados da consulta SQL
          try {
            const query = `
              SELECT 
                cal.dtainicio, 
                cal.dtafim, 
                cal.cod_desenv_proj || '|' || nov.codigo || '|' || nov.descricao AS descricao,
                CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
              FROM AD_CALENDINOV cal
              INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
            `;
            const resultados = await JX.consultar(query);

            // Mapear os dados para o formato necessário pelo FullCalendar
            const events = resultados.map(item => ({
              title: item.descricao,
              start: item.dtainicio,
              end: item.dtafim,
              color: item.concluido === 'Sim' ? '#28a745' : '#dc3545' // Verde para concluído, vermelho para não concluído
            }));

            successCallback(events);
          } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            failureCallback(error);
          }
        }
      });

      // Renderizar o calendário
      calendar.render();
    });
  </script>
</body>
</html>
