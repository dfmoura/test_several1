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
        font-size: 23px; /* Ajusta o tamanho da fonte de <h1> */
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


    function abrir_fat(){
        var params = '';
        var level = 'lvl_ax6oqih';
        openLevel(level, params);
    }


    function abrir_dev(){
        var params = '';
        var level = 'lvl_a7wgptl';
        openLevel(level, params);
    }


    function abrir_imp(){
        var params = '';
        var level = 'lvl_a7wgpuw';
        openLevel(level, params);
    }

    function abrir_cmv(){
        var params = '';
        var level = 'lvl_a73fhf9';
        openLevel(level, params);
    }

    function abrir_hl(){
        var params = '';
        var level = 'lvl_a73fhg8';
        openLevel(level, params);
    }

    function abrir_desc(){
        var params = '';
        var level = 'lvl_a73fhia';
        openLevel(level, params);
    }

    function abrir_mar(){
        var params = '';
        var level = 'lvl_a73fhjs';
        openLevel(level, params);
    }    

    function abrir_mar_perc(){
        var params = '';
        var level = 'lvl_adcdpv5';
        openLevel(level, params);
    }    

    

    function abrir_do(){
        var params = '';
        var level = 'lvl_a73fhk0';
        openLevel(level, params);
    }
    
    function abrir_inv(){
        var params = '';
        var level = 'lvl_a73fho0';
        openLevel(level, params);
    }    

    function abrir_res(){
        var params = '';
        var level = 'lvl_a73fhxg';
        openLevel(level, params);
    }  

</script>


</head>

<body class="bg-light">
    <header>
        <h1 class="titulo-header">Rentabilidade Financeira 2.0</h1>
    </header>


<snk:query var="dias">  
    
SELECT
TO_CHAR(ROUND(VLRFAT, 2), 'FM999G999G999D00') AS VLRFAT,
TO_CHAR(ROUND(VLRFAT_MA, 2), 'FM999G999G999D00') AS VLRFAT_MA,
TO_CHAR(ROUND(VAR_VLRFAT, 2), 'FM999G999G999D00') AS VAR_VLRFAT,
TO_CHAR(ROUND(VLRDEVOL, 2), 'FM999G999G999D00') AS VLRDEVOL,
TO_CHAR(ROUND(VLRDEVOL_MA, 2), 'FM999G999G999D00') AS VLRDEVOL_MA,
TO_CHAR(ROUND(VAR_VLRDEVOL, 2), 'FM999G999G999D00') AS VAR_VLRDEVOL,
TO_CHAR(ROUND(VLRIMP, 2), 'FM999G999G999D00') AS VLRIMP,
TO_CHAR(ROUND(VLRIMP_MA, 2), 'FM999G999G999D00') AS VLRIMP_MA,
TO_CHAR(ROUND(VAR_VLRIMP, 2), 'FM999G999G999D00') AS VAR_VLRIMP,
TO_CHAR(ROUND(VLRCMV, 2), 'FM999G999G999D00') AS VLRCMV,
TO_CHAR(ROUND(VLRCMV_MA, 2), 'FM999G999G999D00') AS VLRCMV_MA,
TO_CHAR(ROUND(VAR_VLRCMV, 2), 'FM999G999G999D00') AS VAR_VLRCMV,
TO_CHAR(ROUND(HL, 2), 'FM999G999G999D00') AS HL,
TO_CHAR(ROUND(HL_MA, 2), 'FM999G999G999D00') AS HL_MA,
TO_CHAR(ROUND(VAR_HL, 2), 'FM999G999G999D00') AS VAR_HL,
TO_CHAR(ROUND(VLRDESC, 2), 'FM999G999G999D00') AS VLRDESC,
TO_CHAR(ROUND(VLRDESC_MA, 2), 'FM999G999G999D00') AS VLRDESC_MA,
TO_CHAR(ROUND(VAR_VLRDESC, 2), 'FM999G999G999D00') AS VAR_VLRDESC,
TO_CHAR(ROUND(VLRMCN, 2), 'FM999G999G999D00') AS VLRMCN,
TO_CHAR(ROUND(VLRMCN_MA, 2), 'FM999G999G999D00') AS VLRMCN_MA,
TO_CHAR(ROUND(VAR_VLRMCN, 2), 'FM999G999G999D00') AS VAR_VLRMCN,
TO_CHAR(ROUND(VLRMCD, 2), 'FM999G999G999D00') AS VLRMCD,
TO_CHAR(ROUND(VLRMCD_MA, 2), 'FM999G999G999D00') AS VLRMCD_MA,
TO_CHAR(ROUND(VAR_VLRMCD, 2), 'FM999G999G999D00') AS VAR_VLRMCD,
TO_CHAR(ROUND(VLRDO, 2), 'FM999G999G999D00') AS VLRDO,
TO_CHAR(ROUND(VLRDO_MA, 2), 'FM999G999G999D00') AS VLRDO_MA,
TO_CHAR(ROUND(VAR_VLRDO, 2), 'FM999G999G999D00') AS VAR_VLRDO,
TO_CHAR(ROUND(VLRINV, 2), 'FM999G999G999D00') AS VLRINV,
TO_CHAR(ROUND(VLRINV_MA, 2), 'FM999G999G999D00') AS VLRINV_MA,
TO_CHAR(ROUND(VAR_VLRINV, 2), 'FM999G999G999D00') AS VAR_VLRINV,
TO_CHAR(ROUND(VLRRES, 2), 'FM999G999G999D00') AS VLRRES,
TO_CHAR(ROUND(VLRRES_MA, 2), 'FM999G999G999D00') AS VLRRES_MA,
TO_CHAR(NVL(ROUND(((VLRRES - VLRRES_MA) / NULLIF(VLRRES_MA, 0)) * 100, 2), 0), 'FM999G999G999D00') AS VAR_VLRRES


