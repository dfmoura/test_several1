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
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> <!-- Produção -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="jx.min.js"></script> <!-- Produção -->
    <style>
        body {
            display: flex; /* Usar flexbox para layout */
            font-family: Arial, sans-serif;
            margin: 0;
            height: 100vh; /* Garantir que o corpo ocupe toda a altura da tela */
        }

        /* Estilo da sidebar */
        .sidebar {
            width: 250px; /* Largura da sidebar */
            background-color: #343a40; /* Cor de fundo */
            color: #ffffff; /* Cor do texto */
            padding: 20px; /* Espaçamento interno */
            box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2); /* Sombra para a sidebar */
        }

        .sidebar h2 {
            font-size: 24px; /* Tamanho do título */
            margin-bottom: 20px; /* Margem abaixo do título */
        }

        .sidebar a {
            display: block; /* Cada link ocupa toda a largura */
            color: #ffffff; /* Cor do link */
            text-decoration: none; /* Remove sublinhado */
            padding: 10px; /* Espaçamento interno do link */
            border-radius: 4px; /* Bordas arredondadas */
            transition: background-color 0.3s; /* Transição suave para o hover */
        }

        .sidebar a:hover {
            background-color: #495057; /* Cor de fundo ao passar o mouse */
        }

        /* Estilo do calendário */
        #calendar {
            flex-grow: 1; /* Faz o calendário ocupar o espaço restante */
            margin: 20px; /* Margem em torno do calendário */
            background-color: #fff; /* Cor de fundo do calendário */
            border-radius: 8px; /* Bordas arredondadas */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Sombra para o calendário */
            overflow: hidden; /* Esconde conteúdo que extrapole o contêiner */
        }

        /* Estilo da tabela de apontamentos */
        #apontamentos {
            display: none; /* Esconde a tabela inicialmente */
            margin: 20px; /* Margem em torno da tabela */
            padding: 20px; /* Espaçamento interno */
            background-color: #fff; /* Cor de fundo da tabela */
            border-radius: 8px; /* Bordas arredondadas */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Sombra para a tabela */
            overflow-x: auto; /* Habilita rolagem horizontal se necessário */
        }

        table {
            width: 100%; /* Tabela ocupa toda a largura */
            border-collapse: collapse; /* Remove espaços entre as células */
        }

        th, td {
            border: 1px solid #dee2e6; /* Borda para as células */
            padding: 8px; /* Espaçamento interno das células */
            text-align: left; /* Alinhamento à esquerda */
        }

        th {
            background-color: #f8f9fa; /* Cor de fundo dos cabeçalhos */
        }

        /* Ajusta o tamanho da fonte e layout do calendário para telas menores */
        @media (max-width: 768px) {
            #calendar {
                font-size: 12px; /* Reduz o tamanho da fonte para dispositivos menores */
                padding: 10px;
            }
            .sidebar {
                width: 200px; /* Ajusta a largura da sidebar para telas menores */
            }
        }

        /* Ajusta o tamanho da fonte e layout do calendário para telas muito pequenas */
        @media (max-width: 480px) {
            #calendar {
                font-size: 10px; /* Reduz ainda mais o tamanho da fonte */
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
            <tbody id="tabelaApontamentos">
                <!-- Os dados serão inseridos aqui dinamicamente -->
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

            // Função para carregar os apontamentos da consulta
            function carregarApontamentos() {
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
                    const tbody = document.getElementById('tabelaApontamentos');
                    tbody.innerHTML = ''; // Limpa a tabela antes de adicionar novos dados

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

            // Carrega os apontamentos ao abrir a tabela
            document.getElementById('linkApontamentos').addEventListener('click', function() {
                document.getElementById('calendar').style.display = 'none'; // Esconde o calendário
                document.getElementById('apontamentos').style.display = 'block'; // Exibe a tabela
                carregarApontamentos(); // Carrega os dados
            });

            // Navegação para o calendário
            document.getElementById('linkCalendario').addEventListener('click', function() {
                document.getElementById('apontamentos').style.display = 'none'; // Esconde a tabela
                document.getElementById('calendar').style.display = 'block'; // Exibe o calendário
            });
        });
    </script>
</body>
</html>
