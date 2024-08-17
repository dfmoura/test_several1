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
    <title>Tela de Devoluções</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #ffffff;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px; /* Ajuste do gap para aumentar o espaçamento vertical */
            width: 90%;
            height: 90%;
        }
        .section {
            display: flex;
            flex-direction: column;
            gap: 30px; /* Ajuste do gap para aumentar o espaçamento vertical */
        }
        .part {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
            width: 100%;
            height: calc(50% - 20px); /* Ajuste da altura para refletir o novo gap */
            overflow: hidden; /* Impede que o conteúdo altere o tamanho da parte */
            position: relative; /* Necessário para posicionar o título */
            display: flex;
            flex-direction: column;
            justify-content: center; /* Centraliza verticalmente */
            align-items: center; /* Centraliza horizontalmente */
        }
        .part-title {
            position: absolute;
            top: 10px; /* Espaçamento do topo */
            left: 50%;
            transform: translateX(-50%);
            font-size: 18px;
            font-weight: bold;
            color: #333;
            background-color: #fff; /* Cor de fundo para legibilidade */
            padding: 0 10px; /* Espaçamento horizontal */
        }
        .chart-container {
            width: 80%; /* Ajuste da largura do gráfico */
            height: 80%; /* Ajuste da altura do gráfico */
            display: flex;
            justify-content: center; /* Centraliza horizontalmente o gráfico */
            align-items: center; /* Centraliza verticalmente o gráfico */
        }
        .chart-overlay {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 51%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
        }        
        .dropdown-container {
            display: flex;
            justify-content: flex-start; /* Alinha o dropdown à esquerda */
            width: 100%;
        }
        .dropdown-container select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            width: 100%;
            max-width: 300px; /* Limita a largura máxima do dropdown */
        }
        canvas {
            width: 100% !important;
            height: 100% !important;
        }
        /* Estilo para a tabela */
        .table-container {
            width: 100%; /* Largura da tabela ajustada para o contêiner */
            height: 100%;
            max-height: 200px; /* Define a altura máxima para o contêiner da tabela */
            overflow-y: auto; /* Habilita a rolagem vertical */
            overflow-x: hidden; /* Desabilita a rolagem horizontal */
            padding-right: 10px; /* Espaço para evitar o corte do conteúdo na rolagem */
            font-size: 12px;
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .table-container th {
            background-color: #f4f4f4;
            position: sticky;
            top: 0; /* Fixa o cabeçalho no topo ao rolar */
            z-index: 2; /* Garante que o cabeçalho fique sobre o conteúdo */
        }
        .table-container tr:hover {
            background-color: #f1f1f1;
        }
    </style>
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
    <snk:load/>

</head>


<body>
    
<snk:query var="tot_impostos">

SELECT
SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) TOT_IMP
FROM
(
SELECT
CAB.CODEMP,
CAB.NUNOTA,
SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRPIS,
NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRCOFINS,
SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
(SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
	- SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
        (
(SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
	- (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
	- SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
) PERCMARGEM,
CAB.TIPMOV
FROM TGFCAB CAB
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
WHERE TOP.GOLSINAL = -1
AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S'
AND CAB.CODNAT IN (:P_NATUREZA)
AND CAB.CODCENCUS IN (:P_CR)
AND CAB.CODVEND IN (:P_VENDEDOR)
AND VEN.AD_ROTA IN (:P_ROTA)
GROUP BY CAB.CODEMP, CAB.NUNOTA, CAB.TIPMOV
)

</snk:query>


    <snk:query var="impostos">
        
            WITH IMP AS
            (
            
            SELECT
            CAB.CODEMP,
            CAB.NUNOTA,
            PRO.AD_TPPROD,
            ITE.CODPROD,
            SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
            SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
            SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
            SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
            SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
            SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
            
            SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRPIS,
            SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRCOFINS,
            
            SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
            SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
            (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
                - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
                - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
                - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
            ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
                    (
            (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
                - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
                - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
                - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
            ) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
            ) PERCMARGEM,
            CAB.TIPMOV
            FROM TGFCAB CAB
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
            INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
            INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
            INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
            LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
            INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            LEFT JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
            LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
            LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
            WHERE TOP.GOLSINAL = -1
            AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
            AND TOP.TIPMOV IN ('V', 'D')
            AND TOP.ATIVO = 'S'
            
            AND CAB.CODNAT IN (:P_NATUREZA)
            AND CAB.CODCENCUS IN (:P_CR)
            AND CAB.CODVEND IN (:P_VENDEDOR)
            AND VEN.AD_ROTA IN (:P_ROTA)
            
            GROUP BY CAB.CODEMP, CAB.NUNOTA, CAB.TIPMOV,PRO.AD_TPPROD,ITE.CODPROD
            
            
            )
                SELECT 1 AS COD,'VLRSUBST' AS IMPOSTO, SUM(VLRSUBST) AS VALOR FROM IMP 
                UNION ALL
                SELECT 2 AS COD,'VLRIPI' AS IMPOSTO, SUM(VLRIPI) AS VALOR FROM IMP
                UNION ALL
                SELECT 3 AS COD,'VLRICMS' AS IMPOSTO, SUM(VLRICMS) AS VALOR FROM IMP
                UNION ALL
                SELECT 4 AS COD,'PIS' AS IMPOSTO, SUM(VLRPIS) AS VALOR FROM IMP
                UNION ALL
                SELECT 5 AS COD,'COFINS' AS IMPOSTO, SUM(VLRCOFINS) AS VALOR FROM IMP
    
    </snk:query>   


    <snk:query var="impostos_emp">  



    SELECT
    CODEMP,
    EMPRESA,
    COD,
    IMPOSTO,
    VALOR
    FROM
    (
    
    WITH IMP AS
    (
    
    SELECT
    CAB.CODEMP,
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV AS EMPRESA,
    CAB.NUNOTA,
    PRO.AD_TPPROD,
    ITE.CODPROD,
    SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
    SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
    SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
    SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
    
    SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRPIS,
    SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRCOFINS,
    
    SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
    SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
            (
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
    ) PERCMARGEM,
    CAB.TIPMOV
    FROM TGFCAB CAB
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
    INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
    INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
    LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    LEFT JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
    LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_ROTA IN (:P_ROTA)
    
    GROUP BY CAB.CODEMP, SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV, CAB.NUNOTA, CAB.TIPMOV,PRO.AD_TPPROD,ITE.CODPROD
    
    
    )
        SELECT CODEMP,EMPRESA,1 AS COD,'VLRSUBST' AS IMPOSTO, SUM(VLRSUBST) AS VALOR FROM IMP GROUP BY CODEMP,EMPRESA
        UNION ALL
        SELECT CODEMP,EMPRESA,2 AS COD,'VLRIPI' AS IMPOSTO, SUM(VLRIPI) AS VALOR FROM IMP GROUP BY CODEMP,EMPRESA
        UNION ALL
        SELECT CODEMP,EMPRESA,3 AS COD,'VLRICMS' AS IMPOSTO, SUM(VLRICMS) AS VALOR FROM IMP GROUP BY CODEMP,EMPRESA
        UNION ALL
        SELECT CODEMP,EMPRESA,4 AS COD,'PIS' AS IMPOSTO, SUM(VLRPIS) AS VALOR FROM IMP GROUP BY CODEMP,EMPRESA
        UNION ALL
        SELECT CODEMP,EMPRESA,5 AS COD,'COFINS' AS IMPOSTO, SUM(VLRCOFINS) AS VALOR FROM IMP GROUP BY CODEMP,EMPRESA
    )

    WHERE COD = :A_IMPOSTOS OR ( COD = 3 AND :A_IMPOSTOS IS NULL)
    ORDER BY VALOR DESC    
    
    </snk:query>  

<snk:query var="impostos_tipo">  


SELECT * FROM(

    WITH IMP AS
    (
    
    SELECT
    PRO.AD_TPPROD,
    (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) AS TIPOPROD,
    CAB.NUNOTA,
    ITE.CODPROD,
    SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
    SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
    SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
    SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
    
    SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRPIS,
    SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRCOFINS,
    
    SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
    SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
            (
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
    ) PERCMARGEM,
    CAB.TIPMOV
    FROM TGFCAB CAB
    INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
    INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
    LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    LEFT JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
    LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_ROTA IN (:P_ROTA)
    
    GROUP BY PRO.AD_TPPROD, CAB.NUNOTA, CAB.TIPMOV,ITE.CODPROD
    
    
    )

        SELECT AD_TPPROD,TIPOPROD,1 AS COD,'VLRSUBST' AS IMPOSTO, SUM(VLRSUBST) AS VALOR FROM IMP GROUP BY AD_TPPROD,TIPOPROD
        UNION ALL
        SELECT AD_TPPROD,TIPOPROD,2 AS COD,'VLRIPI' AS IMPOSTO, SUM(VLRIPI) AS VALOR FROM IMP GROUP BY AD_TPPROD,TIPOPROD
        UNION ALL
        SELECT AD_TPPROD,TIPOPROD,3 AS COD,'VLRICMS' AS IMPOSTO, SUM(VLRICMS) AS VALOR FROM IMP GROUP BY AD_TPPROD,TIPOPROD
        UNION ALL
        SELECT AD_TPPROD,TIPOPROD,4 AS COD,'PIS' AS IMPOSTO, SUM(VLRPIS) AS VALOR FROM IMP GROUP BY AD_TPPROD,TIPOPROD
        UNION ALL
        SELECT AD_TPPROD,TIPOPROD,5 AS COD,'COFINS' AS IMPOSTO, SUM(VLRCOFINS) AS VALOR FROM IMP GROUP BY AD_TPPROD,TIPOPROD
    )

    WHERE COD = :A_IMPOSTOS OR ( COD = 3 AND :A_IMPOSTOS IS NULL) 
    ORDER BY VALOR DESC
    


</snk:query>  

<snk:query var="impostos_produto">  


SELECT * FROM(

    WITH IMP AS
    (
    
    SELECT
    PRO.AD_TPPROD,
    (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) AS TIPOPROD,
    ITE.CODPROD,
    PRO.DESCRPROD,
    CAB.NUNOTA,

    SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
    SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
    SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
    SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
    
    SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRPIS,
    SUM((SELECT VALOR FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS VLRCOFINS,
    
    SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
    SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
            (
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
    ) PERCMARGEM,
    CAB.TIPMOV
    FROM TGFCAB CAB
    INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
    INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
    LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    LEFT JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
    LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'

    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_ROTA IN (:P_ROTA)

    GROUP BY PRO.AD_TPPROD,ITE.CODPROD,PRO.DESCRPROD,CAB.NUNOTA, CAB.TIPMOV
    
    
    )

        SELECT AD_TPPROD,1 AS COD,'VLRSUBST' AS IMPOSTO,CODPROD,DESCRPROD, SUM(VLRSUBST) AS VALOR FROM IMP GROUP BY AD_TPPROD,CODPROD,DESCRPROD
        UNION ALL
        SELECT AD_TPPROD,2 AS COD,'VLRIPI' AS IMPOSTO,CODPROD,DESCRPROD, SUM(VLRIPI) AS VALOR FROM IMP GROUP BY AD_TPPROD,CODPROD,DESCRPROD
        UNION ALL
        SELECT AD_TPPROD,3 AS COD,'VLRICMS' AS IMPOSTO,CODPROD,DESCRPROD, SUM(VLRICMS) AS VALOR FROM IMP GROUP BY AD_TPPROD,CODPROD,DESCRPROD
        UNION ALL
        SELECT AD_TPPROD,4 AS COD,'PIS' AS IMPOSTO,CODPROD,DESCRPROD, SUM(VLRPIS) AS VALOR FROM IMP GROUP BY AD_TPPROD,CODPROD,DESCRPROD
        UNION ALL
        SELECT AD_TPPROD,5 AS COD,'COFINS' AS IMPOSTO,CODPROD,DESCRPROD, SUM(VLRCOFINS) AS VALOR FROM IMP GROUP BY AD_TPPROD,CODPROD,DESCRPROD
    
)
    WHERE COD = :A_IMPOSTOS OR ( COD = 3 AND :A_IMPOSTOS IS NULL) 
    ORDER BY VALOR DESC


</snk:query>  


    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Impostos</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${tot_impostos.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.TOT_IMP}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Impostos por Empresa</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">Impostos por Grupo de Produtos</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Impostos por Produto</div>
                <div class="table-container">
                    <table id="motivo_prod_table">
                        <thead>
                            <tr>
                                <th>Cód. Imp.</th>
                                <th>Cód. Tp. Prod.</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach var="item" items="${impostos_produto.rows}">
                                <tr>
                                    <td>${item.COD}</td>
                                    <td>${item.AD_TPPROD}</td>
                                    <td onclick="abrir_prod('${item.COD}','${item.CODPROD}')">${item.CODPROD}</td>
                                    <td>${item.DESCRPROD}</td>
                                    <td><fmt:formatNumber value="${item.VALOR}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + item.VALOR}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td><b><fmt:formatNumber value="${total}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Adicionando a biblioteca Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Adicionando a biblioteca jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Adicionando a biblioteca DataTables -->
    <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    <script>


   // Função para atualizar a query
   function ref_imp(imposto) {
        const params = {'A_IMPOSTOS': imposto};
        refreshDetails('html5_a7wgpux', params); 
    }       


        // Função para abrir o novo nível
        function abrir_emp(grupo,grupo1) {
            var params = { 
                'A_COD' : parseInt(grupo),
                'A_CODEMP': parseInt(grupo1)
             };
            var level = 'lvl_vkan0l';
            
            openLevel(level, params);
        }

        function abrir_tpprod(grupo,grupo1) {
            var params = { 
                'A_COD' : parseInt(grupo),
                'A_TPPROD': parseInt(grupo1)
             };
            var level = 'lvl_vkan0l';
            
            openLevel(level, params);
        }

        function abrir_prod(grupo,grupo1) {
            var params = { 
                'A_COD' : parseInt(grupo),
                'A_CODPROD': parseInt(grupo1)
             };
            var level = 'lvl_vkan0l';
            
            openLevel(level, params);
        }


    // Obtendo os dados da query JSP para o gráfico de rosca

        var impostos = [];
        var valoresImpostos = [];
        <c:forEach items="${impostos.rows}" var="row">
            impostos.push('${row.COD} - ${row.IMPOSTO}');
            valoresImpostos.push('${row.VALOR}');
        </c:forEach>
        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: impostos,
                datasets: [{
                    label: 'Impostos',
                    data: valoresImpostos,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda

                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = impostos[index].split('-')[0];
                        ref_imp(label);
                        //alert(label);
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de barras verticais
        var empresaLabels1 = [];
        var vlrEmpData1 = [];

        <c:forEach items="${impostos_emp.rows}" var="row">
            empresaLabels1.push('${row.COD} - ${row.CODEMP} - ${row.EMPRESA}');
            vlrEmpData1.push('${row.VALOR}');
        </c:forEach> 

        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: empresaLabels1,
                datasets: [{
                    label: 'Imposto',
                    data: vlrEmpData1,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = empresaLabels1[index].split('-')[0];
                        const grupo1 = empresaLabels1[index].split('-')[1];
                        abrir_emp(grupo,grupo1);
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de colunas verticais
        var tipoLabels = [];
        var tipoData = [];
        <c:forEach items="${impostos_tipo.rows}" var="row">
            tipoLabels.push('${row.COD} - ${row.AD_TPPROD} - ${row.TIPOPROD}');
            tipoData.push('${row.VALOR}');
        </c:forEach>                      
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: tipoLabels,
                datasets: [{
                    label: 'Por Tipo Produto',
                    data: tipoData,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = tipoLabels[index].split('-')[0];
                        const grupo1 = tipoLabels[index].split('-')[1];
                        abrir_tpprod(grupo,grupo1);
                    }
                }
            }
        });
        
    </script>
</body>
</html>
