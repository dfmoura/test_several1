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
            html, body {
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica Neue, Helvetica, sans-serif;
                font-size: 14px;
            }
    
            #calendar {
                max-width: 1100px;
                margin: 40px auto;
            }
        </style>
        <snk:load/>
    </head>
    <body>
        <div id="calendar"></div>
    
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                var calendarEl = document.getElementById('calendar');
    
                // Get today's date in YYYY-MM-DD format
                var today = new Date().toISOString().split('T')[0];
    
                // Inicialização do calendário FullCalendar
                var calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    initialDate: today, // Use the dynamically set today date
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    locale: 'pt-br',  // Definindo o idioma para português brasileiro
                    events: []  // Inicializa a lista de eventos vazia
                });
    
                // Consulta SQL para pegar os dados de eventos
                JX.consultar(`
                    SELECT 
                        cal.codigo AS codcal,
                        cal.cod_desenv_proj,
                        nov.codigo AS codigo,
                        nov.descricao AS descricao,
                        to_char(cal.dtainicio,'YYYY-MM-DD') AS dtainicio,
                        to_char(cal.dtafim,'YYYY-MM-DD') AS dtafim,
                        cal.obs,
                        CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
                    FROM AD_CALENDINOV cal
                    INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
                `).then(function(response) {
                    // Processando a resposta da consulta para criar eventos no calendário
                    var events = response.map(function(evento) {
                        return {
                            title: evento.descricao,   // A descrição será o título do evento
                            start: evento.dtainicio,   // Data de início
                            end: evento.dtafim,        // Data de fim
                            description: evento.obs,   // Observação adicional (opcional)
                            allDay: true               // Definido como evento o dia todo
                        };
                    });
    
                    // Adiciona os eventos no calendário
                    calendar.addEventSource(events);
                    calendar.render(); // Renderiza o calendário
                }).catch(function(error) {
                    console.error("Erro ao carregar os eventos:", error);
                });
            });
        </script>
    </body>
    </html>
    