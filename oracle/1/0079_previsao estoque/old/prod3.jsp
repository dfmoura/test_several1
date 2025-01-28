<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela Responsiva</title>
    <style>
        /* Reset básico */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f9f9f9;
            color: #333;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: auto;
            overflow: hidden;
            padding: 0 20px;
        }

        h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #555;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        table thead {
            background: #007BFF;
            color: #fff;
        }

        table th, table td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }

        table th {
            font-weight: bold;
        }

        table tbody tr:nth-child(even) {
            background: #f2f2f2;
        }

        table tbody tr:hover {
            background: #f1f7ff;
        }

        @media (max-width: 768px) {
            table thead {
                display: none;
            }

            table, table tbody, table tr, table td {
                display: block;
                width: 100%;
            }

            table tr {
                margin-bottom: 15px;
            }

            table td {
                text-align: right;
                padding-left: 50%;
                position: relative;
            }

            table td::before {
                content: attr(data-label);
                position: absolute;
                left: 10px;
                width: calc(50% - 20px);
                font-weight: bold;
                text-align: left;
            }
        }
    </style>
    <snk:load/>
</head>
<body>

    <snk:query var="detalhe"> 

    SELECT
    A.CODEMP,
    EMP.NOMEFANTASIA,
    A.CODPROD,
    A.DESCRPROD,
    A.MARCA,
    A.CODGRUPOPROD,
    A.DESCRGRUPOPROD,
    A.AD_QTDVOLLT,
    
    (WITH DIAS AS (
        SELECT :P_PERIODO.INI + LEVEL - 1 AS DIA
        FROM DUAL
        CONNECT BY LEVEL <= :P_PERIODO.FIN - :P_PERIODO.INI + 1
    )
    SELECT COUNT(DIA) DIAS
    FROM DIAS
    WHERE TO_CHAR(DIA, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') NOT IN ('SAT', 'SUN')
    AND TO_DATE(DIA,'DD/MM/YYYY') NOT IN (SELECT TO_DATE(DATA,'DD/MM/YYYY') FROM AD_FERIADOS) 
    ) AS DU
    
    
    
    FROM(
    
    SELECT
    PRO.CODPROD,
    PRO.DESCRPROD,
    PRO.MARCA,
    PRO.CODGRUPOPROD,
    GRU.DESCRGRUPOPROD,
    EST.CODEMP,
    SUM(EST.ESTOQUE) -
    NVL((SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE) FROM TGFITE ITE WHERE ITE.RESERVA = 'N' AND ITE.CODEMP = EST.CODEMP AND ITE.CODPROD = EST.CODPROD AND ITE.CODLOCALORIG = EST.CODLOCAL AND ITE.CONTROLE = EST.CONTROLE AND ITE.ATUALESTOQUE <> 0 AND
                              ITE.NUNOTA IN(SELECT NUNOTA FROM TGFCAB WHERE DTNEG > :P_PERIODO.INI) ),0) AS ESTOQUE,
    PRO.AD_QTDVOLLT,
    
    EST.CODLOCAL,
    LOC.DESCRLOCAL,
    (SELECT CUS.CUSMEDICM FROM TGFCUS CUS WHERE CUS.CODEMP = EST.CODEMP AND CUS.CODPROD = EST.CODPROD AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CUS.CODEMP AND C.CODPROD = CUS.CODPROD AND C.DTATUAL <= :P_PERIODO.INI) ) AS CUSUNIT,
    EST.CONTROLE AS LOTE,
    (SUM(EST.ESTOQUE) -
    NVL((SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE) FROM TGFITE ITE WHERE ITE.RESERVA = 'N' AND  EST.CODEMP = ITE.CODEMP AND ITE.CODPROD = EST.CODPROD AND ITE.CODLOCALORIG = EST.CODLOCAL AND ITE.CONTROLE = EST.CONTROLE AND ITE.ATUALESTOQUE <> 0 AND
                              ITE.NUNOTA IN(SELECT NUNOTA FROM TGFCAB WHERE DTNEG > :P_PERIODO.INI) ),0)) *
                              (SELECT CUS.CUSMEDICM FROM TGFCUS CUS WHERE CUS.CODEMP = EST.CODEMP AND CUS.CODPROD = EST.CODPROD AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CUS.CODEMP AND C.CODPROD = CUS.CODPROD AND C.DTATUAL <= :P_PERIODO.INI) ) AS custotal
                              
    FROM
    TGFEST EST,
    TGFPRO PRO,
    TGFLOC LOC,
    TGFGRU GRU
    
    WHERE 
    EST.CODPROD = PRO.CODPROD AND
    EST.CODLOCAL = LOC.CODLOCAL AND
    GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    
    GROUP BY 
    PRO.CODPROD, PRO.DESCRPROD,PRO.MARCA,PRO.CODGRUPOPROD,GRU.DESCRGRUPOPROD, LOC.DESCRLOCAL, EST.CONTROLE, EST.CODLOCAL, EST.CODPROD, EST.CODEMP, PRO.AD_QTDVOLLT
    
    )A
    INNER JOIN TSIEMP EMP ON A.CODEMP = EMP.CODEMP
    
    WHERE 
    (:P_CHECK_EMP = 'S' OR (A.CODEMP = :P_EMPRESA  AND NVL(:P_CHECK_EMP,'N') = 'N'))
    AND (:P_CHECK_EST = 'S' OR (A.ESTOQUE <> 0 AND NVL(:P_CHECK_EST,'N') = 'N'))
    AND (A.CODPROD = :P_CODPROD OR :P_CODPROD IS NULL)
    AND A.CODGRUPOPROD NOT IN (3010000,3020000,5000000,6000000)
    GROUP BY
    A.CODEMP,
    EMP.NOMEFANTASIA,
    A.CODPROD,
    A.DESCRPROD,
    A.MARCA,
    A.CODGRUPOPROD,
    A.DESCRGRUPOPROD,
    A.AD_QTDVOLLT    
        
        
        </snk:query>

<div class="container">
    <h1>Tabela de Produtos</h1>
    <table>
        <thead>
            <tr>
                <th>Empresa</th>
                <th>Nome Fantasia</th>
                <th>Código Produto</th>
                <th>Descrição</th>
                <th>Marca</th>
                <th>Grupo</th>
                <th>Descrição Grupo</th>
                <th>Qtd Vol</th>
                <th>Dias Úteis</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach var="row" items="${detalhe.rows}">
                <tr>
                    <td data-label="Empresa">${row.CODEMP}</td>
                    <td data-label="Nome Fantasia">${row.NOMEFANTASIA}</td>
                    <td data-label="Código Produto">${row.CODPROD}</td>
                    <td data-label="Descrição">${row.DESCRPROD}</td>
                    <td data-label="Marca">${row.MARCA}</td>
                    <td data-label="Grupo">${row.CODGRUPOPROD}</td>
                    <td data-label="Descrição Grupo">${row.DESCRGRUPOPROD}</td>
                    <td data-label="Qtd Vol">${row.AD_QTDVOLLT}</td>
                    <td data-label="Qtd Vol">${row.DU}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</div>
</body>
</html>
