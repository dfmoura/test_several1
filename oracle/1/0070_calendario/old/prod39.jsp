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
                width: 20%;
                display: flex;
                flex-direction: column;
                align-items: left;
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
                    }
                });
                calendar.render();
                loadUsuariosDropdown();
            });
    
            // Função para carregar os eventos aplicando o filtro
            async function loadEvents(fetchInfo, successCallback, failureCallback) {
                try {
                    // Verifica se algum usuário foi selecionado
                    if (selectedUserIds.length === 0) {
                        selectedUserIds = ['0'];  // Retorna todos os eventos se nenhum usuário for selecionado
                    }
    
                    // Transformando os códigos de usuário em números
                    
                    const userIdsAsNumbers = selectedUserIds.map(id => parseInt(id, 10));
    
                    // Consulta SQL com os usuários selecionados
                    const query = `
                        SELECT 
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
                            cal.usuario AS USUARIO
                        FROM AD_CALENDINOV cal
                        INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico
                        WHERE cal.usuario IN ` + userIdsAsNumbers;
    
                    // Realiza a consulta usando os IDs de usuários selecionados
                    const filteredEvents = await JX.consultar(query);
    
                    // Mapeia os eventos retornados para o formato do FullCalendar
                    const finalEvents = filteredEvents.map(item => ({
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
    
                    successCallback(finalEvents);
                } catch (error) {
                    console.error('Erro ao carregar os dados:', error);
                    failureCallback(error);
                }
            }
    
            // Função para carregar os usuários no MultiSelect
            async function loadUsuariosDropdown() {
                try {
                    const usuarios = await JX.consultar(`SELECT 
                        USU.CODUSU AS VALUE,
                        USU.CODUSU || '-' || USU.NOMEUSU AS LABEL
                    FROM TSIUSU USU
                    WHERE USU.AD_GESTORUSU = STP_GET_CODUSULOGADO
                    OR USU.CODUSU = STP_GET_CODUSULOGADO`);
    
                    const usuarioSelect = document.getElementById("usuarioSelect");
                    usuarioSelect.innerHTML = '';  // Limpar antes de carregar
    
                    // Adicionar as opções de usuários no dropdown
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
    
            // Função para atualizar o filtro do calendário com base no MultiSelect
            function updateCalendarFilter() {
                const selectedOptions = Array.from(document.getElementById("usuarioSelect").selectedOptions);
                selectedUserIds = selectedOptions.map(option => option.value);
    
                // Exibe o alerta com os valores selecionados
                //alert("Usuários selecionados: " + selectedUserIds.join(", "));
    
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
    