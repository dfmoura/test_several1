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
            transition: transform 0.3s ease; /* Adicionado para transição suave */
        }
        .part:hover {
           transform: translateY(-10px); /* Movimento para cima ao passar o mouse */
        }
        .part-title {
            position: absolute;
            top: 10px; /* Espaçamento do topo */
            left: 50%;
            transform: translateX(-50%);
            font-size: 15px;
            font-weight: bold;
            color: #333;
            background-color: #fff; /* Cor de fundo para legibilidade */
            padding: 0 15px; /* Espaçamento horizontal */
            text-align: center; /* Centraliza o texto */
            width: 80%; /* Aumenta a largura do título */
        }
        .chart-container {
            position: relative; /* Para posicionamento absoluto do overlay */
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
            left: 65%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
        }
        .dropdown-container {
            display: flex;
            justify-content: flex-start; /* Alinha o dropdown à esquerda */
            width: 100%;
        }
        .dropdown-container select {
            padding: 5px; /* Reduz o espaçamento interno */
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 12px; /* Reduz o tamanho da fonte */
            width: 100%;
            max-width: 150px; /* Limita a largura máxima do dropdown */
            height: 25px; /* Ajusta a altura */
            box-sizing: border-box; /* Inclui padding e border no cálculo da largura/altura */
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
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
            font-size: 12px; /* Ajuste o tamanho da fonte conforme necessário */
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

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
</head>
<body>


    <snk:query var="motivo">
        WITH 
        ACF AS (
            SELECT DISTINCT
                ACF.NUNOTA,
                ACF.CODHIST,
                ACH.DESCRHIST
            FROM TGFACF ACF
            INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
            WHERE ACF.CODHIST > 0
        ),
        BAS AS (
            SELECT 
                CAB.CODEMP,
                EMP.NOMEFANTASIA,        
                CAB.CODPARC,
                PAR.RAZAOSOCIAL,
                UPPER(CID.NOMECID) AS NOMECID,
                BAI.NOMEBAI,
                CAB.CODTIPOPER,
                VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
                VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
                VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
                CAB.DTNEG,
                VAR.NUNOTA,
                VAR.NUNOTAORIG,
                CAB.TIPMOV AS TIPMOV,
                ITE.CODPROD,
                PRO.DESCRPROD,
                ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
                ACF.CODHIST,
                ACF.DESCRHIST
            FROM 
                TGFVAR VAR
                INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
                INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
                INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
                INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
                INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
                INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
                INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
                LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
                INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
                LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
                LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
            WHERE 
                CAB.TIPMOV IN ('D') 
                AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                AND TOP.GOLSINAL = -1
                AND TOP.ATIVO = 'S'
            ORDER BY 
                CAB.CODPARC,
                VAR.NUNOTA
        ),
        BAS2 AS (SELECT CODHIST,DESCRHIST,SUM(VLRDEVOL) as VLRDEVOL FROM BAS GROUP BY CODHIST,DESCRHIST ORDER BY 3 DESC),
        BAS3 AS (SELECT ROWNUM AS A, CODHIST,DESCRHIST, VLRDEVOL FROM BAS2)
        SELECT CODHIST,DESCRHIST,VLRDEVOL FROM BAS3 WHERE A < 8
        UNION ALL
        SELECT 9999 AS CODHIST,'OUTROS MOTIVOS' AS DESCRHIST, SUM(VLRDEVOL) AS VLRDEVOL FROM BAS3 WHERE A >= 8
        </snk:query>
        
        
        <snk:query var="tot_motivo">
            WITH 
            ACF AS (
                SELECT DISTINCT
                    ACF.NUNOTA,
                    ACF.CODHIST,
                    ACH.DESCRHIST
                FROM TGFACF ACF
                INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
                WHERE ACF.CODHIST > 0
            ),
            BAS AS (
                SELECT 
                    CAB.CODEMP,
                    EMP.NOMEFANTASIA,        
                    CAB.CODPARC,
                    PAR.RAZAOSOCIAL,
                    UPPER(CID.NOMECID) AS NOMECID,
                    BAI.NOMEBAI,
                    CAB.CODTIPOPER,
                    VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
                    VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
                    VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
                    CAB.DTNEG,
                    VAR.NUNOTA,
                    VAR.NUNOTAORIG,
                    CAB.TIPMOV AS TIPMOV,
                    ITE.CODPROD,
                    PRO.DESCRPROD,
                    ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
                    ACF.CODHIST,
                    ACF.DESCRHIST
                FROM 
                    TGFVAR VAR
                    INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
                    INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
                    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                    INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
                    INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
                    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
                    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
                    INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
                    LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
                    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
                    LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
                    LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
                WHERE 
                    CAB.TIPMOV IN ('D') 
                    AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND TOP.GOLSINAL = -1
                    AND TOP.ATIVO = 'S'
                ORDER BY 
                    CAB.CODPARC,
                    VAR.NUNOTA
            )
            SELECT SUM(VLRDEVOL) AS VLRDEVOL FROM BAS
        </snk:query>
        

    <snk:query var="cidade">  


    WITH 
    ACF AS (
        SELECT DISTINCT
            ACF.NUNOTA,
            ACF.CODHIST,
            ACH.DESCRHIST
        FROM TGFACF ACF
        INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
        WHERE ACF.CODHIST > 0
    ),
    BAS AS (
        SELECT 
            CAB.CODEMP,
            EMP.NOMEFANTASIA,        
            CAB.CODPARC,
            PAR.RAZAOSOCIAL,
            UPPER(CID.NOMECID) AS NOMECID,
            BAI.NOMEBAI,
            CAB.CODTIPOPER,
            VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
            VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
            VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
            CAB.DTNEG,
            VAR.NUNOTA,
            VAR.NUNOTAORIG,
            CAB.TIPMOV AS TIPMOV,
            ITE.CODPROD,
            PRO.DESCRPROD,
            ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
            ACF.CODHIST,
            ACF.DESCRHIST
        FROM 
            TGFVAR VAR
            INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
            INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
            INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
            INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
            INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
            LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
            LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
        WHERE 
            CAB.TIPMOV IN ('D') 
            AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND TOP.GOLSINAL = -1
            AND TOP.ATIVO = 'S'
        ORDER BY 
            CAB.CODPARC,
            VAR.NUNOTA
    ),
    BAS2 AS (SELECT CODHIST,DESCRHIST,SUM(VLRDEVOL) as VLRDEVOL FROM BAS GROUP BY CODHIST,DESCRHIST ORDER BY 3 DESC),
    BAS3 AS (SELECT ROWNUM AS A, CODHIST,DESCRHIST, VLRDEVOL FROM BAS2),
    BAS4 AS (SELECT CODHIST FROM BAS3 WHERE A < 8),
    BAS5 AS (SELECT 9999 AS CODHIST,'OUTROS MOTIVOS' AS DESCRHIST, SUM(VLRDEVOL) AS VLRDEVOL FROM BAS3 WHERE A >= 8)


    SELECT BAS.NOMECID FROM BAS
    LEFT JOIN BAS4 ON BAS.CODHIST = BAS4.CODHIST
    LEFT JOIN BAS5 ON BAS.CODHIST = BAS5.CODHIST
    WHERE 
    (BAS4.CODHIST = 24 AND :A_CODHIST IS NULL)
    OR    
    (
    ( BAS4.CODHIST = :A_CODHIST )
    OR
    (BAS.CODHIST NOT IN (SELECT CODHIST FROM BAS4) AND :A_CODHIST = 9999 )
    )
GROUP BY BAS.NOMECID
ORDER BY 1
    

    </snk:query>
    
    
    <snk:query var="bairro">      

    WITH 
    ACF AS (
        SELECT DISTINCT
            ACF.NUNOTA,
            ACF.CODHIST,
            ACH.DESCRHIST
        FROM TGFACF ACF
        INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
        WHERE ACF.CODHIST > 0
    ),
    BAS AS (
        SELECT 
            CAB.CODEMP,
            EMP.NOMEFANTASIA,        
            CAB.CODPARC,
            PAR.RAZAOSOCIAL,
            PAR.CODCID,
            UPPER(CID.NOMECID) AS NOMECID,
            PAR.CODBAI,
            BAI.NOMEBAI,
            CAB.CODTIPOPER,
            VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
            VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
            VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
            CAB.DTNEG,
            VAR.NUNOTA,
            VAR.NUNOTAORIG,
            CAB.TIPMOV AS TIPMOV,
            ITE.CODPROD,
            PRO.DESCRPROD,
            ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
            ACF.CODHIST,
            ACF.DESCRHIST
        FROM 
            TGFVAR VAR
            INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
            INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
            INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
            INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
            INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
            LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
            LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
        WHERE 
            CAB.TIPMOV IN ('D') 
            AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND TOP.GOLSINAL = -1
            AND TOP.ATIVO = 'S'
        ORDER BY 
            CAB.CODPARC,
            VAR.NUNOTA
    ),
    BAS2 AS (SELECT CODHIST,DESCRHIST,SUM(VLRDEVOL) as VLRDEVOL FROM BAS GROUP BY CODHIST,DESCRHIST ORDER BY 3 DESC),
    BAS3 AS (SELECT ROWNUM AS A, CODHIST,DESCRHIST, VLRDEVOL FROM BAS2),
    BAS4 AS (SELECT CODHIST FROM BAS3 WHERE A < 8),
    BAS5 AS (SELECT 9999 AS CODHIST,'OUTROS MOTIVOS' AS DESCRHIST, SUM(VLRDEVOL) AS VLRDEVOL FROM BAS3 WHERE A >= 8)


    SELECT 
    BAS.CODHIST,SUBSTR(BAS.DESCRHIST, 1, 20) DESCRHIST,
    BAS.CODCID,BAS.NOMECID,BAS.CODBAI,BAS.NOMEBAI,SUM(BAS.VLRDEVOL) VLRDEVOL 
    FROM BAS
    LEFT JOIN BAS4 ON BAS.CODHIST = BAS4.CODHIST
    LEFT JOIN BAS5 ON BAS.CODHIST = BAS5.CODHIST
    WHERE 
    (BAS4.CODHIST = 24 AND :A_CODHIST IS NULL)
    OR
    (
    ( BAS4.CODHIST = :A_CODHIST )
    OR
    (BAS.CODHIST NOT IN (SELECT CODHIST FROM BAS4) AND :A_CODHIST = 9999 )
    )
GROUP BY BAS.CODHIST,SUBSTR(BAS.DESCRHIST, 1, 20),
BAS.CODCID,BAS.NOMECID,BAS.CODBAI,BAS.NOMEBAI
ORDER BY 7 DESC
    </snk:query>     

    <snk:query var="vendedor">

    SELECT * FROM(
        WITH 
           ACF AS (
               SELECT DISTINCT
                   ACF.NUNOTA,
                   ACF.CODHIST,
                   ACH.DESCRHIST
               FROM TGFACF ACF
               INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
               WHERE ACF.CODHIST > 0
           ),
           BAS AS (
               SELECT 
                   CAB.CODEMP,
                   EMP.NOMEFANTASIA,        
                   CAB.CODPARC,
                   PAR.RAZAOSOCIAL,
                   UPPER(CID.NOMECID) AS NOMECID,
                   BAI.NOMEBAI,
                   CAB.CODTIPOPER,
                   VEN.CODVEND,
                   VEN.APELIDO AS VENDEDOR,
                   VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
                   VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
                   CAB.DTNEG,
                   VAR.NUNOTA,
                   VAR.NUNOTAORIG,
                   CAB.TIPMOV AS TIPMOV,
                   ITE.CODPROD,
                   PRO.DESCRPROD,
                   ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
                   ACF.CODHIST,
                   ACF.DESCRHIST
               FROM 
                   TGFVAR VAR
                   INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
                   INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
                   INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                   INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
                   INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
                   INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
                   INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
                   INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
                   LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
                   INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
                   LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
                   LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
               WHERE 
                   CAB.TIPMOV IN ('D') 
                   AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                   
                   AND CAB.CODEMP IN (:P_EMPRESA)
                   AND CAB.CODNAT IN (:P_NATUREZA)
                   AND CAB.CODCENCUS IN (:P_CR)
                   AND CAB.CODVEND IN (:P_VENDEDOR)
                   AND VEN.AD_ROTA IN (:P_ROTA)                    
                   AND TOP.GOLSINAL = -1
                   AND TOP.ATIVO = 'S'
                   
                   AND TOP.GOLSINAL = -1
                   AND TOP.ATIVO = 'S'
               ORDER BY 
                   CAB.CODPARC,
                   VAR.NUNOTA
           ),
           BAS2 AS (SELECT CODHIST,DESCRHIST,SUM(VLRDEVOL) as VLRDEVOL FROM BAS GROUP BY CODHIST,DESCRHIST ORDER BY 3 DESC),
           BAS3 AS (SELECT ROWNUM AS A, CODHIST,DESCRHIST, VLRDEVOL FROM BAS2),
           BAS4 AS (SELECT CODHIST FROM BAS3 WHERE A < 8),
           BAS5 AS (SELECT 9999 AS CODHIST,'OUTROS MOTIVOS' AS DESCRHIST, SUM(VLRDEVOL) AS VLRDEVOL FROM BAS3 WHERE A >= 8)
       
       
           SELECT 
           BAS.CODHIST,SUBSTR(BAS.DESCRHIST, 1, 20) DESCRHIST,
           BAS.CODVEND,BAS.VENDEDOR,SUM(BAS.VLRDEVOL) VLRDEVOL FROM BAS
           LEFT JOIN BAS4 ON BAS.CODHIST = BAS4.CODHIST
           LEFT JOIN BAS5 ON BAS.CODHIST = BAS5.CODHIST
           WHERE 
           (BAS4.CODHIST = 24 AND :A_CODHIST IS NULL)
           OR
           (
           ( BAS4.CODHIST = :A_CODHIST )
           OR
           (BAS.CODHIST NOT IN (SELECT CODHIST FROM BAS4) AND :A_CODHIST = 9999 )
           )
       GROUP BY BAS.CODHIST,SUBSTR(BAS.DESCRHIST, 1, 20),
       BAS.CODVEND,BAS.VENDEDOR
       ORDER BY 5 DESC)
       WHERE ROWNUM <= 10    

    </snk:query>



        <snk:query var="motivo_prod">


        
            WITH 
               ACF AS (
                   SELECT DISTINCT
                       ACF.NUNOTA,
                       ACF.CODHIST,
                       ACH.DESCRHIST
                   FROM TGFACF ACF
                   INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
                   WHERE ACF.CODHIST > 0
               ),
               BAS AS (
                   SELECT 
                       CAB.CODEMP,
                       EMP.NOMEFANTASIA,        
                       CAB.CODPARC,
                       PAR.RAZAOSOCIAL,
                       UPPER(CID.NOMECID) AS NOMECID,
                       BAI.NOMEBAI,
                       CAB.CODTIPOPER,
                       VEN.CODVEND,
                       VEN.APELIDO AS VENDEDOR,
                       VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
                       VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
                       CAB.DTNEG,
                       VAR.NUNOTA,
                       VAR.NUNOTAORIG,
                       CAB.TIPMOV AS TIPMOV,
                       ITE.CODPROD,
                       PRO.DESCRPROD,
                       ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
                       ACF.CODHIST,
                       ACF.DESCRHIST
                   FROM 
                       TGFVAR VAR
                       INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
                       INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
                       INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                       INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
                       INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
                       INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
                       INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
                       INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
                       LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
                       INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
                       LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
                       LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
                   WHERE 
                       CAB.TIPMOV IN ('D') 
                       AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                       
                       AND CAB.CODEMP IN (:P_EMPRESA)
                       AND CAB.CODNAT IN (:P_NATUREZA)
                       AND CAB.CODCENCUS IN (:P_CR)
                       AND CAB.CODVEND IN (:P_VENDEDOR)
                       AND VEN.AD_ROTA IN (:P_ROTA)                    
                       AND TOP.GOLSINAL = -1
                       AND TOP.ATIVO = 'S'
                       
                       
                       
                   ORDER BY 
                       CAB.CODPARC,
                       VAR.NUNOTA
               ),
               BAS2 AS (SELECT CODHIST,DESCRHIST,SUM(VLRDEVOL) as VLRDEVOL FROM BAS GROUP BY CODHIST,DESCRHIST ORDER BY 3 DESC),
               BAS3 AS (SELECT ROWNUM AS A, CODHIST,DESCRHIST, VLRDEVOL FROM BAS2),
               BAS4 AS (SELECT CODHIST FROM BAS3 WHERE A < 8),
               BAS5 AS (SELECT 9999 AS CODHIST,'OUTROS MOTIVOS' AS DESCRHIST, SUM(VLRDEVOL) AS VLRDEVOL FROM BAS3 WHERE A >= 8)
           
           
               SELECT 
               BAS.CODHIST,
               BAS.DESCRHIST,
               BAS.CODPROD,
               BAS.DESCRPROD,
               
               SUM(BAS.VLRDEVOL) VLRDEVOL 
               
               FROM BAS
               LEFT JOIN BAS4 ON BAS.CODHIST = BAS4.CODHIST
               LEFT JOIN BAS5 ON BAS.CODHIST = BAS5.CODHIST
               WHERE 
               (
               BAS4.CODHIST = 24 AND :A_CODHIST IS NULL)
               OR
               (
               ( BAS4.CODHIST = :A_CODHIST )
               OR
               (BAS.CODHIST NOT IN (SELECT CODHIST FROM BAS4) AND :A_CODHIST = 9999 )
               )
           GROUP BY BAS.CODHIST,BAS.DESCRHIST,
           BAS.CODPROD, BAS.DESCRPROD
           ORDER BY 1,3,5 DESC
           
                   

        </snk:query>

        


    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Devolução por Motivo</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${tot_motivo.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRDEVOL}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <c:forEach items="${bairro.rows}" var="row">
                    <div class="part-title">Devoluções por Cidade e Bairro - ${row.DESCRHIST}</div>
                </c:forEach>
                <div class="dropdown-container">
                    <select id="citySelect">
                        <c:forEach items="${cidade.rows}" var="row">
                            <option value="${row.NOMECID}">${row.NOMECID}</option>
                        </c:forEach>
                    </select>
                </div>                
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <c:forEach items="${bairro.rows}" var="row">
                    <div class="part-title">Top 10 Dev. por Vendedor e por Motivo - ${row.DESCRHIST}</div>
                </c:forEach>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                
                    <div class="part-title">Devoluções por Produto e por Motivo</div>
                
                <div class="table-container">
                    <table id="table">
                        <thead>
                            <tr>
                                <th>Cód. Mot.</th>
                                <th>Motivo</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Total Líq.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach items="${motivo_prod.rows}" var="row">
                                <tr>
                                    <td>${row.CODHIST}</td>
                                    <td>${row.DESCRHIST}</td>
                                    <td onclick="abrir_det_prod('${row.CODHIST}','${row.CODPROD}')">${row.CODPROD}</td>
                                    <td>${row.DESCRPROD}</td>
                                    <td><fmt:formatNumber value="${row.VLRDEVOL}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + row.VLRDEVOL}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                            </tr>
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
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script>

        // Função para atualizar a query

            function ref_mot(motivo) {
            const params = {'A_CODHIST': motivo};
            refreshDetails('html5_a7wgptm', params); 
        }   


        // Função para abrir o novo nível

            function abrir_det_bai(motivo,cidade,bairro) {
            var params = {'A_MOTIVO': parseInt(motivo),
                        'A_CIDADE': parseInt(cidade),
                        'A_BAIRRO': parseInt(bairro)
            };
            var level = 'lvl_steru4';
            openLevel(level, params);
        }

        function abrir_det_ven(motivo,vendedor) {
            
            var params = {'A_MOTIVO': parseInt(motivo),
                        'A_VENDEDOR': parseInt(vendedor)
            };
            var level = 'lvl_ster09';
            openLevel(level, params);
        }

        function abrir_det_prod(motivo,produto) {
            
            var params = {'A_MOTIVO': parseInt(motivo),
                        'A_PRODUTO': parseInt(produto)
            };
            var level = 'lvl_ster5r';
            openLevel(level, params);
        }        

        // Dados para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var motivos = [];
        var valoresDevolucao = [];
        <c:forEach items="${motivo.rows}" var="row">
            motivos.push('${row.CODHIST} - ${row.DESCRHIST}');
            valoresDevolucao.push('${row.VLRDEVOL}');
        </c:forEach>

        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: motivos,
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: valoresDevolucao,
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
                cutout: '50%',
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                let percentage = ((value / total) * 100).toFixed(2);
                                let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                                return label + ': ' + formattedValue;
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }                    
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = motivos[index].split('-')[0];
                        //alert(label);
                        ref_mot(label);
                    }
                }   
            }
        });


        // Função para atualizar o gráfico de barras com base na cidade selecionada
        function updateBarChart(city) {
            var bairros = [];
            var valores = [];
            <c:forEach items="${bairro.rows}" var="row">
                if ('${row.NOMECID}' === city) {
                    
                    bairros.push("${row.CODHIST}-${row.CODCID}-${row.CODBAI}-${row.NOMEBAI}");
                    valores.push('${row.VLRDEVOL}');
                }
            </c:forEach>

            barChart.data.labels = bairros;
            barChart.data.datasets[0].data = valores;
            barChart.update();
        }

        // Criação do gráfico de barras
        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: [], // Inicialmente vazio
                datasets: [{
                    label: 'Devoluções',
                    data: [],
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
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = barChart.data.labels[index].split('-')[0];
                        var label1 = barChart.data.labels[index].split('-')[1];
                        var label2 = barChart.data.labels[index].split('-')[2];
                        abrir_det_bai(label,label1,label2);
                        //ref_fat1(label);
                    }
                } 
            }
        });        




        // Dados para o gráfico de barras verticais (direito)
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');

        const vendedorLabels = [
            <c:forEach items="${vendedor.rows}" var="row">
                "${row.CODHIST}-${row.CODVEND}-${row.VENDEDOR}",
            </c:forEach>              
        ];

        const vendedorData = [
            <c:forEach items="${vendedor.rows}" var="row">
                ${row.VLRDEVOL},
            </c:forEach>        
        ];


        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: vendedorLabels,
                datasets: [{
                    label: 'Devoluções',
                    data: vendedorData,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = vendedorLabels[index].split('-')[0];
                        const grupo1 = vendedorLabels[index].split('-')[1];
                        abrir_det_ven(grupo,grupo1);
                    }
                }
            }
        });

        // Listener para o dropdown
        $('#citySelect').on('change', function() {
            var selectedCity = $(this).val();
            updateBarChart(selectedCity);
        });

        // Inicializa o gráfico de barras com a primeira cidade
        $(document).ready(function() {
            var firstCity = $('#citySelect').val();
            updateBarChart(firstCity);
        });
        

    </script>
</body>
</html>
