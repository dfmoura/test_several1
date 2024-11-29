<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página com Cards</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/dataTables.bootstrap5.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/dataTables.bootstrap5.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            height: 100vh;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .container {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            padding: 10px;
        }

        .half-row {
            display: flex;
            flex: 1;
            gap: 10px;
            height: 50%;
        }

        .column {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .card {
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            margin: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
            position: relative;
        }

        .card h2 {
            margin: 0 0 10px;
            font-size: 1.2em;
            align-self: flex-start;
        }

        .chart-container {
            position: relative;
            width: 100%;
            height: 80%; /* Reduzido em 20% */
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .chart-overlay {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 56%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
        }        

        canvas, .plotly-chart {
            width: 100%;
            height: 100%;
        }

        .dataTables_wrapper {
            width: 100%;
            height: 100%;
        }

        table {
            width: 100%;
            height: 100%;
        }


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
<snk:load/>    
</head>
<body>

    <snk:query var="custo_total">



    WITH CUS AS
    (
    
    SELECT
    CAB.CODEMP,
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV AS EMPRESA,
    CAB.NUNOTA,
    PRO.AD_TPPROD,
    NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
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

    GROUP BY 
    CAB.CODEMP, 
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV, 
    CAB.NUNOTA, 
    CAB.TIPMOV,
    PRO.AD_TPPROD,
    ITE.CODPROD
    )
    SELECT SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT FROM CUS    


    </snk:query>



    <snk:query var="custo_tipo">  

    WITH CUS AS
    (
    
    SELECT
    CAB.CODEMP,
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV AS EMPRESA,
    CAB.NUNOTA,
    PRO.AD_TPPROD,
    NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
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
    
    GROUP BY 
    CAB.CODEMP, 
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV, 
    CAB.NUNOTA, 
    CAB.TIPMOV,
    PRO.AD_TPPROD,
    ITE.CODPROD
    )
    SELECT AD_TPPROD,TIPOPROD,SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
    FROM CUS 
    GROUP BY AD_TPPROD,TIPOPROD    
    
</snk:query>   

<snk:query var="custo_produto">  


WITH CUS AS
(

SELECT
CAB.CODEMP,
SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV AS EMPRESA,
CAB.NUNOTA,
PRO.AD_TPPROD,
NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
ITE.CODPROD,
PRO.DESCRPROD,
NVL(CUS.CUSSEMICM,0) CUSSEMICM,
ITE.QTDNEG,
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

GROUP BY 
CAB.CODEMP, 
SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV, 
CAB.NUNOTA, 
CAB.TIPMOV,
PRO.AD_TPPROD,
ITE.CODPROD,
PRO.DESCRPROD,
NVL(CUS.CUSSEMICM,0),
ITE.QTDNEG
)
SELECT CODEMP,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
FROM CUS 
WHERE AD_TPPROD = :A_TPPROD OR ( AD_TPPROD = 4 AND :A_TPPROD IS NULL)
GROUP BY CODEMP,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD

</snk:query> 

<snk:query var="custo_detalhe">
    SELECT DISTINCT 
    I.CODEMP,
    I.NUNOTA,
    CAB.IDIPROC,
    TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') DTNEG,
    P.AD_TPPROD,
    NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', P.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
    I.CODPROD,
    P.DESCRPROD,
    I.QTDNEG,
    I.CODVOL,
    	(SELECT ENTRADASEMICMS FROM TGFCUSITE WHERE NUNOTA=I.NUNOTA AND SEQUENCIA=I.SEQUENCIA AND CODPROD=I.CODPROD) AS CUSNOTA,
    (SELECT CUSSEMICM
     FROM TGFCUS
    WHERE     TGFCUS.CODPROD = I.CODPROD
          AND DTATUAL = (SELECT MAX (DTATUAL)
                           FROM TGFCUS
                          WHERE DTATUAL <= CAB.DTNEG)
          AND TGFCUS.CODEMP = CAB.CODEMP) CUSTO
    FROM TGFITE I
         INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = I.NUNOTA)
         INNER JOIN TGFPRO P ON (P.CODPROD = I.CODPROD)
   WHERE     CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
         AND I.ATUALESTOQUE = 1
         
         
         
		AND CAB.TIPMOV='F'
ORDER BY CODPROD, I.NUNOTA

</snk:query> 



<snk:query var="custo_detalhe_insu">
SELECT 
I.NUNOTA,
I.CODPROD,
P.DESCRPROD,
I.QTDNEG,
I.CODVOL,
C.CUSSEMICM,
C.CUSSEMICM * I.QTDNEG AS VLRTOT,
ROUND(((I.QTDNEG / I2.QTDNEG) * C.CUSSEMICM),5) AS CUSTO
FROM TGFITE I
INNER JOIN TGFITE I2 ON (I2.NUNOTA = I.NUNOTA)
INNER JOIN TGFCUS C ON (I.CODPROD = C.CODPROD AND I.CODEMP = C.CODEMP)
INNER JOIN TGFCAB CAB
   ON (CAB.NUNOTA = I.NUNOTA AND CAB.NUNOTA = I2.NUNOTA)
INNER JOIN TGFPRO P ON (P.CODPROD = I.CODPROD)
INNER JOIN TGFVAR V
   ON (    I.NUNOTA = V.NUNOTAORIG
       AND I2.NUNOTA = V.NUNOTA
       AND V.SEQUENCIAORIG = I2.SEQUENCIA
       AND V.SEQUENCIA = I.SEQUENCIA)
WHERE     I.NUNOTA = :A_NUNOTA_OP

AND (I.ATUALESTOQUE IN (-1, 0))
AND I2.ATUALESTOQUE = 1
AND C.DTATUAL =
       (SELECT MAX (DTATUAL)
          FROM TGFCUS C1
         WHERE     C1.CODPROD = C.CODPROD
               AND I.CODPROD = C1.CODPROD
               AND DTATUAL <= CAB.DTNEG)
ORDER BY CODPROD
</snk:query>


    <div class="container">
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por Tipo de Produtos Faturados</h2>
                    <div class="chart-container">
                        <canvas id="doughnutChart"></canvas>
                        <c:forEach items="${custo_total.rows}" var="row">
                            <div class="chart-overlay"><fmt:formatNumber value="${row.CUSMEDSICM_TOT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                        </c:forEach>                        
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Custo Médio dos Produtos Faturados</h2>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Cód.</th>
                                    <th>Tp. Prod.</th>
                                    <th>Cód.</th>
                                    <th>Produto</th>
                                    <th>Custo Méd. Tot.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:set var="total" value="0" />
                                <c:forEach var="item" items="${custo_produto.rows}">
                                    <tr>
                                        <td>${item.AD_TPPROD}</td>
                                        <td>${item.TIPOPROD}</td>
                                        <td onclick="abrir_prod('${item.AD_TPPROD}','${item.CODPROD}')">${item.CODPROD}</td>                                        
                                        <td>${item.DESCRPROD}</td>
                                        <td><fmt:formatNumber value="${item.CUSMEDSICM_TOT}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                        <c:set var="total" value="${total + item.CUSMEDSICM_TOT}" />
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
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Detalhamento Custo de Produção</h2>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>NÚ. Único</th>
                                    <th>OP</th>
                                    <th>Dt. Neg.</th>
                                    <th>Cód.</th>
                                    <th>Produto</th>
                                    <th>Qtde.</th>
                                    <th>Vol.</th>
                                    <th>Custo Nota</th>
                                    <th>Custo Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:forEach var="item" items="${custo_detalhe.rows}">
                                    <tr>
                                        <td onclick="ref_det_prod('${item.NUNOTA}')">${item.NUNOTA}</td>
                                        <td onclick="abrir_op('${item.IDIPROC}'); copiar('${item.IDIPROC}')">${item.IDIPROC}</td>
                                        <td>${item.DTNEG}</td>
                                        <td>${item.CODPROD}</td>
                                        <td>${item.DESCRPROD}</td>
                                        <td>${item.QTDNEG}</td>
                                        <td>${item.CODVOL}</td>
                                        <td>${item.CUSNOTA}</td>
                                        <td>${item.CUSTO}</td>
                                    </tr>
                                </c:forEach>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Detalhamento Insumos Produção</h2>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>NÚ. Único</th>
                                    <th>Cód. Prod.</th>
                                    <th>Produto</th>
                                    <th>Custo Médio Dia</th>
                                    <th>Qtde.</th>
                                    <th>Vol.</th>
                                    <th>Custo por Kg</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:forEach var="item" items="${custo_detalhe_insu.rows}">
                                    <tr>
                                        <td>${item.NUNOTA}</td>
                                        <td>${item.CODPROD}</td>
                                        <td>${item.DESCRPROD}</td>
                                        <td>${item.CUSSEMICM}</td>
                                        <td>${item.QTDNEG}</td>
                                        <td>${item.CODVOL}</td>
                                        <td>${item.CUSTO}</td>
                                    </tr>
                                </c:forEach>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>            
        </div>
    </div>
    
    <script>

   // Função para atualizar a query
   function ref_cus(tipoprod) {
        const params = {'A_TPPROD': tipoprod};
        refreshDetails('html5_a73fhga', params); 
    }       

   

    function ref_det_prod(nunota_op) {
        var params = {'A_NUNOTA_OP': nunota_op};
        refreshDetails('html5_a73fhga', params); 
    }


   // Função para abrir tela

    function abrir_portal(nunota) {
            var params = {'A_NUNOTA': nunota};
            var level = 'br.com.sankhya.com.mov.CentralNotas';
            openApp(level, params);
        }    

    function abrir_op(IDIPROC) {
        
        var params = {'A_IDIPROC': IDIPROC};
        var level = 'br.com.sankhya.prod.OrdensProducaoHTML';
        openApp(level, params);
    }    


    
    function abrir_prod(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPROD': parseInt(grupo1)
             };
            var level = 'lvl_ye79i5';
            
            openLevel(level, params);
        }       


        // Obtendo os dados da query JSP para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var custoTipoLabel = [];
        var custoTipoData = [];
        <c:forEach items="${custo_tipo.rows}" var="row">
            custoTipoLabel.push('${row.AD_TPPROD} - ${row.TIPOPROD}');
            custoTipoData.push(parseFloat(${row.CUSMEDSICM_TOT}));
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: custoTipoLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoTipoData,
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
                        var label = custoTipoLabel[index].split('-')[0];
                        
                        ref_cus(label);
                        //alert(label);
                    }
                }
            }
        });




        function copiar(texto) {

            const elementoTemporario = document.createElement('textarea');
            elementoTemporario.value = texto;
            document.body.appendChild(elementoTemporario);
            elementoTemporario.select();
            document.execCommand('copy');
            document.body.removeChild(elementoTemporario);

            //alert('Texto copiado: ' + texto);
        }



        </script>
</body>
</html>
