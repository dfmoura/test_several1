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
        
        margin-top: 10px; /* Remove o espaço no topo da página */
    }
    .card {
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        height: 85%; /* Reduz a altura em 15% */
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
        height: 50px; /* Ajusta a altura */
        font-size: 10px; /* Ajusta o tamanho da fonte */
    }
    .icon {
        margin: 0 auto; /* Centraliza horizontalmente */
        display: block;
        width: 25px;
        height: 25px;
        background-color: transparent; 
    }
    .card:hover .icon svg,
    .card:hover .icon img {
        filter: brightness(0) invert(1); /* Deixa o ícone branco ao passar o mouse */
    }
    .logo {
        width: 100%;
        max-width: 150px;
    }
    .arrow-up {
        color: green;
        font-size: 30px; /* Ajuste conforme necessário */
        font-weight: bold;
    }
    .arrow-down {
        color: red;
        font-size: 30px; /* Ajuste conforme necessário */
        font-weight: bold;
    }    

    /* Redução do espaçamento entre as seções */
    .custom-row {
        margin-top: 1rem; /* Reduz o espaçamento superior */
        margin-bottom: -2.5rem; /* Reduz o espaçamento inferior */
    }

    /* Estilos para o cabeçalho */
    header {
        justify-content: space-between;
        padding: 10px 20px;
        background-color: rgba(19, 4, 85); /* com 50% de transparência */ /* Cor de fundo do cabeçalho */
        border-bottom: 0.2px solid #130455; /* Cor da borda inferior */
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .logo-header {
        max-width: 60px;
    }
    .titulo-header {       
        font-size: 30px; /* Ajuste o tamanho da fonte conforme necessário */
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 6vh; /* Garante que o h1 esteja centralizado verticalmente dentro do header */
        margin: 0; /* Remove qualquer margem padrão */
        color: #fff;
    }        

    /* Estilos para as tags <p> e <h1> */
    p {
        font-size: 15px; /* Ajusta o tamanho da fonte de <p> */
    }
    h1 {
        font-size: 25px; /* Ajusta o tamanho da fonte de <h1> */
    }
    .footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background-color: #f8f9fa; /* Ajuste conforme necessário */
    border-top: 0.2px solid #130455; /* Ajuste conforme necessário */
    }

    .logo-footer {
        max-width: 70px; /* Ajuste conforme necessário */
    }
</style>

<snk:load/>


<script>
    function addArrow(value) {
        if (value >= 1.0000) {
            return '<span class="arrow-up">&uarr;</span>';
        } else {
            return '<span class="arrow-down">&darr;</span>';
        } 
    }
</script>


</head>

<body class="bg-light">
    <header>
        <h1 class="titulo-header">Rentabilidade Financeira 2.0</h1>
    </header>


<snk:query var="dias">  

SELECT

TO_CHAR(VLRFAT, '999G999G999G999D99') AS VLRFAT,
TO_CHAR(VLRFAT_MA, '999G999G999G999D99') AS VLRFAT_MA,
ROUND(((VLRFAT/VLRFAT_MA)-1)*100, 2) AS VAR_VLRFAT,
TO_CHAR(VLRDEVOL, '999G999G999G999D99') AS VLRDEVOL,
TO_CHAR(VLRDEVOL_MA, '999G999G999G999D99') AS VLRDEVOL_MA,
ROUND(((VLRDEVOL/VLRDEVOL_MA)-1)*100, 2) AS VAR_VLRDEVOL,


TO_CHAR(VLRIMP, '999G999G999G999D99') AS VLRIMP,
TO_CHAR(VLRIMP_MA, '999G999G999G999D99') AS VLRIMP_MA,
ROUND(((VLRIMP/VLRIMP_MA)-1)*100, 2) AS VAR_VLRIMP,

TO_CHAR(VLRCMV, '999G999G999G999D99') AS VLRCMV,
TO_CHAR(VLRCMV_MA, '999G999G999G999D99') AS VLRCMV_MA,
ROUND(((VLRCMV/VLRCMV_MA)-1)*100, 2) AS VAR_VLRCMV,

