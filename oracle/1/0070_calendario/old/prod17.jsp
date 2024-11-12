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
    <script src="jx.js"></script> <!-- Homologação e Debug -->
    <script src="jx.min.js"></script> <!-- Produção -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
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

            // Realizar a consulta ao banco de dados usando JX
            JX.consultar(`
                SELECT
                    cal.codigo AS codcal,
                    cal.cod_desenv_proj,
                    nov.codigo AS codigo,
                    nov.descricao AS descricao,
                    to_char(cal.dtainicio, 'YYYY-MM-DD') AS dtainicio,
                    to_char(cal.dtafim, 'YYYY-MM-DD') AS dtafim,
                    cal.obs,
                    CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
                FROM AD_CALENDINOV cal
                INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
            `).then(function(result) {
                // A consulta retornou os resultados; vamos formatá-los para o formato de evento do FullCalendar
                const events = result.map(item => ({
                    title: item.descricao,  // Usando a descrição como título do evento
                    start: item.dtainicio,  // Data de início do evento
                    end: item.dtafim,       // Data de fim do evento
                    description: item.obs,  // Descrição do evento
                    status: item.concluido  // Status de conclusão do evento
                }));

                // Adicionar os eventos ao calendário
                calendar.addEventSource(events);
                calendar.render();
            }).catch(function(error) {
                console.error("Erro ao consultar o banco de dados:", error);
            });
        });
    </script>
</body>
</html>
