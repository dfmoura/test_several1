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

        /* Estilo da página e calendário */
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        
        #calendar {
            width: 100%;
            height: calc(100vh - 100px);
            max-width: 1200px;
            margin: 20px auto;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
    </style>
</head>

<body>

    <!-- Botão Overlay para adicionar novo registro -->
    <button class="overlay-btn" data-toggle="modal" data-target="#addRecordModal" title="Inserir Evento" onclick="abrir_evento()">
        <img src="https://raw.githubusercontent.com/dfmoura/test_several1/main/oracle/1/0070_calendario/add-circle-svgrepo-com.svg" alt="Add Icon">
    </button>

    <div class="container mt-5">
        <div id="calendar"></div> <!-- Calendário será exibido aqui -->
    </div>

    <!-- FullCalendar JS -->
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js"></script>
    <script>
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
                            CASE WHEN cal.concluido = 'S' THEN 'Sim' ELSE 'Nao' END AS concluido
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
                                concluido: item.CONCLUIDO
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

        // Função para abrir o evento
        function abrir_evento(){
            var params = '';
            var level = 'lvl_cfk8k0';
            openLevel(level, params);
        }

        // Função para salvar o novo registro na tabela AD_CALENDINOV
        function saveRecord() {
            // Coletando dados do formulário
            const dados = {
                COD_DESENV_PROJ: document.getElementById("COD_DESENV_PROJ").value,  // Número do projeto (Number)
                OBS: document.getElementById("OBS").value,                           // Observação (CLOB)
                CONCLUIDO: document.getElementById("CONCLUIDO").value,               // Status (VARCHAR2)
                DTAINICIO: document.getElementById("DTAINICIO").value,               // Data de início (DATE)
                DTAFIM: document.getElementById("DTAFIM").value,                     // Data de fim (DATE)
                HRINI: document.getElementById("HRINI").value ?                      // Hora de início (Number)
                        parseInt(document.getElementById("HRINI").value.replace(':', '')) : null,
                HRFIM: document.getElementById("HRFIM").value ?                      // Hora de fim (Number)
                        parseInt(document.getElementById("HRFIM").value.replace(':', '')) : null
                //USUARIO: getCurrentUserId()                                          // Código do usuário (Number)
            };

            // Inserindo o registro na tabela sem especificar chave primária
            JX.salvar(dados, 'AD_CALENDINOV', null)
                .then(response => {
                    console.log('Registro salvo com sucesso:', response);
                    $('#addRecordModal').modal('hide');
                    // Atualizar o calendário ou recarregar os eventos para exibir o novo registro
                })
                .catch(error => {
                    console.error('Erro ao salvar o registro:', error);
                });
        }

        // Função auxiliar para obter o ID do usuário atual (deve ser implementada conforme o contexto da aplicação)
        function getCurrentUserId() {
            // Retorna o ID do usuário logado (exemplo)
            return 12345; // Exemplo de ID de usuário
        }
    </script>

    <!-- Bootstrap Modal e jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