TO_CHAR(HL, '999G999G999G999D99') AS HL,
TO_CHAR(HL_MA, '999G999G999G999D99') AS HL_MA,
ROUND(((HL/HL_MA)-1)*100, 2) AS VAR_HL,
TO_CHAR(VLRDESC, '999G999G999G999D99') AS VLRDESC,
TO_CHAR(VLRDESC_MA, '999G999G999G999D99') AS VLRDESC_MA,
ROUND(((VLRDESC/VLRDESC_MA)-1)*100, 2) AS VAR_VLRDESC,

TO_CHAR(ABS(VLRFAT)-ABS(VLRIMP)-ABS(VLRCMV), '999G999G999G999D99')  AS VLRMCN,
TO_CHAR(ABS(VLRFAT_MA)-ABS(VLRIMP_MA)-ABS(VLRCMV_MA), '999G999G999G999D99')  AS VLRMCN_MA,
ROUND((((ABS(VLRFAT)-ABS(VLRIMP)-ABS(VLRCMV)) / (ABS(VLRFAT_MA)-ABS(VLRIMP_MA)-ABS(VLRCMV_MA)))-1)*100,2) AS VAR_VLRMCN,

TO_CHAR((ABS(VLRFAT)-ABS(VLRIMP)-ABS(VLRCMV))/ABS(VLRFAT)*100, '999G999G999G999D99')  AS VLRMCD,
TO_CHAR((ABS(VLRFAT_MA)-ABS(VLRIMP_MA)-ABS(VLRCMV_MA))/ABS(VLRFAT_MA)*100, '999G999G999G999D99')  AS VLRMCD_MA,
ROUND(((((ABS(VLRFAT)-ABS(VLRIMP)-ABS(VLRCMV))/ABS(VLRFAT)) / 	((ABS(VLRFAT_MA)-ABS(VLRIMP_MA)-ABS(VLRCMV_MA))/ABS(VLRFAT_MA)) )-1)*100,2) AS VAR_VLRMCD,

TO_CHAR(ABS(VLRDO), '999G999G999G999D99') AS VLRDO,
TO_CHAR(ABS(VLRDO_MA), '999G999G999G999D99') AS VLRDO_MA,
ROUND(ABS(((VLRDO/VLRDO_MA))-1)*100, 2) AS VAR_VLRDO,
TO_CHAR(ABS(VLRINV), '999G999G999G999D99') AS VLRINV,
TO_CHAR(ABS(VLRINV_MA), '999G999G999G999D99') AS VLRINV_MA,
ROUND(ABS(((VLRINV/VLRINV_MA)-1)*100), 2) AS VAR_VLRINV,


TO_CHAR(ABS(VLRFAT)-ABS(VLRIMP)-ABS(VLRCMV)-ABS(VLRDO)-ABS(VLRINV), '999G999G999G999D99')  AS VLRRES,
TO_CHAR((ABS(VLRFAT_MA)-ABS(VLRIMP_MA)-ABS(VLRCMV_MA)-ABS(VLRDO_MA)-ABS(VLRINV_MA)), '999G999G999G999D99') AS VLRRES_MA,
ROUND((((ABS(VLRFAT)-ABS(VLRIMP)-ABS(VLRCMV)-ABS(VLRDO)-ABS(VLRINV)) / (ABS(VLRFAT_MA)-ABS(VLRIMP_MA)-ABS(VLRCMV_MA)-ABS(VLRDO_MA)-ABS(VLRINV_MA)))-1)*100,2) AS VAR_VLRRES

