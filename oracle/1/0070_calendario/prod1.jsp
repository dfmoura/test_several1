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

    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

    <style>
        body {
            display: flex;
            font-family: Arial, sans-serif;
            margin: 0;
            height: 100vh;
        }

        .sidebar {
            width: 250px;
            background-color: #343a40;
            color: #ffffff;
            padding: 20px;
            box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
        }

        .sidebar h2 {
            font-size: 24px;
            margin-bottom: 20px;
        }

        .sidebar a {
            display: block;
            color: #ffffff;
            text-decoration: none;
            padding: 10px;
            border-radius: 4px;
            transition: background-color 0.3s;
        }

        .sidebar a:hover {
            background-color: #495057;
        }

        #calendar {
            flex-grow: 1;
            margin: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        #apontamentos {
            display: none;
            margin: 20px;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            border: 1px solid #dee2e6;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f8f9fa;
        }

        @media (max-width: 768px) {
            #calendar {
                font-size: 12px;
                padding: 10px;
            }
        }
    </style>
    <snk:load/>
</head>
<body>
    <div class="sidebar">
        <h2>Menu</h2>
        <a href="#calendario" id="linkCalendario">Calendário</a>
        <a href="#apontamentos" id="linkApontamentos">Apontamentos</a>
    </div>

    <div id="calendar"></div>

    <div id="apontamentos">
        <h2>Tabela de Apontamentos</h2>
        <table>
            <thead>
                <tr>
                    <th>Cod. Calendário</th>
                    <th>Cod. Proj.</th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Dt. Início</th>
                    <th>Dt. Fim</th>
                    <th>Obs</th>
                    <th>Concluído</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>001</td>
                    <td>1001</td>
                    <td>AB123</td>
                    <td>Reunião de Projeto</td>
                    <td>01/11/2024</td>
                    <td>02/11/2024</td>
                    <td>Reunião com equipe</td>
                    <td><input type="checkbox" checked></td>
                </tr>
                <tr>
                    <td>002</td>
                    <td>1002</td>
                    <td>CD456</td>
                    <td>Planejamento Estratégico</td>
                    <td>03/11/2024</td>
                    <td>05/11/2024</td>
                    <td>Definição de metas</td>
                    <td><input type="checkbox"></td>
                </tr>
                <tr>
                    <td>003</td>
                    <td>1003</td>
                    <td>EF789</td>
                    <td>Acompanhamento de Projetos</td>
                    <td>06/11/2024</td>
                    <td>07/11/2024</td>
                    <td>Acompanhamento semanal</td>
                    <td><input type="checkbox"></td>
                </tr>
            </tbody>
        </table>
    </div>

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
                editable: true,
                selectable: true,
                events: [],

                windowResize: function(view) {
                    if (window.innerWidth < 768) {
                        calendar.changeView('timeGridDay');
                    } else if (window.innerWidth < 992) {
                        calendar.changeView('timeGridWeek');
                    } else {
                        calendar.changeView('dayGridMonth');
                    }
                },

                eventContent: function(info) {
                    return { html: `<div>${info.event.title}</div>` };
                },

                dateClick: function (info) {
                    console.log("Data clicada:", info.dateStr);
                },

                eventClick: function (info) {
                    console.log("Evento clicado:", info.event.title);
                }
            });

            // Função para buscar e exibir eventos
            function loadEvents() {
                JX.consultar(`
                    SELECT cal.codigo codcal, 
                           nov.codigo, 
                           nov.descricao, 
                           cal.dtainicio, 
                           cal.dtafim 
                    FROM AD_CALENDINOV cal 
                    INNER JOIN AD_NOVOSPRODUTOS nov 
                    ON cal.cod_desenv_proj = nov.nrounico
                `).then((response) => {
                    const events = response.map(event => ({
                        title: `${event.codigo} ${event.descricao}`,
                        start: event.dtainicio,
                        end: event.dtafim,
                        allDay: true // Altera para 'true' se for um evento de dia inteiro
                    }));
                    calendar.addEventSource(events); // Adiciona os eventos ao calendário
                }).catch(error => {
                    console.error("Erro ao carregar eventos:", error);
                });
            }

            loadEvents(); // Carrega os eventos quando a página for carregada

            calendar.render();

            document.getElementById('linkApontamentos').addEventListener('click', function() {
                document.getElementById('calendar').style.display = 'none';
                document.getElementById('apontamentos').style.display = 'block';
            });

            document.getElementById('linkCalendario').addEventListener('click', function() {
                document.getElementById('apontamentos').style.display = 'none';
                document.getElementById('calendar').style.display = 'block';
            });
        });
    </script>
</body>
</html>
