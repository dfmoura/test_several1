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
        /* Botão overlay */
        .overlay-btn {
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: #76828E;
            color: #fff;
            padding: 15px;
            border: none;
            border-radius: 40%;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
            transition: background-color 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .overlay-btn:hover {
            background-color: #82a0be;
        }

        .overlay-btn img {
            width: 30px;
            height: 30px;
            margin-right: 8px;
            align-items: center;
        }

        /* Estilo da página */
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }

        /* Estilo do container principal */
        .main-container {
            display: flex;
            margin: 20px;
            justify-content: space-between;
        }

        /* Estilo do container da esquerda (Botão e MultiSelect) */
        .left-container {
            width: 20%; /* 20% do espaço */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
        }

        /* Estilo do container da direita (Calendário) */
        .right-container {
            width: 80%; /* 80% do espaço */
        }

        /* Estilo do calendário */
        #calendar {
            width: 100%;
            height: calc(100vh - 100px);
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
    </style>
</head>

<body>

    <!-- Botão Overlay para adicionar novo registro -->
    <button class="overlay-btn" data-toggle="modal" data-target="#addRecordModal" title="Inserir Evento" onclick="abrir_evento()">
        <img src="https://raw.githubusercontent.com/dfmoura/test_several1/main/oracle/1/0070_calendario/add-circle-svgrepo-com.svg" alt="Add Icon">
    </button>

    <!-- Container Principal com o Calendário e o Botão -->
    <div class="container mt-5 main-container">
        <!-- Container Esquerdo para o botão e multiSelect -->
        <div class="left-container">
            <!-- Botão que leva ao próximo nível -->
            <button class="btn btn-primary mb-3" onclick="abrir_evento()">Próximo Nível</button>

            <!-- MultiSelect para Usuários -->
            <select id="usuarioSelect" class="form-control" multiple onchange="filterCalendar()">
                <!-- As opções serão preenchidas via JavaScript -->
            </select>
        </div>

        <!-- Container Direito para o Calendário -->
        <div class="right-container">
            <div id="calendar"></div> <!-- Calendário será exibido aqui -->
        </div>
    </div>

    <!-- FullCalendar JS -->
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js"></script>
    <script>
        let selectedUsers = [];

        document.addEventListener('DOMContentLoaded', function () {
            const calendarEl = document.getElementById('calendar');
            const calendar = new FullCalendar.Calendar(calendarEl, {
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
                        const events = data.map(item => ({
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
                        successCallback(events);
                    }).catch(function (error) {
                        console.error('Erro ao carregar os dados:', error);
                        failureCallback(error);
                    });
                }
            });

            calendar.render();
            loadProjetosDropdown();
            loadUsuariosDropdown();
        });

        // Função para carregar os projetos no dropdown
        async function loadProjetosDropdown() {
            const projetos = await JX.consultar(`SELECT NROUNICO, DESCRICAO FROM AD_NOVOSPRODUTOS`);
            const dropdown = document.getElementById("COD_DESENV_PROJ");
            projetos.forEach(proj => {
                const option = document.createElement("option");
                option.value = proj.NROUNICO;
                option.text = proj.DESCRICAO;
                dropdown.appendChild(option);
            });
        }

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

        // Função para filtrar o calendário com base nos usuários selecionados
        function filterCalendar() {
            const selectedOptions = Array.from(document.getElementById("usuarioSelect").selectedOptions);
            selectedUsers = selectedOptions.map(option => option.value);

            // Refazer a consulta de eventos e filtrar com base nos usuários selecionados
            const calendar = FullCalendar.Calendar.getInstance(document.getElementById("calendar"));
            calendar.refetchEvents();
        }

        // Função para abrir o evento
        function abrir_evento() {
            var params = '';
            var level = 'lvl_cfk8k0';
            openLevel(level, params);
        }
    </script>

    <!-- Bootstrap Modal e jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
