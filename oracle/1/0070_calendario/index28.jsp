<!DOCTYPE html>
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
    <title>Cadastro de Calendário</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/classic.min.css" />
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <snk:load />
    
    <style>
        .row-spacing {
            margin-bottom: 15px;
        }

        #overlayButton {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007bff;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        }

        #overlayButton:hover {
            background-color: #0056b3;
        }
    </style>
</head>

<body>
    <div class="container mt-5">
        <h1 class="text-center">Cadastro de Calendário</h1>

        <div class="mb-4">
            <form id="formCadastro">
                <div class="row row-spacing">
                    <div class="col-md-8">
                        <div class="form-group">
                            <label for="COD_DESENV_PROJ">Projeto</label>
                            <input id="COD_DESENV_PROJ" class="form-control" readonly>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="CONCLUIDO">Concluído</label>
                            <select id="CONCLUIDO" class="form-control">
                                <option value="S">Sim</option>
                                <option value="N">Não</option>
                            </select>
                        </div>            
                    </div>
                </div>
                <div class="form-group">
                    <label for="OBS">Observações</label>
                    <textarea id="OBS" class="form-control" rows="4" placeholder="Digite as observações"></textarea>
                </div>

                <div class="row row-spacing">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="DTAINICIO">Data Início</label>
                            <input type="date" id="DTAINICIO" class="form-control">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="DTAFIM">Data Fim</label>
                            <input type="date" id="DTAFIM" class="form-control">
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRINI">Hora Início (hhmm)</label>
                            <input type="text" id="HRINI" class="form-control" placeholder="digitar hhmm">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRFIM">Hora Fim (hhmm)</label>
                            <input type="text" id="HRFIM" class="form-control" placeholder="digitar hhmm">
                        </div>
                    </div>
                </div>
                <div class="row row-spacing">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="USUARIO">Usuário</label>
                            <input type="text" id="USUARIO" class="form-control" readonly>
                        </div>
                    </div>
                </div>
                <button type="button" id="btnSalvar" class="btn btn-primary mt-2">Salvar</button>
                <button type="button" id="btnExcluir" class="btn btn-danger mt-2 ml-2">Excluir</button>
                <button type="button" id="btnCancelar" class="btn btn-secondary mt-2 ml-2">Cancelar</button>
            </form>
        </div>

        <button id="overlayButton" onclick="mostrarAlerta()">Mostrar Usuário</button>
    </div>

    <script>
        flatpickr("#DTAINICIO", { dateFormat: "d/m/Y" });
        flatpickr("#DTAFIM", { dateFormat: "d/m/Y" });

        function obterCodCal() {
            const CodCal = localStorage.getItem('A_CODCAL');
            return CodCal ? parseInt(CodCal, 10) : null;
        }

        function carregarDados() {
            const CodCal = obterCodCal();

            if (CodCal) {
                const sql = `
                    SELECT 
                        CAL.CODIGO, 
                        CAL.COD_DESENV_PROJ||' - '||NOV.DESCRICAO COD_DESENV_PROJ, 
                        CAL.OBS, 
                        CAL.CONCLUIDO, 
                        TO_CHAR(CAL.DTAINICIO, 'DD-MM-YYYY') AS DTAINICIO, 
                        TO_CHAR(CAL.DTAFIM, 'DD-MM-YYYY') AS DTAFIM,
                        CASE WHEN CAL.HRINI IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(CAL.HRINI), 1, LENGTH(TO_CHAR(CAL.HRINI)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(CAL.HRINI), -2) END HRINI,
                        CASE WHEN CAL.HRFIM IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(CAL.HRFIM), 1, LENGTH(TO_CHAR(CAL.HRFIM)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(CAL.HRFIM), -2) END HRFIM,
                        CAL.USUARIO||' - '||USU.NOMEUSU USUARIO, 
                        CAL.CORFUNDO, 
                        CAL.CORFONTE 
                    FROM AD_CALENDINOV CAL
                    INNER JOIN TSIUSU USU ON CAL.USUARIO = USU.CODUSU
                    INNER JOIN AD_NOVOSPRODUTOS NOV ON CAL.COD_DESENV_PROJ = NOV.NROUNICO
                    WHERE CAL.CODIGO =` + CodCal;

                JX.consultar(sql)
                    .then(data => {
                        if (data && data.length > 0) {
                            const item = data[0];
                            document.getElementById("COD_DESENV_PROJ").value = item.COD_DESENV_PROJ || '';
                            document.getElementById("OBS").value = item.OBS || '';
                            document.getElementById("CONCLUIDO").value = item.CONCLUIDO || '';
                            document.getElementById("DTAINICIO").value = item.DTAINICIO || '';
                            document.getElementById("DTAFIM").value = item.DTAFIM || '';
                            document.getElementById("HRINI").value = item.HRINI || '';
                            document.getElementById("HRFIM").value = item.HRFIM || '';
                            document.getElementById("USUARIO").value = item.USUARIO;
                        } else {
                            console.error("Nenhum dado encontrado para o código especificado.");
                        }
                    })
                    .catch(error => {
                        console.error("Erro ao consultar os dados: ", error);
                    });
            } else {
                console.error("Código do calendário não especificado.");
            }
        }

        function salvarRegistro() {
            if (confirm("Deseja salvar as alterações no registro atual?")) {
                const dados = {
                    COD_DESENV_PROJ: document.getElementById("COD_DESENV_PROJ").value,
                    OBS: document.getElementById("OBS").value,
                    CONCLUIDO: document.getElementById("CONCLUIDO").value,
                    DTAINICIO: document.getElementById("DTAINICIO").value,
                    DTAFIM: document.getElementById("DTAFIM").value,
                    HRINI: document.getElementById("HRINI").value,
                    HRFIM: document.getElementById("HRFIM").value,
                    USUARIO: document.getElementById("USUARIO").value
                };

                console.log("Dados salvos: ", dados);
                alert("Registro salvo com sucesso!");
            }
        }

        function excluirRegistro() {
            if (confirm("Deseja excluir o registro atual?")) {
                const CodCal = obterCodCal();
                if (CodCal) {
                    console.log("Registro excluído: Código", CodCal);
                    alert("Registro excluído com sucesso!");
                    location.reload();
                } else {
                    console.error("Código do calendário não encontrado.");
                }
            }
        }

        function cancelarOperacao() {
            if (confirm("Deseja cancelar as alterações realizadas?")) {
                carregarDados();
                alert("Alterações canceladas.");
            }
        }

        document.getElementById("btnSalvar").addEventListener("click", salvarRegistro);
        document.getElementById("btnExcluir").addEventListener("click", excluirRegistro);
        document.getElementById("btnCancelar").addEventListener("click", cancelarOperacao);

        carregarDados();
    </script>
</body>

</html>