FROM
(
WITH MA AS(
SELECT
1 AS COD
, ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL_MA 
, ROUND(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST), 2) AS VLRFAT_MA
, ROUND(SUM(ITE.VLRDESC), 2) AS VLRDESC_MA
, ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC)END), 2) AS VLRDEVOL_MA
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
WHERE TOP.GOLSINAL = -1
AND DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S'
),
DO AS ( /*DESPESA OPERACIONA*/
SELECT 1 AS COD, ROUND(SUM(VLRBAIXA),2) * -1 AS VLRDO
FROM VGF_RESULTADO_GM
WHERE AD_TIPOCUSTO NOT LIKE 'N' AND CODCENCUS NOT BETWEEN 2500000 AND 2599999  AND RECDESP = -1 AND SUBSTR(codnat, 1, 1) <> '9'
AND DHBAIXA IS NOT NULL AND (DHBAIXA BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
),
DO_MA AS ( /*DESPESA OPERACIONA - MES ANTERIOR*/
SELECT 1 AS COD, ROUND(SUM(VLRBAIXA),2) AS VLRDO_MA
FROM VGF_RESULTADO_GM
WHERE AD_TIPOCUSTO NOT LIKE 'N' AND CODCENCUS NOT BETWEEN 2500000 AND 2599999 AND RECDESP = -1 AND SUBSTR(codnat, 1, 1) <> '9'
AND DHBAIXA BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
),
INV AS ( /*INVESTIMENTO*/
SELECT 1 AS COD, ROUND(SUM(VLRBAIXA),2) AS VLRINV
FROM VGF_RESULTADO_GM
WHERE AD_TIPOCUSTO LIKE 'N' AND CODCENCUS NOT BETWEEN 2500000 AND 2599999 AND RECDESP = -1
AND DHBAIXA IS NOT NULL AND (DHBAIXA BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
),
INV_MA AS ( /*INVESTIMENTO - MES ANTERIOR*/
SELECT 1 AS COD, ROUND(SUM(VLRBAIXA),2) AS VLRINV_MA
FROM VGF_RESULTADO_GM
WHERE AD_TIPOCUSTO LIKE 'N' AND CODCENCUS NOT BETWEEN 2500000 AND 2599999 AND RECDESP = -1
AND DHBAIXA BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
),
IMP AS (
SELECT 
1 AS COD,
SNK_IMPOSTOS_GM(:P_PERIODO.INI,:P_PERIODO.FIN) AS VLRIMP
FROM DUAL
),
IMP_MA AS (
SELECT 
1 AS COD,
SNK_IMPOSTOS_GM(ADD_MONTHS(:P_PERIODO.INI, -1), ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI) ) AS VLRIMP_MA
FROM DUAL
),
CMV AS (
SELECT 
1 AS COD,
NVL(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (CUS.CUSSEMICM * ITE.QTDNEG)*-1 ELSE (CUS.CUSSEMICM * ITE.QTDNEG) END),0) AS VLRCMV
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(DTATUAL)FROM TGFCUS WHERE DTATUAL <= CAB.DTNEG AND CODPROD = ITE.CODPROD AND CODEMP = CAB.CODEMP)
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
WHERE TOP.GOLSINAL = -1 AND TOP.TIPMOV IN ('V', 'D') AND TOP.ATIVO = 'S'
AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
),
CMV_MA AS (
SELECT 
1 AS COD,
NVL(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (CUS.CUSSEMICM * ITE.QTDNEG)*-1 ELSE (CUS.CUSSEMICM * ITE.QTDNEG) END),0) AS VLRCMV_MA
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(DTATUAL)FROM TGFCUS WHERE DTATUAL <= CAB.DTNEG AND CODPROD = ITE.CODPROD AND CODEMP = CAB.CODEMP)
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
WHERE TOP.GOLSINAL = -1 AND TOP.TIPMOV IN ('V', 'D') AND TOP.ATIVO = 'S'
AND DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
)






SELECT
HL,VLRFAT,VLRDESC,VLRDEVOL,HL_MA,VLRFAT_MA,VLRDESC_MA,VLRDEVOL_MA,VLRDO,VLRDO_MA,VLRINV,VLRINV_MA,VLRIMP,VLRIMP_MA,VLRCMV,VLRCMV_MA
FROM(
SELECT
1 AS COD
, ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL 
, ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
, ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN ITE.VLRDESC*-1 ELSE ITE.VLRDESC END), 2) AS VLRDESC
, ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC)END), 2) AS VLRDEVOL
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
WHERE TOP.GOLSINAL = -1
AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S') BAS
INNER JOIN MA ON BAS.COD = MA.COD
INNER JOIN DO ON BAS.COD = DO.COD
INNER JOIN DO_MA ON BAS.COD = DO_MA.COD
INNER JOIN INV ON BAS.COD = INV.COD
INNER JOIN INV_MA ON BAS.COD = INV_MA.COD
INNER JOIN IMP ON BAS.COD = IMP.COD
INNER JOIN IMP_MA ON BAS.COD = IMP_MA.COD
INNER JOIN CMV ON BAS.COD = CMV.COD
INNER JOIN CMV_MA ON BAS.COD = CMV_MA.COD
)

</snk:query>   