FROM
(
WITH
DO AS ( /*DESPESA OPERACIONA*/
SELECT 1 AS COD, NVL(ROUND(SUM(VLRBAIXA),2),0) * -1 AS VLRDO
FROM VGF_RESULTADO_GM
WHERE 
AD_TIPOCUSTO NOT LIKE 'N' 
AND RECDESP = -1 
AND (AD_DASH_RENTABILIDADE IS NULL OR AD_DASH_RENTABILIDADE = 'N')
AND CODNAT <> 9070000
AND SUBSTR(codnat, 1, 1) <> '9'
AND ANALITICO = 'S'
AND ATIVO = 'S'
AND DHBAIXA IS NOT NULL 
AND CODEMP IN (:P_EMPRESA) 
AND CODNAT IN (:P_NATUREZA) 
AND CODCENCUS IN (:P_CR)
AND (DHBAIXA BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN) 
),
DO_MA AS ( /*DESPESA OPERACIONA - MES ANTERIOR*/
SELECT 1 AS COD, NVL(ROUND(SUM(VLRBAIXA),2),0) AS VLRDO_MA
FROM VGF_RESULTADO_GM
WHERE 
AD_TIPOCUSTO NOT LIKE 'N' 
AND RECDESP = -1 
AND (AD_DASH_RENTABILIDADE IS NULL OR AD_DASH_RENTABILIDADE = 'N')
AND CODNAT <> 9070000
AND SUBSTR(codnat, 1, 1) <> '9'
AND ANALITICO = 'S'
AND ATIVO = 'S'
AND DHBAIXA IS NOT NULL 
AND DHBAIXA BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI)) 
AND CODEMP IN (:P_EMPRESA)  
AND CODNAT IN (:P_NATUREZA) 
AND CODCENCUS IN (:P_CR)
),
INV AS ( /*INVESTIMENTO*/

SELECT 1 AS COD, NVL(ROUND(SUM(BAIXADO),2),0) AS VLRINV
FROM (
SELECT PROJ.CODPROJ, PROJ.IDENTIFICACAO,
SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND (META.DTREF >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (META.DTREF <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL))) AS META,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		
	  	AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
	  	AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS REALIZADO,
		
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		
	  	AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
	  	AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS EM_ABERTO,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		
	  	AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
	  	AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NOT NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS BAIXADO,		
(((SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND (META.DTREF >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (META.DTREF <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL))))
-
(((SELECT DISTINCT SUM(VLRDESDOB)
FROM TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
WHERE SCFIN.CODPROJ = SCPROJ.CODPROJ
AND SCPROJ.CODPROJ = PROJ.CODPROJ

AND (SCFIN.DTENTSAI >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (SCFIN.DTENTSAI <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL)
AND SCFIN.RECDESP NOT IN (1,0)
AND SCFIN.CODPROJ <> 0
AND SCFIN.ORIGEM IN ('F','E')
AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
AND SCFIN.DHTIPOPER = SCTOP.DHALTER
AND SCTOP.TIPMOV IN ('C','I','G')))))/
(SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND (META.DTREF >= :P_PERIODO.INI OR :P_PERIODO.INI IS NULL)
AND (META.DTREF <= :P_PERIODO.FIN OR :P_PERIODO.FIN IS NULL))))*100) AS PORCENTAGEM,
PROJ.CODPROJPAI,
(SELECT IDENTIFICACAO FROM TCSPRJ PR WHERE PR.CODPROJ = PROJ.CODPROJPAI) AS PROJETO_PAI
FROM TCSPRJ PROJ
WHERE PROJ.CODPROJ <> 0
GROUP BY CODPROJ, IDENTIFICACAO, CODPROJPAI
)


),
INV_MA AS ( /*INVESTIMENTO - MES ANTERIOR*/

SELECT 1 AS COD, NVL(ROUND(SUM(BAIXADO),2),0) AS VLRINV_MA
FROM (
SELECT PROJ.CODPROJ, PROJ.IDENTIFICACAO,
SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND META.DTREF BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))))
AS META,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		
        AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS REALIZADO,
		
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		
        AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS EM_ABERTO,
