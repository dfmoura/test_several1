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
            overflow: hidden;
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
            .sidebar {
                width: 200px;
            }
        }
        @media (max-width: 480px) {
            #calendar {
                font-size: 10px;
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
            <tbody id="tabelaApontamentos"></tbody>
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

            calendar.render();

            // Navegação para a tabela de apontamentos
            document.getElementById('linkApontamentos').addEventListener('click', function() {
                document.getElementById('calendar').style.display = 'none';
                document.getElementById('apontamentos').style.display = 'block';
                carregarApontamentos();
            });

            // Navegação para o calendário
            document.getElementById('linkCalendario').addEventListener('click', function() {
                document.getElementById('apontamentos').style.display = 'none';
                document.getElementById('calendar').style.display = 'block';
            });
        });

        function carregarApontamentos() {
            console.log("Função carregarApontamentos chamada");

            const query = `
                SELECT
                    cal.codigo AS codcal,
                    cal.cod_desenv_proj,
                    nov.codigo,
                    nov.descricao,
                    cal.dtainicio,
                    cal.dtafim,
                    cal.obs,
                    cal.concluido
                FROM AD_CALENDINOV cal
                INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
            `;

            JX.consultar(query).then((resultados) => {
                console.log("Resultados da consulta:", resultados);

                const tbody = document.getElementById('tabelaApontamentos');
                tbody.innerHTML = '';

                resultados.forEach((item) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.codcal}</td>
                        <td>${item.cod_desenv_proj}</td>
                        <td>${item.codigo}</td>
                        <td>${item.descricao}</td>
                        <td>${item.dtainicio}</td>
                        <td>${item.dtafim}</td>
                        <td>${item.obs}</td>
                        <td><input type="checkbox" ${item.concluido ? 'checked' : ''}></td>
                    `;
                    tbody.appendChild(tr);
                });
            }).catch((error) => {
                console.error("Erro ao consultar os apontamentos:", error);
            });
        }
    </script>
</body>
</html>
