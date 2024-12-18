<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="br.com.sankhya.modelcore.auth.AuthenticationInfo" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard</title>
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
        <link href="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
        <snk:load />
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .main-container {
                display: flex;
                margin: 20px;
                justify-content: space-between;
                gap: 20px;
            }
            .left-container {
                width: 15%;
                display: flex;
                flex-direction: column;
                align-items: left;
            }
            .right-container {
                width: 85%;
            }
            #calendar {
                width: 100%;
                height: calc(100vh - 100px);
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                overflow: hidden; /* Remover o scroll */
            }
            .btn-evento {
                background-color: #76828E;
                border-color: #76828E;
                color: white;
            }

        </style>
    </head>

    <body>
        <div class="container mt-5 main-container">
            <div class="left-container">
                <button class="btn btn-evento mb-3" onclick="abrir_evento()">Eventos</button>

                <label for="usuarioSelect" class="form-label" style="font-weight: bold; text-align: left;">Usuários</label>

                <select id="usuarioSelect" class="form-control" multiple onchange="updateCalendarFilter()">
                    <!-- Opções de usuário serão carregadas via JavaScript -->
                </select>
            </div>
            <div class="right-container">
                <div id="calendar"></div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
        
        <script>
            let selectedUserIds = [];
            let calendar;


            document.addEventListener('DOMContentLoaded', function () {
                const calendarEl = document.getElementById('calendar');
                calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridWeek',
                    locale: 'pt-br',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,dayGridWeek,dayGridDay'
                    },
                    events: function (fetchInfo, successCallback, failureCallback) {
                        loadEvents(fetchInfo, successCallback, failureCallback);
                    },
                    eventDidMount: function(info) {
                        const event = info.event;

                        // Obter as cores do evento
                        const corfundo = event.extendedProps.corfundo;
                        const corfonte = event.extendedProps.corfonte;

                        // Definir o fundo e a cor do texto do evento
                        if (corfundo) {
                            info.el.style.backgroundColor = corfundo; // Cor de fundo
                        }
                        if (corfonte) {
                            info.el.style.color = corfonte; // Cor da fonte
                        };
                    },
                    eventClick: function(info) {
                        const codigo = info.event.extendedProps.codCal; // Obtém o código do evento
                        alert("Valor do código: " + codigo);
                        abrir(codigo);
                    }
                });
                calendar.render();
                loadUsuariosDropdown();
            });
            

            async function loadEvents(fetchInfo, successCallback, failureCallback) {
                try {
                    if (selectedUserIds.length === 0) {
                        selectedUserIds = ['0'];
                    }

                    const userIdsAsNumbers = selectedUserIds.map(id => parseInt(id, 10));

                    const query = `
                        SELECT 
                            cal.codigo AS codcal,
                            cal.tarefa,

                            CASE WHEN cal.HRINI IS NULL THEN
                            to_char(cal.dtainicio,'YYYY-MM-DD') ELSE
                            to_char(cal.dtainicio,'YYYY-MM-DD')||'T' || TO_CHAR(LPAD(SUBSTR(TO_CHAR(cal.HRINI), 1, LENGTH(TO_CHAR(cal.HRINI)) - 2), 2, '0')) || ':' || 
                            SUBSTR(TO_CHAR(cal.HRINI), -2) || ':00' END AS DTAINICIO,
                            CASE WHEN cal.HRFIM IS NULL THEN
                            to_char(cal.dtafim,'YYYY-MM-DD') ELSE
                            to_char(cal.dtafim,'YYYY-MM-DD')||'T' || TO_CHAR(LPAD(SUBSTR(TO_CHAR(cal.HRFIM), 1, LENGTH(TO_CHAR(cal.HRFIM)) - 2), 2, '0')) || ':' || 
                            SUBSTR(TO_CHAR(cal.HRFIM), -2) || ':00' END AS DTAFIM,
                            cal.obs,
                            CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido,
                            cal.usuario AS USUARIO,
                            cal.corfundo,
                            cal.corfonte
                        FROM AD_CALENDINOV cal
                        
                        WHERE cal.usuario IN ` + userIdsAsNumbers;

                    const filteredEvents = await JX.consultar(query);

                    const finalEvents = filteredEvents.map(item => ({
                        title: ' >> '+item.TAREFA, // Adiciona
                        start: item.DTAINICIO,
                        end: item.DTAFIM,
                        extendedProps: {
                            codCal: item.CODCAL,
                            codProj: item.TAREFA,
                            codigo: item.CODIGO,
                            obs: item.OBS,
                            concluido: item.CONCLUIDO,
                            usuario: item.USUARIO,
                            corfundo: item.CORFUNDO,  // Cor de fundo
                            corfonte: item.CORFONTE   // Cor da fonte
                        }
                    }));

                    successCallback(finalEvents);
                } catch (error) {
                    console.error('Erro ao carregar os dados:', error);
                    failureCallback(error);
                }
            }

            async function loadUsuariosDropdown() {
                try {
                    const usuarios = await JX.consultar(`
                    
                        SELECT VALUE,LABEL FROM (
                        SELECT 
                        STP_GET_CODUSULOGADO AS VALUE,
                        STP_GET_CODUSULOGADO ||'-'||USU.NOMEUSU AS LABEL
                        FROM DUAL
                        INNER JOIN TSIUSU USU ON STP_GET_CODUSULOGADO = USU.CODUSU
                        UNION ALL
                        SELECT
                        ATV.CODVISUALIZAR AS VALUE,
                        ATV.CODVISUALIZAR ||'-'||USU.NOMEUSU AS LABEL
                        FROM AD_ATVOUTROS ATV
                        INNER JOIN TSIUSU USU ON ATV.CODVISUALIZAR = USU.CODUSU
                        WHERE ATV.CODUSU = STP_GET_CODUSULOGADO
                        )
                    
                    
                    `
                    
                    );

                    const usuarioSelect = document.getElementById("usuarioSelect");
                    usuarioSelect.innerHTML = '';

                    usuarios.forEach(usuario => {
                        const option = document.createElement("option");
                        option.value = usuario.VALUE;
                        option.text = usuario.LABEL;
                        usuarioSelect.appendChild(option);
                    });

                } catch (error) {
                    console.error('Erro ao carregar usuários:', error);
                }
            }

            function updateCalendarFilter() {
                const selectedOptions = Array.from(document.getElementById("usuarioSelect").selectedOptions);
                selectedUserIds = selectedOptions.map(option => option.value);
                calendar.refetchEvents();
            }

            function abrir_evento() {
                var params = '';
                var level = 'lvl_cfk8k0';
                openLevel(level, params);
            }

            function abrir(codCal) {
                const params = { 'A_CODCAL': parseInt(codCal) };
                localStorage.setItem('A_CODCAL', params.A_CODCAL);
                const level = 'lvl_u0b9t2';
                //alert(codCal);
                openLevel(level, params);
            }

        </script>
    </body>
</html>