((SELECT
		DISTINCT SUM(VLRDESDOB)
	FROM
		TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
	WHERE
		SCFIN.CODPROJ = SCPROJ.CODPROJ
		AND SCPROJ.CODPROJ = PROJ.CODPROJ
		
        AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
		AND SCFIN.RECDESP NOT IN (1,0)
		AND SCFIN.CODPROJ <> 0
		AND SCFIN.ORIGEM IN ('F','E')
		AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
		AND SCFIN.DHTIPOPER = SCTOP.DHALTER
		AND SCFIN.DHBAIXA IS NOT NULL
        AND SCTOP.TIPMOV IN ('C','I','G'))) AS BAIXADO,		
(((SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND META.DTREF BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
)))
-
(((SELECT DISTINCT SUM(VLRDESDOB)
FROM TGFFIN SCFIN, TCSPRJ SCPROJ, TGFTOP SCTOP
WHERE SCFIN.CODPROJ = SCPROJ.CODPROJ
AND SCPROJ.CODPROJ = PROJ.CODPROJ
AND SCFIN.DTENTSAI BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
AND SCFIN.RECDESP NOT IN (1,0)
AND SCFIN.CODPROJ <> 0
AND SCFIN.ORIGEM IN ('F','E')
AND SCFIN.CODTIPOPER = SCTOP.CODTIPOPER
AND SCFIN.DHTIPOPER = SCTOP.DHALTER
AND SCTOP.TIPMOV IN ('C','I','G')))))/
(SUM((SELECT SUM(META.PREVREC) FROM TGMMET META, TCSPRJ PRO
WHERE META.CODPROJ <> 0
AND PRO.CODPROJ = META.CODPROJ
AND PRO.CODPROJ = PROJ.CODPROJ
AND (META.CODMETA = :P_META)
AND META.DTREF BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI))
)))*100) AS PORCENTAGEM,
PROJ.CODPROJPAI,
(SELECT IDENTIFICACAO FROM TCSPRJ PR WHERE PR.CODPROJ = PROJ.CODPROJPAI) AS PROJETO_PAI
FROM TCSPRJ PROJ
WHERE PROJ.CODPROJ <> 0
GROUP BY CODPROJ, IDENTIFICACAO, CODPROJPAI
)




),
BAS_MA AS (

SELECT 
1 AS COD,
SUM(TOTALLIQ) VLRFAT_MA,
SUM(VLRDEV) VLRDEVOL_MA,
SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) VLRIMP_MA,
SUM(CUSMEDSICM_TOT) VLRCMV_MA,
SUM(HL) HL_MA,
SUM(VLRDESC) VLRDESC_MA,
SUM(MARGEMNON) VLRMCN_MA,
AVG(PERCMARGEM) VLRMCD_MA
FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
WHERE GOLSINAL = -1
AND DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, -1) AND (ADD_MONTHS(:P_PERIODO.INI, -1) + (:P_PERIODO.FIN - :P_PERIODO.INI)) 
AND TIPMOV IN ('V', 'D')
AND VGF.ATIVO = 'S'
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA)
AND CODTIPOPER IN (:P_TOP)

),
BAS AS (

SELECT 
1 AS COD,
SUM(TOTALLIQ) VLRFAT,
SUM(VLRDEV) VLRDEVOL,
SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) VLRIMP,
SUM(CUSMEDSICM_TOT) VLRCMV,
SUM(HL) HL,
SUM(VLRDESC) VLRDESC,
SUM(MARGEMNON) VLRMCN,
AVG(PERCMARGEM) VLRMCD
FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V','D')
AND VGF.ATIVO = 'S' 
AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
AND (
(:P_MATRIZ_RVE = 'S')
OR 
(:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
)
AND VGF.CODEMP IN (:P_EMPRESA)
AND VGF.CODNAT IN (:P_NATUREZA)
AND VGF.CODCENCUS IN (:P_CR)
AND VGF.CODVEND IN (:P_VENDEDOR)
AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
AND VGF.CODGER IN (:P_GERENTE)
AND VGF.AD_ROTA IN (:P_ROTA)
AND VGF.CODTIPOPER IN (:P_TOP)
)
SELECT 
VLRFAT,VLRFAT_MA,
NVL(ROUND(((VLRFAT - VLRFAT_MA) / NULLIF(VLRFAT_MA,0)) * 100,2),0) AS VAR_VLRFAT,
VLRDEVOL,VLRDEVOL_MA,
NVL(ROUND(((VLRDEVOL - VLRDEVOL_MA) / NULLIF(VLRDEVOL_MA, 0)) * 100, 2), 0) AS VAR_VLRDEVOL,
VLRIMP,VLRIMP_MA,
NVL(ROUND(((VLRIMP - VLRIMP_MA) / NULLIF(VLRIMP_MA, 0)) * 100, 2), 0) AS VAR_VLRIMP,
VLRCMV,VLRCMV_MA,
NVL(ROUND(((VLRCMV - VLRCMV_MA) / NULLIF(VLRCMV_MA, 0)) * 100, 2), 0) AS VAR_VLRCMV,
HL,HL_MA,
NVL(ROUND(((HL - HL_MA) / NULLIF(HL_MA, 0)) * 100, 2), 0) AS VAR_HL,
VLRDESC,VLRDESC_MA,
NVL(ROUND(((VLRDESC - VLRDESC_MA) / NULLIF(VLRDESC_MA, 0)) * 100, 2), 0) AS VAR_VLRDESC,
VLRMCN,VLRMCN_MA,
NVL(ROUND(((VLRMCN - VLRMCN_MA) / NULLIF(VLRMCN_MA, 0)) * 100, 2), 0) AS VAR_VLRMCN,
VLRMCD,VLRMCD_MA,
NVL(ROUND(((VLRMCD - VLRMCD_MA) / NULLIF(VLRMCD_MA, 0)) * 100, 2), 0) AS VAR_VLRMCD,
VLRDO,VLRDO_MA,
NVL(ROUND(((VLRDO - VLRDO_MA) / NULLIF(VLRDO_MA, 0)) * 100, 2), 0) AS VAR_VLRDO,
VLRINV,VLRINV_MA,
NVL(ROUND(((VLRINV - VLRINV_MA) / NULLIF(VLRINV_MA, 0)) * 100, 2), 0) AS VAR_VLRINV,
VLRFAT-VLRDO-VLRINV AS VLRRES,
VLRFAT_MA-VLRDO_MA-VLRINV_MA AS VLRRES_MA
FROM BAS
INNER JOIN BAS_MA ON BAS.COD = BAS_MA.COD
INNER JOIN DO ON BAS.COD = DO.COD
INNER JOIN DO_MA ON BAS.COD = DO_MA.COD
INNER JOIN INV ON BAS.COD = INV.COD
INNER JOIN INV_MA ON BAS.COD = INV_MA.COD
)


