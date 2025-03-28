<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
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
            gap: 20px; /* Ajuste o valor do gap conforme necessário */
        }

        .left-container {
            width: 20%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .right-container {
            width: 80%;
        }

        #calendar {
            width: 100%;
            height: calc(100vh - 100px);
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        /* Adicionando o estilo para o botão Eventos */
        .btn-evento {
            background-color: #76828E;
            border-color: #76828E;
            color: white; /* Mantém o texto em branco */
        }
    </style>
</head>

<body>


    <div class="container mt-5 main-container">
        <div class="left-container">
            <button class="btn btn-evento mb-3" onclick="abrir_evento()">Eventos</button>

            <!-- MultiSelect para Usuários -->
            <select id="usuarioSelect" class="form-control" multiple onchange="updateCalendarFilter()">
                <!-- Opções de usuário serão carregadas via JavaScript -->
            </select>
        </div>

        <div class="right-container">
            <div id="calendar"></div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js"></script>
    <script>
        let selectedUserIds = [];
        let calendar;

        document.addEventListener('DOMContentLoaded', function () {
            const calendarEl = document.getElementById('calendar');
            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                events: function (fetchInfo, successCallback, failureCallback) {
                    JX.consultar(`SELECT 
                            cal.codigo AS codcal,
                            cal.cod_desenv_proj,
                            nov.codigo AS codigo,
                            nov.descricao AS descricao,
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
                            cal.usuario
                        FROM AD_CALENDINOV cal
                        INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
                    `).then(function (data) {
                        // Filtra eventos com base nos IDs selecionados no MultiSelect
                        const filteredEvents = data.filter(item => 
                            selectedUserIds.length === 0 || selectedUserIds.includes(item.USUARIO)
                        ).map(item => ({
                            title: item.DESCRICAO,
                            start: item.DTAINICIO,
                            end: item.DTAFIM,
                            extendedProps: {
                                codCal: item.CODCAL,
                                codProj: item.COD_DESENV_PROJ,
                                codigo: item.CODIGO,
                                obs: item.OBS,
                                concluido: item.CONCLUIDO,
                                usuario: item.USUARIO
                            }
                        }));
                        successCallback(filteredEvents);
                    }).catch(function (error) {
                        console.error('Erro ao carregar os dados:', error);
                        failureCallback(error);
                    });
                }
            });

            calendar.render();
            loadUsuariosDropdown();
        });

        // Função para carregar os usuários no multiSelect
        async function loadUsuariosDropdown() {
            const usuarios = await JX.consultar(`SELECT 
                USU.CODUSU AS VALUE,
                USU.CODUSU || '-' || USU.NOMEUSU AS LABEL
            FROM TSIUSU USU
            WHERE USU.AD_GESTORUSU = STP_GET_CODUSULOGADO
            OR USU.CODUSU = STP_GET_CODUSULOGADO`);

            const usuarioSelect = document.getElementById("usuarioSelect");
            usuarios.forEach(usuario => {
                const option = document.createElement("option");
                option.value = usuario.VALUE;
                option.text = usuario.LABEL;
                usuarioSelect.appendChild(option);
            });
        }

        // Função para atualizar o filtro do calendário com base no MultiSelect
        function updateCalendarFilter() {
            const selectedOptions = Array.from(document.getElementById("usuarioSelect").selectedOptions);
            selectedUserIds = selectedOptions.map(option => option.value);

            // Recarrega os eventos no calendário para aplicar o filtro
            calendar.refetchEvents();
        }

        // Função para abrir o próximo nível
        function abrir_evento() {
            var params = '';
            var level = 'lvl_cfk8k0';
            openLevel(level, params);
        }
    </script>

    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
