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
    <title>Tabela com Filtros e Ordenação</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .table-wrapper {
            max-width: 1400px;
            margin: 20px auto;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #ddd;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-container {
            margin: 10px;
            text-align: center;
        }

        .table-container {
            overflow-y: auto;
            height: 550px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }

        th, td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
            white-space: nowrap;
            overflow: hidden; /* Esconde conteúdo extra */
            text-overflow: ellipsis; /* Adiciona "..." quando o conteúdo é muito longo */
            resize: horizontal; /* Permite o redimensionamento manual da coluna */
            max-width: 200px; /* Largura máxima da coluna (ajustável) */
        }

        /* Definindo colunas específicas para limite de 35 caracteres */
        th.parceiro, td.parceiro {
            max-width: 200px; /* Aproximadamente 35 caracteres dependendo da fonte */
        }

        th.movimento, td.movimento {
            max-width: 200px;
        }

        th.historicoOrigem, td.historicoOrigem {
            max-width: 200px;
        }

        th {
            cursor: pointer;
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
            resize: horizontal;
            overflow: auto;
        }

        th.sort-asc::after {
            content: " ▲";
        }

        th.sort-desc::after {
            content: " ▼";
        }

        tbody tr:hover {
           background-color: #f5f5f5; /* Cor de fundo ao passar o mouse */
            cursor: pointer; /* Muda o cursor para indicar interatividade */
        }        

        input[type="text"] {
            width: 100%;
            box-sizing: border-box;
            padding: 8px;
            font-size: 14px;
        }

        h2 {
            text-align: center;
            margin-bottom: 0;
            padding: 10px;
            background-color: #f8f8f8;
            border-bottom: 1px solid #ddd;
        }

        .total-row td {
            font-weight: bold;
        }

        .negative {
            color: blue;
        }

        .positive {
            color: red;
        }        
    </style>

<snk:load/>
</head>
<body>


<snk:query var="fat_det">



SELECT
CAB.CODEMP,
LAN.CODCTACTB,
PLA.CTACTB,
PLA.DESCRCTA,
CAB.NUNOTA AS NUMERO_UNICO, 
CAB.NUMNOTA AS NUMNOTA, 
TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(CAB.DTENTSAI,'DD-MM-YYYY') AS DTENTSAI,
NULL AS DHBAIXA,
CAB.CODPARC AS PARCEIRO,
PAR.NOMEPARC AS NOMEPARC,
CAB.CODTIPOPER AS OPERACAO,
TOP.DESCROPER AS DESCROPER,
CASE WHEN LAN.TIPLANC = 'D' THEN 'DEBITO' ELSE 'CREDITO' END AS TIPLANC,
LAN.NUMLOTE, 
LAN.NUMLANC, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
CAB.OBSERVACAO AS HISTORICOORIGEM,
LAN.COMPLHIST AS HISTORICOLAN,
'ORIGEM PORTAL' AS RECEITADESPESA,
CAB.CODNAT AS CODNATUREZA,
NAT.DESCRNAT AS NATUREZA,
CASE CAB.TIPMOV
WHEN 'C' THEN 'COMPRAS - PORTAL DE COMPRAS'
WHEN 'E' THEN 'DEV. COMPRAS - PORTAL DE COMPRAS'
WHEN 'V' THEN 'VENDA - PORTAL DE VENDAS'
WHEN 'D' THEN 'DEV. VENDA - PORTAL DE VENDAS'
WHEN 'Q' THEN 'REQUISICAO - PORTAL DE MOV. INTERNA'
WHEN 'L' THEN 'DEV. REQUISICAO - PORTAL DE MOV. INTERNA'
WHEN 'F' THEN 'PRODUÇÃO - MÓDULO DE PRODUÇÃO'
WHEN 'T' THEN 'TRANSFERENCIA'
ELSE 'ORIGEM NAO ESPERADA = '|| CAB.TIPMOV
END AS ORIGEM, 
CAB.TIPMOV AS MOVIMENTO,
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR



FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = IT.NUNICO AND IT.ORIGEM = 'E')
INNER JOIN TGFPAR PAR ON (PAR.CODPARC = CAB.CODPARC)
INNER JOIN TGFNAT NAT ON (NAT.CODNAT = CAB.CODNAT)
INNER JOIN TGFTOP TOP ON (TOP.CODTIPOPER = CAB.CODTIPOPER AND TOP.DHALTER = CAB.DHTIPOPER)
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS
WHERE
(PLA.CTACTB  LIKE '%3.01.03.01%' OR PLA.CTACTB  LIKE '%3.01.03.02%') 

AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND
( 
(
(    
(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) 
AND
(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)
)
OR
(:A_CODCTACTB IS NULL AND :A_MES IS NULL AND :A_ANO IS NULL)
)


UNION ALL

SELECT  FIN.CODEMP,
LAN.CODCTACTB,
PLA.CTACTB,
PLA.DESCRCTA,
FIN.NUFIN AS NUMERO_UNICO, 
FIN.NUMNOTA AS NUMNOTA, 
TO_CHAR(FIN.DTNEG,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(FIN.DTENTSAI,'DD-MM-YYYY') AS DTENTSAI,
TO_CHAR(FIN.DHBAIXA,'DD-MM-YYYY') AS DHBAIXA,
FIN.CODPARC AS PARCEIRO,
PAR.NOMEPARC AS NOMEPARC,
FIN.CODTIPOPER AS OPERACAO,
TOP.DESCROPER AS DESCROPER,
CASE WHEN LAN.TIPLANC = 'D' THEN 'DEBITO' ELSE 'CREDITO' END AS TIPLANC,
LAN.NUMLOTE, 
LAN.NUMLANC, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
FIN.HISTORICO AS HISTORICOORIGEM,
LAN.COMPLHIST AS HISTORICOLAN,
CASE WHEN FIN.RECDESP = 1 THEN 'RECEITA' ELSE 'DESPESA' END AS RECEITADESPESA,
FIN.CODNAT AS CODNATUREZA,
NAT.DESCRNAT AS NATUREZA,
'LANÇAMENTO FINANCEIRO' AS ORIGEM, 
'FINANCEIRO' AS MOVIMENTO,
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR


FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
INNER JOIN TGFFIN FIN ON (FIN.NUFIN = IT.NUNICO AND IT.ORIGEM = 'F')
INNER JOIN TGFPAR PAR ON (PAR.CODPARC = FIN.CODPARC)
INNER JOIN TGFNAT NAT ON (NAT.CODNAT = FIN.CODNAT)
INNER JOIN TGFTOP TOP ON (TOP.CODTIPOPER = FIN.CODTIPOPER AND TOP.DHALTER = FIN.DHTIPOPER)
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS
WHERE     	
(PLA.CTACTB  LIKE '%3.01.03.01%' OR PLA.CTACTB  LIKE '%3.01.03.02%') 

AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND
( 
(
(    
(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) 
AND
(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)
)
OR
(:A_CODCTACTB IS NULL AND :A_MES IS NULL AND :A_ANO IS NULL)
)


UNION ALL

SELECT  FIN.CODEMP,
LAN.CODCTACTB,
PLA.CTACTB,
PLA.DESCRCTA,
FIN.NUFIN AS NUMERO_UNICO, 
FIN.NUMNOTA AS NUMNOTA, 
TO_CHAR(FIN.DTNEG,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(FIN.DTENTSAI,'DD-MM-YYYY') AS DTENTSAI,
TO_CHAR(FIN.DHBAIXA,'DD-MM-YYYY') AS DHBAIXA,
FIN.CODPARC AS PARCEIRO,
PAR.NOMEPARC AS NOMEPARC,
FIN.CODTIPOPERBAIXA AS OPERACAO,
TOP.DESCROPER AS DESCROPER,
CASE WHEN LAN.TIPLANC = 'D' THEN 'DEBITO' ELSE 'CREDITO' END AS TIPLANC,
LAN.NUMLOTE, 
LAN.NUMLANC, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
FIN.HISTORICO AS HISTORICOORIGEM,
LAN.COMPLHIST AS HISTORICOLAN,
CASE WHEN FIN.RECDESP = 1 THEN 'RECEITA' ELSE 'DESPESA' END AS RECEITADESPESA,
FIN.CODNAT AS CODNATUREZA,
NAT.DESCRNAT AS NATUREZA,
'BAIXA DE TITULO' AS ORIGEM, 
'BAIXA' AS MOVIMENTO,
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR


FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
INNER JOIN TGFFIN FIN ON (FIN.NUFIN = IT.NUNICO AND IT.ORIGEM = 'B')
INNER JOIN TGFPAR PAR ON (PAR.CODPARC = FIN.CODPARC)
INNER JOIN TGFNAT NAT ON (NAT.CODNAT = FIN.CODNAT)
INNER JOIN TGFTOP TOP ON (TOP.CODTIPOPER = FIN.CODTIPOPERBAIXA AND TOP.DHALTER = FIN.DHTIPOPERBAIXA)
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS
WHERE
(PLA.CTACTB  LIKE '%3.01.03.01%' OR PLA.CTACTB  LIKE '%3.01.03.02%') 

AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND
( 
(
(    
(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) 
AND
(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)
)
OR
(:A_CODCTACTB IS NULL AND :A_MES IS NULL AND :A_ANO IS NULL)
)


UNION ALL

SELECT  FIN.CODEMP,
LAN.CODCTACTB,
PLA.CTACTB,
PLA.DESCRCTA,
FIN.NUFIN AS NUMERO_UNICO, 
FIN.NUMNOTA AS NUMNOTA, 
TO_CHAR(FIN.DTNEG,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(FIN.DTENTSAI,'DD-MM-YYYY') AS DTENTSAI,
TO_CHAR(FIN.DHBAIXA,'DD-MM-YYYY') AS DHBAIXA,
FIN.CODPARC AS PARCEIRO,
PAR.NOMEPARC AS NOMEPARC,
FIN.CODTIPOPER AS OPERACAO,
TOP.DESCROPER AS DESCROPER,
CASE WHEN LAN.TIPLANC = 'D' THEN 'DEBITO' ELSE 'CREDITO' END AS TIPLANC,
LAN.NUMLOTE, 
LAN.NUMLANC, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
FIN.HISTORICO AS HISTORICOORIGEM,
LAN.COMPLHIST AS HISTORICOLAN,
CASE WHEN FIN.RECDESP = 1 THEN 'RECEITA' ELSE 'DESPESA' END AS RECEITADESPESA,
FIN.CODNAT AS CODNATUREZA,
NAT.DESCRNAT AS NATUREZA,
'RENEGOCIACAO' AS ORIGEM, 
'RENEGOCIACAO' AS MOVIMENTO,
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR


FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
INNER JOIN TGFFIN FIN ON (FIN.NUFIN = IT.NUNICO AND IT.ORIGEM = 'R')
INNER JOIN TGFPAR PAR ON (PAR.CODPARC = FIN.CODPARC)
INNER JOIN TGFNAT NAT ON (NAT.CODNAT = FIN.CODNAT)
INNER JOIN TGFTOP TOP ON (TOP.CODTIPOPER = FIN.CODTIPOPER AND TOP.DHALTER = FIN.DHTIPOPER)
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS

WHERE
(PLA.CTACTB  LIKE '%3.01.03.01%' OR PLA.CTACTB  LIKE '%3.01.03.02%') 
AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND
( 
(
(    
(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) 
AND
(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)
)
OR
(:A_CODCTACTB IS NULL AND :A_MES IS NULL AND :A_ANO IS NULL)
)


UNION ALL

SELECT  0 AS CODEMP,
LAN.CODCTACTB,
PLA.CTACTB,
PLA.DESCRCTA,
MBC.NUBCO AS NUMERO_UNICO, 
MBC.NUMDOC AS NUMNOTA, 
TO_CHAR(MBC.DTLANC,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(MBC.DTLANC,'DD-MM-YYYY') AS DTENTSAI,
TO_CHAR(MBC.DTLANC,'DD-MM-YYYY') AS DHBAIXA,
0 AS PARCEIRO,
CTA.DESCRICAO AS NOMEPARC,
MBC.CODTIPOPER AS OPERACAO,
TOP.DESCROPER AS DESCROPER,
CASE WHEN LAN.TIPLANC = 'D' THEN 'DEBITO' ELSE 'CREDITO' END AS TIPLANC,
LAN.NUMLOTE, 
LAN.NUMLANC, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
MBC.HISTORICO AS HISTORICOORIGEM,
LAN.COMPLHIST AS HISTORICOLAN,
CASE WHEN MBC.RECDESP = 1 THEN 'RECEITA' ELSE 'DESPESA' END AS RECEITADESPESA,
0 AS CODNATUREZA,
'MOV. BANCARIO' AS NATUREZA,
'MOV. BANCARIO' AS ORIGEM, 
'MOV. BANCARIO' AS MOVIMENTO,
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR


FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
INNER JOIN TGFMBC MBC ON (MBC.NUBCO = IT.NUNICO AND IT.ORIGEM = 'M')
INNER JOIN TGFTOP TOP ON (TOP.CODTIPOPER = MBC.CODTIPOPER AND TOP.DHALTER = MBC.DHTIPOPER)
INNER JOIN TSICTA CTA ON (CTA.CODCTABCOINT = MBC.CODCTABCOINT)
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS

WHERE
(PLA.CTACTB  LIKE '%3.01.03.01%' OR PLA.CTACTB  LIKE '%3.01.03.02%') 
AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND
( 
(
(    
(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) 
AND
(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)
)
OR
(:A_CODCTACTB IS NULL AND :A_MES IS NULL AND :A_ANO IS NULL)
)

UNION ALL

SELECT  LAN.CODEMP,
LAN.CODCTACTB,
PLA.CTACTB,
PLA.DESCRCTA,
0 AS NUMERO_UNICO, 
0 AS NUMNOTA, 
TO_CHAR(LAN.DTMOV,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(LAN.DTMOV,'DD-MM-YYYY') AS DTENTSAI,
NULL AS DHBAIXA,
0 AS PARCEIRO,
'SEM PARCEIRO - LANCAMENTO MANUAL' AS NOMEPARC,
0 AS OPERACAO,
'SEM OPERAÇÃO - LANÇAMENTO MANUAL' AS DESCROPER,
CASE WHEN LAN.TIPLANC = 'D' THEN 'DEBITO' ELSE 'CREDITO' END AS TIPLANC,
LAN.NUMLOTE, 
LAN.NUMLANC, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
'SEM HISTORICO ORIGEM - LCT MANUAL' AS HISTORICOORIGEM,
LAN.COMPLHIST AS HISTORICOLAN,
'LCTO MANUAL' AS RECEITADESPESA,
0 AS CODNATUREZA,
'SEM NATUREZA - LCTO MANUAL' AS NATUREZA,
'SEM ORIGEM - LCTO MANUAL' AS ORIGEM, 
'MANUAL' AS MOVIMENTO,
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR


FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS
WHERE
(PLA.CTACTB  LIKE '%3.01.03.01%' OR PLA.CTACTB  LIKE '%3.01.03.02%') 
AND LAN.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND
( 
(
(    
(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) 
AND
(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)
)
OR
(:A_CODCTACTB IS NULL AND :A_MES IS NULL AND :A_ANO IS NULL)
)

AND NOT EXISTS (SELECT 1 FROM TCBINT IT
WHERE IT.CODEMP=LAN.CODEMP 
AND IT.REFERENCIA=LAN.REFERENCIA 
AND IT.NUMLANC=LAN.NUMLANC 
AND IT.TIPLANC=LAN.TIPLANC 
AND IT.NUMLOTE=LAN.NUMLOTE)

ORDER BY 1, 5, 13, 10 DESC




    
    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento dos Lançamentos</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Emp.</th>
                    <th onclick="sortTable(1)">Cód. Cta.Ctb.</th>
                    <th onclick="sortTable(2)">Cta.Ctb.</th>
                    <th onclick="sortTable(3)">Descr.Cta.</th>
                    <th onclick="sortTable(4)">NU. Unico</th>
                    <th onclick="sortTable(5)">NU. Nota</th>
                    <th onclick="sortTable(6)">Dt. Neg.</th>
                    <th onclick="sortTable(7)">Dt. Ent. Sai.</th>
                    <th onclick="sortTable(8)">Dt. Baixa</th>
                    <th onclick="sortTable(9)">Cód. Parc.</th>
                    <th onclick="sortTable(10)">Parceiro</th>
                    <th onclick="sortTable(11)">Cód. TOP</th>
                    <th onclick="sortTable(12)">Descr. TOP</th>
                    <th onclick="sortTable(13)">Tp. Lanc.</th>
                    <th onclick="sortTable(14)">NU. Lote</th>
                    <th onclick="sortTable(15)">Num. Lanc.</th>
                    <th onclick="sortTable(16)">Movimento</th>
                    <th onclick="sortTable(17)">Hist. Origem</th>
                    <th onclick="sortTable(18)">Hist. Lanc.</th>
                    <th onclick="sortTable(19)">Rec./Desp.</th>
                    <th onclick="sortTable(20)">Cód. Nat.</th>
                    <th onclick="sortTable(21)">Natureza</th>
                    <th onclick="sortTable(22)">Origem</th>
                    <th onclick="sortTable(23)">Vlr. Lanc.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr class="${row.VLRLANC < 0 ? 'negative' : 'positive'}">
                        <td>${row.CODEMP}</td>
                        <td>${row.CODCTACTB}</td>
                        <td>${row.CTACTB}</td>
                        <td>${row.DESCRCTA}</td>
                        <td>${row.NUMERO_UNICO}</td>
                        <td>${row.NUMNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.DTENTSAI}</td>
                        <td>${row.DHBAIXA}</td>
                        <td>${row.PARCEIRO}</td>
                        <td>${row.NOMEPARC}</td>
                        <td>${row.OPERACAO}</td>
                        <td>${row.DESCROPER}</td>
                        <td>${row.TPLANC}</td>
                        <td>${row.NUMLOTE}</td>
                        <td>${row.NUMLANC}</td>
                        <td>${row.HISTORICOORIGEM}</td>
                        <td>${row.HISTORICOLAN}</td>
                        <td>${row.RECEITADESPESA}</td>
                        <td>${row.CODNATUREZA}</td>
                        <td>${row.NATUREZA}</td>
                        <td>${row.ORIGEM}</td>
                        <td>${row.MOVIMENTO}</td>
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.VLRLANC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="22"></td>
                    <td style="text-align: center;" id="totalAmount"><b>R$ 0,00</b></td>
                </tr>       
            </tfoot>
        </table>
    </div>
</div>

<!-- Botão de exportação para Excel -->
<div id="exportOverlay" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
    <button onclick="exportToExcel()" style="
        background-color: #4CAF50; 
        color: white; 
        border: none; 
        padding: 10px 20px; 
        text-align: center; 
        text-decoration: none; 
        display: inline-block; 
        font-size: 16px; 
        margin: 4px 2px; 
        cursor: pointer; 
        border-radius: 5px;
    ">
        XLS
    </button>
</div>



<script>
    function abrir_ctb() {
        var params = '';
        var level = 'br.com.sankhya.mgecontab.mov.lancamentos.contabeis';
        openApp(level, params);
    }

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
        let total = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cellValue = row.cells[23].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); 
                const value = parseFloat(cellValue);
                total += isNaN(value) ? 0 : value;
            }
        });

        
        document.getElementById('totalAmount').innerHTML = '<b>' + total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</b>';
    }

    document.getElementById('tableFilter').addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const match = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(filter));
            row.style.display = match ? '' : 'none';
        });

        updateTotal(); // Atualiza o total após o filtro
    });

    function sortTable(n) {
        const table = document.getElementById("myTable");
        let rows = Array.from(table.querySelectorAll('tbody tr:not(.total-row)')); // Exclui a linha de total
        const isAscending = table.querySelectorAll('th')[n].classList.toggle('sort-asc');

        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[n].textContent.trim().toLowerCase();
            const cellB = rowB.cells[n].textContent.trim().toLowerCase();

            if (!isNaN(cellA) && !isNaN(cellB)) {
                return isAscending ? cellA - cellB : cellB - cellA;
            }

            return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        });

        rows.forEach(row => table.querySelector('tbody').appendChild(row));

        Array.from(table.querySelectorAll('th')).forEach((th, index) => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (index === n) {
                th.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
            }
        });

        // Atualiza o total após a ordenação
        updateTotal();
    }

    // Calcula e exibe o total inicial após o carregamento da página
    document.addEventListener('DOMContentLoaded', (event) => {
        updateTotal();
    });

</script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
<script>
    function exportToExcel() {
        var table = document.getElementById('myTable');
        var wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
        XLSX.writeFile(wb, 'dados.xlsx');
    }
</script>


</body>
</html>
