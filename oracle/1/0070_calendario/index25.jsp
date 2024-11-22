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
            margin-bottom: 15px;
        }
    </style>
</head>

<body>
    <div class="container mt-5">
        <h1 class="text-center">Cadastro de Calendário</h1>

        <!-- Formulário para inserir ou editar um registro -->
        <div class="mb-4">
            <form id="formCadastro">
                <div class="row row-spacing">
                    <div class="col-md-8">
                        <div class="form-group">
                            <label for="COD_DESENV_PROJ">Projeto</label>
                            <input id="COD_DESENV_PROJ" class="form-control" readonly>
                                <!-- Opções carregadas via JavaScript -->
                            </input>
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
                <button type="button" id="btnCancelar" class="btn btn-secondary mt-2 ml-2">Cancelar</button>
            </form>
        </div>

    <script>

        flatpickr("#DTAINICIO", { dateFormat: "d/m/Y" });
        flatpickr("#DTAFIM", { dateFormat: "d/m/Y" });


        function obterCodCal() {
            const CodCal = localStorage.getItem('A_CODCAL');
            return CodCal ? parseInt(CodCal, 10) : null;
        }

        const CodCal = obterCodCal();

        if (CodCal) {
            const sql = `
                SELECT 
                    CODIGO, 
                    COD_DESENV_PROJ, 
                    OBS, 
                    CONCLUIDO, 
                    TO_CHAR(DTAINICIO, 'DD-MM-YYYY') AS DTAINICIO, 
                    TO_CHAR(DTAFIM, 'DD-MM-YYYY') AS DTAFIM,
                    CASE WHEN HRINI IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRINI), 1, LENGTH(TO_CHAR(HRINI)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRINI), -2) END HRINI,
                    CASE WHEN HRFIM IS NULL THEN NULL ELSE TO_CHAR(LPAD(SUBSTR(TO_CHAR(HRFIM), 1, LENGTH(TO_CHAR(HRFIM)) - 2), 2, '0')) || ':' || SUBSTR(TO_CHAR(HRFIM), -2) END HRFIM,
                    USUARIO, 
                    CORFUNDO, 
                    CORFONTE 
                FROM AD_CALENDINOV 
                WHERE CODIGO =` + CodCal;

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
                    document.getElementById("USUARIO").value = item.USUARIO || '';
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

        
    </script>

</body>
</html>
