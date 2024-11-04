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
        /* Seus estilos CSS aqui */
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
                <!-- Suponha que você já tenha linhas de exemplo aqui -->
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
                    // Nova consulta com os campos desejados
                    JX.consultar(`SELECT cal.codigo AS codcal, 
                                          nov.codigo AS codigo, 
                                          nov.descricao AS descricao, 
                                          cal.dtainicio, 
                                          cal.dtafim 
                                   FROM AD_CALENDINOV cal 
                                   INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico 
                                   WHERE cal.dtainicio >= '${fetchInfo.startStr}' 
                                   AND cal.dtafim <= '${fetchInfo.endStr}'`).then(function(data) {
                        const events = data.map(item => {
                            const eventStart = moment(item.dtainicio, "DD/MM/YYYY").format("YYYY-MM-DD");
                            const eventEnd = moment(item.dtafim, "DD/MM/YYYY").format("YYYY-MM-DD");

                            return {
                                title: `${item.codigo} ${item.descricao}`, // Concatenando CODIGO e DESCRICAO
                                start: eventStart,
                                end: eventEnd,
                                allDay: true,
                                id: item.codcal,
                                color: randomColor() // Define uma cor aleatória para o evento
                            };
                        });
                        successCallback(events); // Passa os eventos para o calendário
                    }).catch(function(error) {
                        console.error('Erro ao carregar os eventos:', error);
                        failureCallback(error); // Lida com erro ao carregar eventos
                    });
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
                document.getElementById('calendar').style.display = 'none'; // Esconde o calendário
                document.getElementById('apontamentos').style.display = 'block'; // Exibe a tabela
            });

            // Navegação para o calendário
            document.getElementById('linkCalendario').addEventListener('click', function() {
                document.getElementById('apontamentos').style.display = 'none'; // Esconde a tabela
                document.getElementById('calendar').style.display = 'block'; // Exibe o calendário
            });
        });

        // Função para gerar cor aleatória (para os eventos)
        function randomColor() {
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
