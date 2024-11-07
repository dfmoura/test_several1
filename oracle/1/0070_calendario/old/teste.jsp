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
        /* (Estilos omitidos para brevidade) */
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
                <!-- Dados da tabela omitidos para brevidade -->
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
                events: function(fetchInfo, successCallback, failureCallback) {
                    JX.consultar(`SELECT cal.codigo codcal, nov.codigo, nov.descricao, cal.dtainicio, cal.dtafim 
                                    FROM AD_CALENDINOV cal 
                                    INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico 
                                    WHERE cal.dtainicio >= '${fetchInfo.startStr}' AND cal.dtafim <= '${fetchInfo.endStr}'`).then(function(data) {
                        const events = data.map(item => {
                            return {
                                title: `${item.codcal} ${item.descricao}`, // Concatenando CODIGO e DESCRICAO
                                start: moment(item.dtainicio, "DD/MM/YYYY").format("YYYY-MM-DD"),
                                end: moment(item.dtafim, "DD/MM/YYYY").format("YYYY-MM-DD"), // Se necessário, use 'end' para eventos com hora de término
                                allDay: true,
                                id: item.codcal, // Usando CODIGO como identificador
                                color: randomColor() // Adicione sua função randomColor() se necessário
                            };
                        });
                        successCallback(events); // Passa os eventos para o calendário
                    }).catch(function(error) {
                        failureCallback();
                        console.error('Erro ao carregar os eventos:', error);
                    });
                },

                // Adaptação para diferentes tamanhos de tela
                windowResize: function(view) {
                    if (window.innerWidth < 768) {
                        calendar.changeView('timeGridDay'); // Modo diário para telas pequenas
                    } else if (window.innerWidth < 992) {
                        calendar.changeView('timeGridWeek'); // Modo semanal para telas médias
                    } else {
                        calendar.changeView('dayGridMonth'); // Modo mensal para telas maiores
                    }
                },

                eventClick: function(info) {
                    console.log("Evento clicado:", info.event.title);
                }
            });

            calendar.render();

            // Navegação para a tabela de apontamentos
            document.getElementById('linkApontamentos').addEventListener('click', function() {
                document.getElementById('calendar').style.display = 'none'; // Esconde o calendário
                document.getElementById('apontamentos').style.display = 'block'; // Exibe a tabela
            });

            // Navegação para o calendário
            document.getElementById('linkCalendario').addEventListener('click', function() {
                document.getElementById('apontamentos').style.display = 'none'; // Esconde a tabela
                document.getElementById('calendar').style.display = 'block'; // Exibe o calendário
            });
        });

        function randomColor() {
            // Função para gerar cores aleatórias
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
    </script>
</body>
</html>
