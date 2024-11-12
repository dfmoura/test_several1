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
        <title>Calendário Responsivo</title>
    
        <!-- Importando CSS do FullCalendar -->
        <link href="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/5.11.0/main.min.css" rel="stylesheet">
        <!-- Importando Moment.js para manipulação de datas -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
        <!-- Importando biblioteca FullCalendar -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/5.11.0/main.min.js"></script>
        <!-- Importando biblioteca SankhyaJX -->
        <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
        <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    


        <style>
            /* Estilos básicos para centralizar e ajustar o calendário */
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
            }
            #calendar {
                width: 90%;
                max-width: 1000px;
                margin: 20px auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
        </style>
        <snk:load/>
    </head>
    <body>
        <!-- Elemento HTML para o calendário -->
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
                    editable: true,
                    selectable: true,
    
                    // Função para carregar eventos dinamicamente usando JX.consultar
                    events: function(fetchInfo, successCallback, failureCallback) {
                        // Imprimindo os intervalos de data solicitados para verificação
                        console.log("Intervalo de Datas:", fetchInfo.startStr, fetchInfo.endStr);
    
                        JX.consultar(`
                            SELECT cal.codigo AS codcal, cal.cod_desenv_proj, nov.codigo AS codigo, nov.descricao AS descricao, 
                                   cal.dtainicio, cal.dtafim, cal.obs, 
                                   CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
                            FROM AD_CALENDINOV cal
                            INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
                            WHERE cal.dtainicio >= TO_DATE('${fetchInfo.startStr}', 'YYYY-MM-DD') 
                            AND cal.dtafim <= TO_DATE('${fetchInfo.endStr}', 'YYYY-MM-DD')
                        `).then(function(data) {
                            // Verificando o retorno dos dados
                            console.log("Dados retornados da consulta:", data);
    
                            if (data.length === 0) {
                                console.warn("Nenhum evento retornado para o período selecionado.");
                            }
    
                            const events = data.map(item => {
                                return {
                                    title: item.descricao, // Campo descricao será mostrado como título do evento
                                    start: moment(item.dtainicio).format("YYYY-MM-DD"),
                                    end: moment(item.dtafim).format("YYYY-MM-DD"),
                                    allDay: true,
                                    id: item.codcal,
                                    color: item.concluido === 'Sim' ? 'green' : 'red' // Exemplo: Verde para concluído, vermelho para não concluído
                                };
                            });
                            successCallback(events);
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
                        alert("Evento clicado: " + info.event.title);
                    }
                });
    
                // Renderiza o calendário
                calendar.render();
            });
        </script>
    </body>
    </html>
    