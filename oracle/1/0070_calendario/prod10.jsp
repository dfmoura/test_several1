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
  <title>Calendário de Projetos</title>
  
  <!-- FullCalendar CSS -->
  <link href="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.0/main.min.css" rel="stylesheet">
  
  <!-- Responsividade CSS -->
  <style>
    body, html {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f2f5;
    }
    #calendar-container {
      width: 100%;
      max-width: 1200px;
      margin: auto;
      padding: 10px;
    }
    #calendar {
      max-width: 100%;
      margin: 0 auto;
    }
  </style>
  <snk:load/>
</head>
<body>

<div id="calendar-container">
  <div id="calendar"></div>
</div>

<!-- FullCalendar JS -->
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.0/main.min.js"></script>

<!-- SankhyaJX biblioteca -->
<script src="https://cdn.jsdelivr.net/npm/@dfmoura/SankhyaJX/dist/sankhyajx.min.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Função para carregar os dados do calendário
    function carregarEventos() {
      // Consulta SQL para buscar os dados necessários
      const query = `
        SELECT
          cal.dtainicio,
          cal.dtafim,
          cal.cod_desenv_proj || '-' || nov.codigo || '-' || nov.descricao AS descricao,
          CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
        FROM AD_CALENDINOV cal
        INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
      `;

      // Consulta ao banco utilizando SankhyaJX
      JX.consultar(query).then(resultados => {
        // Formatar os resultados para o FullCalendar
        const eventos = resultados.map(item => ({
          title: item.descricao,
          start: item.dtainicio,
          end: item.dtafim,
          backgroundColor: item.concluido === 'Sim' ? 'green' : 'red',
          borderColor: item.concluido === 'Sim' ? 'darkgreen' : 'darkred'
        }));
        
        // Renderizar o calendário
        const calendario = new FullCalendar.Calendar(document.getElementById('calendar'), {
          initialView: 'dayGridMonth',
          locale: 'pt-br',
          events: eventos,
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          },
          eventColor: '#378006', // cor padrão dos eventos
          editable: false, // eventos não podem ser movidos
          droppable: false // eventos não podem ser arrastados
        });
        
        // Montar o calendário na tela
        calendario.render();
      }).catch(error => {
        console.error('Erro ao carregar eventos:', error);
      });
    }

    // Chamar função para carregar e exibir eventos
    carregarEventos();
  });
</script>

</body>
</html>
