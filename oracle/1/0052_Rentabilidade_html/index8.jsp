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
<style>
    /* Estilos adicionais aqui */
    body {
        margin-top: 0; /* Remove o espaço no topo da página */
    }
    .card {
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .card:hover {
        transform: translateY(-10px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }
    .card:hover .card-body {

        border-radius: 15px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        background-color: #130455; /* Azul */
        color: #fff; /* Branco para o texto */
        
    }
    .card-footer {
        text-align: center; /* Centraliza o texto no rodapé */
    }
    .icon {
        margin: 0 auto; /* Centraliza horizontalmente */
        display: block;
        width: 35px;
        height: 35px;
        background-color: transparent; 
    }
</style>

<snk:load/>



</head>


<body class="bg-light">

<snk:query var="dias">  

    SELECT
    TO_CHAR(ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2), '999G999G999G999D99') AS HL

    , TO_CHAR(ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END),2), '999G999G999G999D99') AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'

</snk:query>   



<c:forEach items="${dias.rows}" var="row">    
<div class="container-fluid">

    <!-- Parte Superior - 4 Cards -->
    <div class="row mt-2">
        <div class="col-lg-3 col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://iconmonstr.com/wp-content/g/gd/makefg.php?i=../releases/preview/2013/png/iconmonstr-coin-2.png&r=0&g=0&b=0" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>${row.VLRFAT}</h1>
                    <p>Faturamento</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://iconmonstr.com/wp-content/g/gd/makefg.php?i=../releases/preview/2013/png/iconmonstr-coin-2.png&r=0&g=0&b=0" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>${row.HL}</h1>
                    <p>HL</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://cdns.iconmonstr.com/wp-content/releases/preview/2013/240/iconmonstr-coin-2.png" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>$15,000,000</h1>
                    <p>Desconto</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://cdns.iconmonstr.com/wp-content/releases/preview/2013/240/iconmonstr-coin-2.png" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>$15,000,000</h1>
                    <p>Devolução</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
    </div>

    <!-- Parte do Meio - 2 Cards -->
    <div class="row mt-2">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        
                        <img src="https://cdns.iconmonstr.com/wp-content/releases/preview/2013/240/iconmonstr-coin-7.png" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>$15,000,000</h1>
                    <p>Despesa Operacional</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://cdns.iconmonstr.com/wp-content/releases/preview/2013/240/iconmonstr-coin-9.png" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>$15,000,000</h1>
                    <p>Investimento</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
    </div>

    <!-- Parte Inferior - 2 Cards -->
    <div class="row mt-2">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://cdns.iconmonstr.com/wp-content/releases/preview/2013/240/iconmonstr-checkout-3.png" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>$15,000,000</h1>
                    <p>EBIT</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <img src="https://cdns.iconmonstr.com/wp-content/releases/preview/2013/240/iconmonstr-checkout-4.png" alt="Ícone de Moeda" class="icon">
                    </div>
                    <h1>$15,000,000</h1>
                    <p>EBITDA</p>
                </div>
                <div class="card-footer text-muted">
                    Mês Anterior: $13,000,000
                </div>
            </div>
        </div>
    </div>
</div>
</c:forEach>

<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
