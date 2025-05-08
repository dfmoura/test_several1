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
    <title>Professional Data Card</title>
    <style>
        body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f9;
            margin: 0;
            padding: 0;
            color: #333;
        }

        .container {
            max-width: 900px;
            margin: 30px auto;
            padding: 20px;
        }

        .card {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
        }

        .card h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #2a9d8f;
            margin-bottom: 10px;
        }

        .field {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .field-label {
            font-weight: 500;
            margin-right: 8px;
            color: #555;
        }

        .field-value {
            font-weight: 400;
            color: #000;
        }

        .field-group {
            margin-bottom: 20px;
        }

        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 20px 0;
        }

        .observation {
            background-color: #f9f9f9;
            border-left: 4px solid #2a9d8f;
            padding: 10px;
            margin: 15px 0;
            font-style: italic;
        }

        @media (max-width: 768px) {
            .field {
                flex-direction: column;
            }
        }
        /* Estilo para o botão overlay */
        .overlay-button {
            position: fixed;
            top: 10px;
            left: 10px;
            background-color: #007BFF; /* Azul */
            color: #ffffff; /* Branco */
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: background-color 0.3s ease;
            z-index: 1000;
        }

        .overlay-button:hover {
            background-color: #0056b3; /* Azul mais escuro no hover */
        }        
    </style>
    <snk:load/>
</head>
<body>

    <snk:query var="analise">
    SELECT
    ANC.CODPARC,
    PAR.NOMEPARC,
    ANC.CODANALISE,
    ANC.ABEMPRESA,
    ANC.CONSERASA,
    ANC.SCORSERASA,
    ANC.OBSSERASA,
    ANC.ANODRE,
    ANC.RECDRE,
    ANC.LUCDRE,
    DBMS_LOB.SUBSTR(ANC.DADOSIR, 4000, 1) AS DADOSIR,
    ANC.PRETCOMPRA,
    ANC.CATFIANCA,
    
DBMS_LOB.SUBSTR(ANC.OBSERVACOES, 4000, 1)AS OBSERVACOES,
ANC.PARECER,
    PAR.AD_CRPADVEND,
    
    CUS.CODCENCUS,
    CUS.DESCRCENCUS,
    CUS.AD_APELIDO,
    ('CODCR: ' || PAR.AD_CRPADVEND || ', ' || 
     'DESCRICAO: ' || CUS.DESCRCENCUS || ', ' || 
     'APELIDO: ' || CUS.AD_APELIDO) AS Apelido,
ANC.ANOANALISE,
ANC.ANOFAT,
 SUM(VGF.VLR) AS TOTAL_VLR
FROM
    VGF_VENDAS_SATIS VGF
INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
INNER JOIN AD_ANCREDITO ANC ON PAR.CODPARC = ANC.CODPARC
INNER JOIN TSICUS CUS ON PAR.AD_CRPADVEND = CUS.CODCENCUS
WHERE 
    /*
    VGF.DTMOV >= TO_DATE(EXTRACT(YEAR FROM SYSDATE) - 1 || '-01-01', 'YYYY-MM-DD') 
    AND VGF.DTMOV <= TO_DATE(EXTRACT(YEAR FROM SYSDATE) - 1 || '-12-31', 'YYYY-MM-DD') 
    AND 
    */
    VGF.BONIFICACAO = 'N'
    AND VGF.CODPARC = :A_CODPARC
    AND ANC.CODANALISE = (
        SELECT MAX(ANC_INNER.CODANALISE)
        FROM AD_ANCREDITO ANC_INNER
        WHERE ANC_INNER.CODPARC = ANC.CODPARC
            AND NVL(ANC_INNER.ANOANALISE,EXTRACT(YEAR FROM ANC_INNER.CONSERASA)) = (
            SELECT MAX(NVL(ANC_INNER.ANOANALISE,EXTRACT(YEAR FROM ANC_INNER.CONSERASA)))
            FROM AD_ANCREDITO
            WHERE CODPARC = ANC.CODPARC
        )
    )
