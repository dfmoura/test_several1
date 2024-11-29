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
    <title>Teste de Tabela</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .container {
            width: 100%;
            max-width: 100%;
        }
        th {
            position: sticky;
            top: 0;
            background-color: #f1f1f1;
            z-index: 1;
        }
        table {
        font-size: 0.8em; /* Ajuste o tamanho da fonte aqui */
    }        
    </style>
    <snk:load/>

</head>
<body>

    <snk:query var="fat_det">


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
        AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN
        
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND VEN.AD_ROTA IN (:P_ROTA)
        
        AND ACF.CODHIST = :A_MOTIVO
        AND CAB.CODVEND = :A_VENDEDOR
        
            
        
        AND TOP.GOLSINAL = -1
        AND TOP.ATIVO = 'S'
    ORDER BY 
        CAB.CODPARC,
        VAR.NUNOTA
)

SELECT    
BAS.CODEMP
, BAS.CODPROD||' - '||BAS.DESCRPROD AS PRODUTO
, BAS.NUNOTA
, TO_CHAR(BAS.DTNEG,'DD-MM-YYYY') AS DTNEG
, BAS.CODTIPOPER
, BAS.CODPARC
, BAS.RAZAOSOCIAL
, BAS.CODCID
, BAS.NOMECID
, BAS.CODBAI
, BAS.NOMEBAI
, ROUND(BAS.VLRDEVOL,2) VLRDEVOL
FROM BAS
ORDER BY 12 DESC


</snk:query>



    <h1>Faturamento por Vendedor e Motivo Devolução</h1>
    <div class="container">
        <table id="example" class="display" style="width:100%">
            <thead>
                <tr>
                    <th>Cód. Emp.</th>
                    <th>Produto</th>
                    <th>NÚ. Único</th>
                    <th>Dt. Neg.</th>
                    <th>Cód. TOP</th>
                    <th>Cód. Parc.</th>
                    <th>Parceiro</th>
                    <th>Cidade</th>
                    <th>Bairro</th>
                    <th>Vlr. Dev.</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="row" items="${fat_det.rows}">
                <tr>
                    <td>${row.CODEMP}</td>
                    <td>${row.PRODUTO}</td>
                    <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                    <td>${row.DTNEG}</td>
                    <td>${row.CODTIPOPER}</td>
                    <td>${row.CODPARC}</td>
                    <td>${row.RAZAOSOCIAL}</td>
                    <td>${row.NOMECID}</td>
                    <td>${row.NOMEBAI}</td>
                    <td style="text-align: right;">${row.VLRDEVOL}</td>
                </tr>
                </c:forEach>

                <!-- Adicione mais linhas conforme necessário -->
            </tbody>
            <tfoot>
                <tr>
                    <th colspan="8">Total</th>
                    <th colspan="2" id="total" style="text-align: right;"></th>
                </tr>

            </tfoot>
        </table>
    </div>


    <button id="campoExibicao" onclick="abrir_portal(this.innerText)" disabled>Selecionar NUNOTA</button>


    
   
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    
    
    <script>

        $(document).ready(function() {
            var table = $('#example').DataTable({

                "footerCallback": function ( row, data, start, end, display ) {
                    var api = this.api(), data;

                    // Converte string para inteiro e soma
                    var intVal = function (i) {
                        return typeof i === 'string' ?
                            i.replace(/[\$,]/g, '')*1 :
                            typeof i === 'number' ?
                                i : 0;
                    };

                    // Total em todas as páginas
                    var total = api
                        .column(9)
                        .data()
                        .reduce( function (a, b) {
                            return intVal(a) + intVal(b);
                        }, 0 );
                        
                        // Total da página atual
                    var pageTotal = api
                        .column(9, { page: 'current'} )
                        .data()
                        .reduce( function (a, b) {
                            return intVal(a) + intVal(b);
                        }, 0 );
                        
                        // Atualiza o valor total
                        $(api.column(9).footer()).html(
                    pageTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
                    ' ( Total: ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' )'
                );
            }
        });        
    });
    </script>


    <script>

        var selectedNunota = null; // Variável global para armazenar o valor de nunota selecionado


        function ref_nunota(nunota) {
        selectedNunota = nunota; // Armazena o valor da NUNOTA clicada na variável global
        var btn = document.getElementById('campoExibicao');
        btn.innerText = nunota; // Atualiza o texto do botão com a NUNOTA selecionada
        btn.disabled = false; // Ativa o botão para permitir o clique
    }

        function abrir_portal(nunota) {
            var params = {'A_NUNOTA': parseInt(nunota)};
            var level = 'br.com.sankhya.com.mov.CentralNotas';
            alert(nunota);
            openApp(level, params);
        }

        $(document).ready(function() {        });

    </script>
    
    
</body>
</html>
