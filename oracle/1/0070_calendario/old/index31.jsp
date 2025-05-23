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
        /* Adiciona um espaçamento entre os campos */
        .row-spacing {
            margin-bottom: 10px;
        }

    </style>
</head>

<body>
    <div class="container mt-5">
        <h3 style="text-align: left;">Evento Registrado: <span id="grupo-codcal"></span></h3>

        <!-- Formulário para inserir ou editar um registro -->
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
                            <select id="CONCLUIDO" class="form-control" readonly>
                                <option value="S">Sim</option>
                                <option value="N">Não</option>
                            </select>
                        </div>            
                    </div>
                </div>
                <div class="form-group">
                    <label for="OBS">Observações</label>
                    <textarea id="OBS" class="form-control" rows="4" placeholder="Digite as observações" readonly></textarea>
                </div>

                <!-- Data e Hora lado a lado -->
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
                            <input type="text" id="HRINI" class="form-control" placeholder="digitar hhmm" readonly>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label for="HRFIM">Hora Fim (hhmm)</label>
                            <input type="text" id="HRFIM" class="form-control" placeholder="digitar hhmm" readonly>
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
                <button type="button" id="btnExcluir" class="btn btn-danger mt-2 ml-2">Excluir</button>
            </form>
        </div>
    </div>

    <script>

        flatpickr("#DTAINICIO", { dateFormat: "d/m/Y" });
        flatpickr("#DTAFIM", { dateFormat: "d/m/Y" });

        function obterCodCal() {
            const CodCal = localStorage.getItem('A_CODCAL');
            return CodCal ? parseInt(CodCal, 10) : null;
        }

        const CodCal = obterCodCal();
        document.getElementById('grupo-codcal').textContent = CodCal;

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
                        document.getElementById("CORFUNDO").value = item.CORFUNDO || '';
                        document.getElementById("CORFONTE").value = item.CORFONTE || '';
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


        // Função para excluir
        document.getElementById("btnExcluir").addEventListener("click", () => {
            JX.deletar('AD_CALENDINOV', [{ CODIGO: CodCal }]).then(response => {
                alert("Registro excluído com sucesso!");
                location.reload(); // Recarrega a página após exclusão
                
            }).catch(error => {
                console.error("Erro ao excluir o registro:", error);
            });
        });

        // Função para mostrar o alerta com o nome do usuário
        function mostrarAlerta() {
            const usuario = document.getElementById("USUARIO").value;
            alert('Usuário: ' + usuario);
        }

         
    </script>

</body>
</html>