<c:forEach items="${dias.rows}" var="row">    
<div class="container-fluid">

    <!-- Parte Superior - 6 Cards -->
    <div class="row custom-row">
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla o Total dos Produtos + IPI + ST - Desconto - Devoluções">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                     <h1>${row.VLRFAT} <span id="arrow${row.VAR_VLRFAT}"></span></h1>
						<script>
							document.getElementById("arrow${row.VAR_VLRFAT}").innerHTML = addArrow(${row.VAR_VLRFAT});
						</script>
                    <p>Faturamento</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRFAT_MA} <b>Var.%:</b> ${row.VAR_VLRFAT} 					
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRDEVOL}  <span id="arrow${row.VAR_VLRDEVOL}"></span></h1>
						<script>
							document.getElementById("arrow${row.VAR_VLRDEVOL}").innerHTML = addArrow(${row.VAR_VLRDEVOL});
						</script>
                    <p>Devolução</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRDEVOL_MA}  <b>Var.%:</b> ${row.VAR_VLRDEVOL} 
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla o ICMS + ST + IPI + PIS + COFINS + FEM*** ">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRIMP} <span id="arrow${row.VAR_VLRIMP}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_VLRIMP}").innerHTML = addArrow(${row.VAR_VLRIMP});
                    </script>                    
                    <p>Impostos</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRIMP_MA}  <b>Var.%:</b> ${row.VAR_VLRIMP}
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRCMV} <span id="arrow${row.VAR_VLRCMV}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_VLRCMV}").innerHTML = addArrow(${row.VAR_VLRCMV});
                    </script>
                    <p>CMV</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRCMV_MA}  <b>Var.%:</b> ${row.VAR_VLRCMV}
                </div>
            </div>
        </div>        
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"></path></svg>
                    </div>
                    <h1>${row.HL} <span id="arrow${row.VAR_HL}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_HL}").innerHTML = addArrow(${row.VAR_HL});
                    </script>
                    <p>HL</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.HL_MA} <b>Var.%:</b> ${row.VAR_HL} 
                </div>
            </div>
        </div>
        
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRDESC} <span id="arrow${row.VAR_VLRDESC}"></span></h1>
						<script>
							document.getElementById("arrow${row.VAR_VLRDESC}").innerHTML = addArrow(${row.VAR_VLRDESC});
						</script>
                    <p>Desconto</p>
                </div>
                <div class="card-footer text-muted">
					<b>Per. Ant.:</b> ${row.VLRDESC_MA} <b>Var.%:</b> ${row.VAR_VLRDESC}
                </div>
            </div>
        </div>
    </div>

    <!-- Parte do Meio 1 - 2 Cards -->
    <div class="row custom-row">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla Faturamento - Impostos - CMV ">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21.19 7h2.81v15h-21v-5h-2.81v-15h21v5zm1.81 1h-19v13h19v-13zm-9.5 1c3.036 0 5.5 2.464 5.5 5.5s-2.464 5.5-5.5 5.5-5.5-2.464-5.5-5.5 2.464-5.5 5.5-5.5zm0 1c2.484 0 4.5 2.016 4.5 4.5s-2.016 4.5-4.5 4.5-4.5-2.016-4.5-4.5 2.016-4.5 4.5-4.5zm.5 8h-1v-.804c-.767-.16-1.478-.689-1.478-1.704h1.022c0 .591.326.886.978.886.817 0 1.327-.915-.167-1.439-.768-.27-1.68-.676-1.68-1.693 0-.796.573-1.297 1.325-1.448v-.798h1v.806c.704.161 1.313.673 1.313 1.598h-1.018c0-.788-.727-.776-.815-.776-.55 0-.787.291-.787.622 0 .247.134.497.957.768 1.056.344 1.663.845 1.663 1.746 0 .651-.376 1.288-1.313 1.448v.788zm6.19-11v-4h-19v13h1.81v-9h17.19z"/></svg>
                    </div>
                    <h1>${row.VLRMCN} <span id="arrow${row.VAR_VLRMCN}"></span></h1>
						<script>
							document.getElementById("arrow${row.VAR_VLRMCN}").innerHTML = addArrow(${row.VAR_VLRMCN});
						</script>
                    <p>Margem de Contribuição Nominal</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRMCN_MA} <b>Var.%:</b> ${row.VAR_VLRMCN}
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla (Faturamento - Impostos - CMV) / Faturamento ">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21.19 7h2.81v15h-21v-5h-2.81v-15h21v5zm1.81 1h-19v13h19v-13zm-9.5 1c3.036 0 5.5 2.464 5.5 5.5s-2.464 5.5-5.5 5.5-5.5-2.464-5.5-5.5 2.464-5.5 5.5-5.5zm0 1c2.484 0 4.5 2.016 4.5 4.5s-2.016 4.5-4.5 4.5-4.5-2.016-4.5-4.5 2.016-4.5 4.5-4.5zm.5 8h-1v-.804c-.767-.16-1.478-.689-1.478-1.704h1.022c0 .591.326.886.978.886.817 0 1.327-.915-.167-1.439-.768-.27-1.68-.676-1.68-1.693 0-.796.573-1.297 1.325-1.448v-.798h1v.806c.704.161 1.313.673 1.313 1.598h-1.018c0-.788-.727-.776-.815-.776-.55 0-.787.291-.787.622 0 .247.134.497.957.768 1.056.344 1.663.845 1.663 1.746 0 .651-.376 1.288-1.313 1.448v.788zm6.19-11v-4h-19v13h1.81v-9h17.19z"/></svg>
                    </div>
                    <h1>${row.VLRMCD} <span id="arrow${row.VAR_VLRMCD}"></span></h1>
						<script>
							document.getElementById("arrow${row.VAR_VLRMCD}").innerHTML = addArrow(${row.VAR_VLRMCD});
						</script>
                    <p>Margem de Contribuição %</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRMCD_MA} <b>Var.%:</b> ${row.VAR_VLRMCD}
                </div>
            </div>
        </div>
    </div>    

    <!-- Parte do Meio 2 - 2 Cards -->
    <div class="row mt-2">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRDO} <span id="arrow${row.VAR_VLRDO}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_VLRDO}").innerHTML = addArrow(${row.VAR_VLRDO});
                    </script>
                    <p>Despesa Operacional</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b> ${row.VLRDO_MA} <b>Var.%:</b> ${row.VAR_VLRDO}
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRINV}<span id="arrow${row.VAR_VLRINV}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_VLRINV}").innerHTML = addArrow(${row.VAR_VLRINV});
                    </script>
                    <p>Investimento</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b>${row.VLRINV_MA} <b>Var.%: ${row.VAR_VLRINV}</b>
                </div>
            </div>
        </div>
    </div>

    <!-- Parte Inferior - Somente Card -->
    <div class="row parte-inferior">
        <div class="col-lg-12 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla = Faturamento - Impostos - CMV - Despesa Operacional - Investimento ">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8.502 5c-.257-1.675.04-3.562 1.229-5h7.259c-.522.736-1.768 2.175-1.391 5h-1.154c-.147-1.336.066-2.853.562-4h-4.725c-.666 1.003-.891 2.785-.657 4h-1.123zm10.498-1v20h-14v-20h2.374v.675c0 .732.583 1.325 1.302 1.325h6.647c.721 0 1.304-.593 1.304-1.325v-.675h2.373zm-9 17h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm3 4h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm3 4h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm-6-2h-2v1h2v-1zm3 0h-2v1h2v-1zm3 0h-2v1h2v-1zm1-7h-10v5h10v-5z"/></svg>
                    </div>
                    <h1>${row.VLRRES}<span id="arrow${row.VAR_VLRRES}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_VLRRES}").innerHTML = addArrow(${row.VAR_VLRRES});
                    </script>
                    <p>Resultado</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per. Ant.:</b>${row.VLRRES_MA} <b>Var.%:</b>${row.VAR_VLRRES}
                </div>
            </div>
        </div>
    </div>
</div>
</c:forEach>

<footer class="footer">
    <img src="https://raw.githubusercontent.com/dfmoura/test_several1/39b227f7dce131ffe7867a50bd085336576b8955/oracle/1/0052_Rentabilidade_html/a_agu.svg" alt="Logo A AGU" class="logo-footer">
    <img src="https://raw.githubusercontent.com/dfmoura/test_several1/39b227f7dce131ffe7867a50bd085336576b8955/oracle/1/0052_Rentabilidade_html/a_ref.svg" alt="Logo A REF" class="logo-footer">
    <img src="https://raw.githubusercontent.com/dfmoura/test_several1/39b227f7dce131ffe7867a50bd085336576b8955/oracle/1/0052_Rentabilidade_html/a_zap.svg" alt="Logo A ZAP" class="logo-footer">
</footer>

<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
