<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tabela Bonita</title>
  <!-- Bootstrap CSS -->
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <style>
    /* Estilos personalizados */
    .table-hover tbody tr:hover {
      background-color: #f5f5f5;
    }
    .table-rounded {
      border-radius: 10px; /* Cantos arredondados */
    }
    .table-title {
      background-color: #28a745; /* Fundo título */
      color: #fff; /* Fonte branca */
      border-radius: 10px 10px 0 0; /* Cantos arredondados apenas na parte superior */
    }
  </style>

<snk:load/>

</head>

<snk:query var="compras_saving_detalhe"></snk:query>
WITH
ANT AS (
SELECT
    CODPROD,
    DESCRICAO,
    AVG(PRECO_COMPRA_UN_LIQ) AS PRECO_COMPRA_UN_LIQ_ANT_MED
FROM
(
    SELECT
        ITE.CODPROD,
        PRO.DESCRPROD AS DESCRICAO,
        ITE.CODVOL AS UN,
        ITE.NUNOTA AS NUNOTA,
        F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS TIPMOV,
        VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
        ITE.QTDNEG,
        ITE.VLRTOT,
        ITE.VLRDESC,
        (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA,
        (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,

        ITE.VLRDESC AS SAVING,
        ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
        (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERCENTUAL_SAVING
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
      INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
      INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
      INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
     WHERE CAB.TIPMOV = 'O'
       AND CAB.STATUSNOTA = 'L'
       AND CAB.DTNEG < '01-01-2024')
GROUP BY CODPROD, DESCRICAO
ORDER BY 2,3 DESC
),
USU AS (SELECT CODUSU,NOMEUSU FROM TSIUSU)

SELECT CAB.CODEMP,
       CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL) AS PARCEIRO,
       ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
       PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD AS GRUPO,
       ITE.CODVOL AS UN,
       ITE.NUNOTA AS NUNOTA,
       CAB.TIPMOV AS TIPMOV,
       CAB.DTNEG,
       VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
       CAB.CODUSUINC||'-'||USU.NOMEUSU AS USUARIO_INC,
       ITE.QTDNEG,
       ITE.VLRTOT,
       ITE.VLRDESC,
       (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN,
       (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
       NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
       NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
        CASE
        WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) > 0 THEN 'REDUCAO'
        WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0 AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) <> 0 THEN 'AUMENTO'
        WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 'SEM ALTERACAO'
        ELSE 'MANTEVE'
        END AS SITUACAO_PRECO,
       ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))/NULLIF(((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)),0)*100 AS PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
       ITE.VLRDESC AS SAVING,
       ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
       (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERC_SAVING
  FROM TGFITE ITE
  INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
  INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
  INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
  INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
  INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
  INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
  LEFT JOIN ANT ON ITE.CODPROD = ANT.CODPROD
  INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
 WHERE CAB.TIPMOV = 'O'
   AND CAB.STATUSNOTA = 'L'
   AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
ORDER BY 4,17 DESC
</snk:query>



<body>
  <div class="container">
    <h2 class="text-center py-4">Exemplo de Tabela Bonita</h2>
    <div class="table-responsive">
      <table class="table table-bordered table-hover table-rounded">
        <thead class="table-title">
          <tr>
            <th>Cód. Emp.</th>
            <th>Parceiro</th>
            <th>Produto</th>
            <th>Grupo</th>
            <th>NÚ. Único</th>
            <th>Tp. Mov.</th>
            <th>Dt. Neg.</th>
            <th>Comprador</th>
            <th>Usu. Inclusão</th>
            <th>Vlr. Tot.</th>
            <th>Vlr. Desc.</th>
            <th>Preço (UN)</th>
            <th>Preço Liq. (UN)</th>
            <th>Preço Liq. Ante. Méd. (UN)</th>
            <th>Dif.</th>
            <th>Situação Preço</th>
            <th>% Dif.</th>
            <th>Saving</th>
            <th>Saving (UN)</th>
            <th>% Saving</th>
        </tr>
        </thead>
        <tbody>
          <tr>
            <td>João</td>
            <td>25</td>
            <td>São Paulo</td>
            <td>Engenheiro</td>
          </tr>
          <tr>
            <td>Maria</td>
            <td>28</td>
            <td>Rio de Janeiro</td>
            <td>Advogada</td>
          </tr>
          <tr>
            <td>Pedro</td>
            <td>22</td>
            <td>Porto Alegre</td>
            <td>Estudante</td>
          </tr>
          <tr>
            <td>Ana</td>
            <td>30</td>
            <td>Brasília</td>
            <td>Médica</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Bootstrap JS and dependencies -->
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
</body>
</html>
