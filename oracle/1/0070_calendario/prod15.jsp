<!DOCTYPE html>
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

        // Função para consultar eventos e inicializar o calendário
        async function carregarEventos() {
            try {
                const data = await JX.consultar(`SELECT cal.codigo AS codcal, cal.cod_desenv_proj, nov.codigo AS codigo, nov.descricao AS descricao, cal.dtainicio, cal.dtafim, cal.obs, CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END concluido FROM AD_CALENDINOV cal INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico`);

                // Formata os dados para o FullCalendar
                const events = data.map(item => ({
                    title: item.descricao,
                    start: moment(item.dtainicio, "DD/MM/YYYY").format("YYYY-MM-DD"),
                    end: moment(item.dtafim, "DD/MM/YYYY").format("YYYY-MM-DD"),
                    description: item.obs,
                    id: item.codcal
                }));

                // Inicializa o calendário
                const calendarEl = document.getElementById('calendar');
                const calendar = new FullCalendar.Calendar(calendarEl, {
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    locale: 'pt-br',
                    events: events,  // Lista de eventos carregada
                    eventClick: function(info) {
                        alert('Evento: ' + info.event.title);
                        // Aqui você pode adicionar lógica adicional para clique no evento
                    }
                });
                
                calendar.render();
            } catch (error) {
                console.error("Erro ao carregar eventos:", error);
                alert("Erro ao carregar eventos. Verifique a console para mais detalhes.");
            }
        }

        // Carrega os eventos quando o documento está pronto
        document.addEventListener('DOMContentLoaded', carregarEventos);
    </script>

    <!-- Bootstrap JS -->
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>