</snk:query>   



<c:forEach items="${dias.rows}" var="row">    
<div class="container-fluid">

    <!-- Parte Superior - 6 Cards -->
    <div class="row custom-row">
        <div class="col-lg-2 col-md-4 mb-4" >
            <div class="card shadow-sm" title="Esta informação contempla o Total dos Produtos + IPI + ST - Desconto - Devoluções" onclick="abrir_fat()">
                <div class="card-body text-center" >
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                     <h1>${row.VLRFAT}  <span id="arrow${row.VAR_VLRFAT}"></span></h1>
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
            <div class="card shadow-sm" onclick="abrir_dev()">
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
            <div class="card shadow-sm" title="Esta informação contempla o ICMS + ST + IPI + PIS + COFINS + FEM*** " onclick="abrir_imp()">
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
            <div class="card shadow-sm" onclick="abrir_cmv()">
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
            <div class="card shadow-sm" onclick="abrir_hl()">
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
            <div class="card shadow-sm" onclick="abrir_desc()">
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
            <div class="card shadow-sm" title="Esta informação contempla Faturamento - Impostos - CMV " onclick="abrir_mar()">
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
            <div class="card shadow-sm" title="Esta informação contempla (Faturamento - Impostos - CMV) / Faturamento " onclick="abrir_mar_perc()">
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
            <div class="card shadow-sm" onclick="abrir_do()">
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
            <div class="card shadow-sm" onclick="abrir_inv()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>${row.VLRINV}<span id="arrow${row.VAR_VLRINV}"></span></h1>
                    <script>
                        document.getElementById("arrow${row.VAR_VLRINV}").innerHTML = addArrow(${row.VAR_VLRINV});
                    </script>
                    <p>Investimentos</p>
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
            <div class="card shadow-sm" title="Esta informação contempla = Faturamento - Impostos - CMV - Despesa Operacional - Investimento " onclick="abrir_res()">
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
    <img src="https://raw.githubusercontent.com/dfmoura/test_several1/main/oracle/1/0052_Rentabilidade_html/old/a_logo_b.png" alt="Logo A" class="logo-footer">
</footer>





<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