GROUP BY
    ANC.CODPARC, 
    PAR.NOMEPARC,
    ANC.ABEMPRESA,
    ANC.CODANALISE, 
    ANC.CONSERASA,
    PAR.CODPARC, 
    PAR.AD_CRPADVEND, 
    CUS.CODCENCUS, 
    CUS.DESCRCENCUS, 
    CUS.AD_APELIDO,
    ANC.SCORSERASA,
    ANC.OBSSERASA,
    ANC.ANODRE,
    ANC.RECDRE,
    ANC.LUCDRE,
    DBMS_LOB.SUBSTR(ANC.DADOSIR, 4000, 1),
    ANC.PRETCOMPRA,
    ANC.CATFIANCA,
   DBMS_LOB.SUBSTR(ANC.OBSERVACOES, 4000, 1),
ANC.PARECER,
ANC.ANOANALISE,
ANC.ANOFAT
</snk:query>

<c:forEach items="${analise.rows}" var="row">

<!-- Botão Overlay -->
<button class="overlay-button" onclick="abrir_mov('${row.CODPARC}')">Abrir Tela</button>


<h2 style="text-align: center;">Análise de Crédito</h2>


<div class="container">
    <div class="card">
        <h2>Informações do Parceiro</h2>
        <div class="field">
            <span class="field-label">Cód. Parc.:</span>
            <span class="field-value">${row.CODPARC}</span>
        </div>
        <div class="field">
            <span class="field-label">Parceiro:</span>
            <span class="field-value">${row.NOMEPARC}</span>
        </div>
        <div class="field">
            <span class="field-label">Análise de Crédito:</span>
            <span class="field-value">${row.CODANALISE}</span>
        </div>

        <div class="divider"></div>

        <div class="field">
            <span class="field-label">Abertura Empresa:</span>
            <span class="field-value">${row.ABEMPRESA}</span>
        </div>
        <div class="field">
            <span class="field-label">Data Consulta Serasa:</span>
            <span class="field-value">${row.CONSERASA}</span>
        </div>
        <div class="field">
            <span class="field-label">Score:</span>
            <span class="field-value">${row.SCORSERASA}</span>
        </div>
        <div class="observation">
            <strong>Observação Serasa:</strong>${row.OBSSERASA}
        </div>

        <div class="divider"></div>

        <h2>Dados Financeiros</h2>
        <div class="field">
            <span class="field-label">Ano DRE:</span>
            <span class="field-value">${row.ANODRE}</span>
        </div>
        <div class="field">
            <span class="field-label">Rec. DRE:</span>
            <span class="field-value">${row.RECDRE}</span>
        </div>
        <div class="field">
            <span class="field-label">Luc. DRE:</span>
            <span class="field-value">${row.LUCDRE}</span>
        </div>
        <div class="field">
            <span class="field-label">Dados IR:</span>
            <span class="field-value">${row.DADOSIR}</span>
        </div>

        <div class="divider"></div>

        <h2>Outras Informações</h2>
        <div class="field">
            <span class="field-label">Pretensão Compra:</span>
            <span class="field-value">${row.PRETCOMPRA}</span>
        </div>
        <div class="field">
            <span class="field-label">Carta Fiança:</span>
            <span class="field-value">${row.CATFIANCA}</span>
        </div>
        <div class="observation">
            <strong>Observações:</strong>${row.OBSERVACOES}
        </div>
        <div class="field">
            <span class="field-label">Parecer:</span>
            <span class="field-value">${row.PARECER}</span>
        </div>

        <div class="divider"></div>

        <h2>Resumo</h2>
        <div class="field">
            <span class="field-label">CR / Apelido:</span>
            <span class="field-value">${row.AD_CRPADVEND} - ${row.CODCENCUS} - ${row.DESCRCENCUS} / ${row.AD_APELIDO} - ${row.APELIDO}</span>

        </div>
        <div class="field">
            <span class="field-label">Ano Análise:</span>
            <span class="field-value">${row.ANOANALISE}</span>
        </div>
        <div class="field">
            <span class="field-label">Ano Fat.:</span>
            <span class="field-value">${row.ANOFAT}</span>
        </div>
        <div class="field">
            <span class="field-label">Valor Fat.:</span>
            <span class="field-value">${row.TOTAL_VLR}</span>
        </div>
    </div>
</div>

</c:forEach>

<script>


function abrir_mov(grupo) {
    var params = { 'CLIENTE': parseInt(grupo)};
    var level = 'br.com.sankhya.menu.adicional.AD_GESTCRED';
    openApp(level, params);
}
  


</script>

</body>
</html>