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
            white-space: nowrap; /* Impede a quebra de linha nas células */

        }

        th {
            cursor: pointer;
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
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
    </style>

<snk:load/>
</head>
<body>
<snk:query var="fat_det">

WITH BAS AS(
SELECT
CAB.CODEMP,
SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV AS EMPRESA,
CAB.NUNOTA,
CAB.DTNEG,
PRO.AD_TPPROD,
F_DESCROPC('TGFPRO','AD_TPPROD',PRO.AD_TPPROD) AS TIPOPROD,
ITE.CODPROD,
PRO.DESCRPROD,
PRO.CODVOL,
VEN.CODGER,
DECODE(VENG.APELIDO, '<SEM VENDEDOR>', 'NAO CADASTRADO', VENG.APELIDO) GERENTE,
CAB.CODPARC,
SUBSTR(PAR.NOMEPARC,1,13) NOMEPARC,
ITE.QTDNEG * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS QTDNEG,
(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS HL,
(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) * 100 AS LT,
ITE.VLRUNIT * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRUNIT,
ITE.AD_CODTAB,
(SELECT EXC.VLRVENDA
FROM TGFTAB TAB
INNER JOIN TGFEXC EXC ON TAB.NUTAB = EXC.NUTAB AND EXC.CODPROD = ITE.CODPROD AND TAB.CODTAB = ITE.AD_CODTAB AND TAB.DTVIGOR < CAB.DTNEG AND TAB.DTVIGOR = (SELECT MAX(T.DTVIGOR) FROM TGFTAB T, TGFEXC E WHERE T.NUTAB = E.NUTAB AND T.CODTAB=TAB.CODTAB AND E.CODPROD = EXC.CODPROD AND T.DTVIGOR <= CAB.DTNEG)) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS PRECOTAB,

(
((ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) / ITE.QTDNEG)
- (SELECT EXC.VLRVENDA
FROM TGFTAB TAB
INNER JOIN TGFEXC EXC ON TAB.NUTAB = EXC.NUTAB AND EXC.CODPROD = ITE.CODPROD AND TAB.CODTAB = ITE.AD_CODTAB AND TAB.DTVIGOR < CAB.DTNEG AND TAB.DTVIGOR = (SELECT MAX(T.DTVIGOR) FROM TGFTAB T, TGFEXC E WHERE T.NUTAB = E.NUTAB AND T.CODTAB=TAB.CODTAB AND E.CODPROD = EXC.CODPROD AND T.DTVIGOR <= CAB.DTNEG))
)
/ (SELECT EXC.VLRVENDA
FROM TGFTAB TAB
INNER JOIN TGFEXC EXC ON TAB.NUTAB = EXC.NUTAB AND EXC.CODPROD = ITE.CODPROD AND TAB.CODTAB = ITE.AD_CODTAB AND TAB.DTVIGOR < CAB.DTNEG AND TAB.DTVIGOR = (SELECT MAX(T.DTVIGOR) FROM TGFTAB T, TGFEXC E WHERE T.NUTAB = E.NUTAB AND T.CODTAB=TAB.CODTAB AND E.CODPROD = EXC.CODPROD AND T.DTVIGOR <= CAB.DTNEG))
* 100
 * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS PERCVLRLIQ,

(
ITE.VLRUNIT
- (SELECT EXC.VLRVENDA
FROM TGFTAB TAB
INNER JOIN TGFEXC EXC ON TAB.NUTAB = EXC.NUTAB AND EXC.CODPROD = ITE.CODPROD AND TAB.CODTAB = ITE.AD_CODTAB AND TAB.DTVIGOR < CAB.DTNEG AND TAB.DTVIGOR = (SELECT MAX(T.DTVIGOR) FROM TGFTAB T, TGFEXC E WHERE T.NUTAB = E.NUTAB AND T.CODTAB=TAB.CODTAB AND E.CODPROD = EXC.CODPROD AND T.DTVIGOR <= CAB.DTNEG))
)
/ (SELECT EXC.VLRVENDA
FROM TGFTAB TAB
INNER JOIN TGFEXC EXC ON TAB.NUTAB = EXC.NUTAB AND EXC.CODPROD = ITE.CODPROD AND TAB.CODTAB = ITE.AD_CODTAB AND TAB.DTVIGOR < CAB.DTNEG AND TAB.DTVIGOR = (SELECT MAX(T.DTVIGOR) FROM TGFTAB T, TGFEXC E WHERE T.NUTAB = E.NUTAB AND T.CODTAB=TAB.CODTAB AND E.CODPROD = EXC.CODPROD AND T.DTVIGOR <= CAB.DTNEG))
* 100 
* (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS PERCVLRUN,

NVL(CUS.CUSSEMICM,0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM,
ITE.VLRTOT * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRTOT,
NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
ITE.CODCFO,
ITE.VLRIPI * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
ITE.VLRSUBST * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
ITE.PERCDESC,
ITE.VLRDESC * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
ITE.BASEICMS * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS BASEICMS,
ITE.VLRICMS * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS TOTALLIQ,
(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) / ITE.QTDNEG * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS TOTALLIQUN,

((ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS RECLIQ,

(
(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
	- (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,

(
(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS) 
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
	- NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
	- (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
) * 100 / 
(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) AS PERCMARGEM,


ITE.CODLOCALORIG,
LOC.DESCRLOCAL,
ITE.CODTRIB AS TRIBUTACAO,
ITE.ALIQICMS,
ITE.IDALIQICMS AS CODALIQICM,
ITE.BASESUBSTIT * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS BASESUBSTIT,
ITE.VLRSUBST * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
ITE.CSTIPI,
ITE.BASEIPI * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS BASEIPI,
ITE.ALIQIPI,
ITE.VLRIPI * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
(SELECT SUM(NVL(BASERED,BASE)) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS BASEPIS,
(SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRPIS,
(SELECT SUM(NVL(BASERED,BASE)) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS BASECOFINS,
(SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7)  * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRCOFINS,
PRO.NCM,
ITE.CODESPECST,
CASE WHEN CAB.TIPMOV = 'V' THEN 'BLUE' ELSE 'RED' END AS FGCOLOR
FROM TGFCAB CAB
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
INNER JOIN TGFLOC LOC ON ITE.CODLOCALORIG = LOC.CODLOCAL
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND DTATUAL <= CAB.DTNEG)
WHERE TOP.GOLSINAL = -1
AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)

AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S'


AND CAB.CODNAT IN (:P_NATUREZA)
AND CAB.CODCENCUS IN (:P_CR)
AND CAB.CODVEND IN (:P_VENDEDOR)
AND VEN.AD_ROTA IN (:P_ROTA)


)
SELECT 
CODEMP,EMPRESA,NUNOTA,DTNEG,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,CODGER,GERENTE,CODPARC,NOMEPARC,MARGEMNON,PERCMARGEM
FROM BAS
WHERE 
            
(AD_TPPROD = :A_TPPROD AND CODGER = :A_CODGER)
OR
(AD_TPPROD = :A_TPPROD AND CODPARC = :A_CODPARC)
OR
(AD_TPPROD = :A_TPPROD AND CODPROD = :A_CODPROD)

ORDER BY 13 DESC

    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento HL</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Emp.</th>
                    <th onclick="sortTable(1)">Empresa</th>
                    <th onclick="sortTable(2)">NÚ. Único</th>
                    <th onclick="sortTable(3)">Dt. Neg.</th>
                    <th onclick="sortTable(4)">Cód. Tp. Prod.</th>
                    <th onclick="sortTable(5)">Tp. Prod.</th>
                    <th onclick="sortTable(6)">Cód. Prod.</th>
                    <th onclick="sortTable(7)">Produto</th>
                    <th onclick="sortTable(8)">Cód. Ger.</th>
                    <th onclick="sortTable(9)">Gerente</th>
                    <th onclick="sortTable(10)">Cód. Parc.</th>
                    <th onclick="sortTable(11)">Parceiro</th>
                    <th onclick="sortTable(12)">Margem Nom.</th>
                    <th onclick="sortTable(13)">Margem %</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.EMPRESA}</td>
                        <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.AD_TPPROD}</td>
                        <td>${row.TIPOPROD}</td>
                        <td>${row.CODPROD}</td>
                        <td>${row.DESCRPROD}</td>
                        <td>${row.CODGER}</td>
                        <td>${row.GERENTE}</td>
                        <td>${row.CODPARC}</td>
                        <td>${row.NOMEPARC}</td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.MARGEMNON}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.PERCMARGEM}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="11"></td>
                    <td style="text-align: center;" id="totalAmount"><b>0,00</b></td>
                    <td></td>
                </tr>       
            </tfoot>
        </table>
    </div>
</div>

<script>
    function abrir_portal(nunota) {
        var params = {'NUNOTA': nunota};
        var level = 'br.com.sankhya.com.mov.CentralNotas';
        openApp(level, params);
    }

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
        let total = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cellValue = row.cells[12].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
                const value = parseFloat(cellValue);
                total += isNaN(value) ? 0 : value;
            }
        });

        document.getElementById('totalAmount').innerHTML = '<b>' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';

        
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
</body>
</html>
