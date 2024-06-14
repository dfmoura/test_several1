# Objetivos
```markdown
Analise de Compras


* — Análise de quantidade de pedidos |
o Gráfico de pizza por comprador, com a quantidade de pedidos de compras negociados no período


* — Análise de quantidade de notas |
o Gráfico de pizza por comprador, com a quantidade de notas de compras negociados no período
o Considerar apenas as notas lançadas pelos usuários compradores


* — Análise de origem das compras |
o Gráfico de qtd. de pedidos por setor de origem |
o O setor de origem está associado ao cadastro do usuário que incluiu a requisição de compra
. Ao clicar sobre o setor, deve abrir um nível inferior que desmembre a quantidade de pedidos
por operação (requisição normal ou requisição de compra direta)


* — Análise por operação de compras
o Gráfico que apresente a qtd. de pedidos e percentual por operação
. As operações correspondem as TOPs de requisição, sendo requisição normal ou requisição de — || compra direta
o Ao clicar sobre a operação de requisição, deve apresentar a qtd. de requisição por setor.
. O setor de origem está associado ao cadastro do usuário que incluiu a requisição de compra.

```

### 1. Log's Execução


#### 1.1. 13/06/2024 13:00 as 18:00
```markdown


dividir a tela em 4 partes para gerar uma card em cada parte, colocar a escrita e icones de tamanho proporcional ao card
- na primeira parte um card com o titulo 'Total de Pedido' e colocar a quantidade de '15.800' proporcional ao tamanho do card.
adicionar este icone: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19.5 8c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5-2.015-4.5-4.5-4.5zm-.5 7v-2h-2v-1h2v-2l3 2.5-3 2.5zm-5.701-11.26c-.207-.206-.299-.461-.299-.711 0-.524.407-1.029 1.02-1.029.262 0 .522.1.721.298l3.783 3.783c-.771.117-1.5.363-2.158.726l-3.067-3.067zm-.299 8.76c0-1.29.381-2.489 1.028-3.5h-14.028v2h.643c.535 0 1.021.304 1.256.784l4.101 10.216h12l1.211-3.015c-3.455-.152-6.211-2.993-6.211-6.485zm-2.299-8.76c.207-.206.299-.461.299-.711 0-.524-.407-1.029-1.02-1.029-.261 0-.522.1-.72.298l-4.701 4.702h2.883l3.259-3.26z"/></svg>
e ao clicar direcionar para o leve: 'lvl_exxnq1'
onclick="abrir()"
<script>
    function abrir() {
        const level = 'lvl_exxnq1';
        openLevel(level);
    }
</script>



- na segunda parte um card com o titulo 'Total de Notas' e e colocar a quantidade de '9.500' proporcional ao tamanho do card.
adicionar este icone: <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M22 24h-18v-22h12l6 6v16zm-7-21h-10v20h16v-14h-6v-6zm-1-2h-11v21h-1v-22h12v1zm2 7h4.586l-4.586-4.586v4.586z"/></svg>


- na terceira parte um card com o titulo 'Total de Requisições' e e colocar a quantidade de '15.500' proporcional ao tamanho do card.
adicionar este icone:<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 0v2h-18v18h-2v-20h20zm-7.281 20.497l-.719 3.503 3.564-.658-2.845-2.845zm8.435-8.436l2.846 2.845-7.612 7.612-2.845-2.845 7.611-7.612zm-17.154-8.061v20h6v-2h-4v-16h16v4.077l2 2v-8.077h-20z"/></svg>


- na quarta parte um card com o titulo 'Total de Requisições' e e colocar a quantidade de '15.500' proporcional ao tamanho do card.
adicionar este icone:<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 0v2h-18v18h-2v-20h20zm3.889 22.333l-4.76-4.761c.51-.809.809-1.764.809-2.791 0-2.9-2.35-5.25-5.25-5.25s-5.25 2.35-5.25 5.25 2.35 5.25 5.25 5.25c1.027 0 1.982-.299 2.791-.809l4.761 4.76 1.649-1.649zm-13.201-7.552c0-2.205 1.795-4 4-4s4 1.795 4 4-1.795 4-4 4-4-1.795-4-4zm6.74 7.219h-11.428v-16h16v11.615l2 2v-15.615h-20v20h15.428l-2-2z"/></svg>



CRIAR EM CSS/HTML/JSP em um unico arquivo

criar uma tela 

um grafico de pizza com 5 fatias com cores chapadas no chart.js
com titulo Pedidos Por Comprador.
os campos da pizza sao: COMPRADOR E A CONTAGEM DO CAMPO COMPRADOR


tente utilizar a estrutura abaixo:

<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Dashboard</title>
    <style>

		
    </style>
    <snk:load />
</head>
<body>


<snk:query var="pizza">

WITH BAS AS( SELECT
ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS ORDEM,
DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO) AS COMPRADOR,
COUNT(*) QTD_PEDIDOS
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
WHERE TIPMOV IN ('O')
GROUP BY 
DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO)
ORDER BY 2 DESC)
SELECT COMPRADOR,QTD_PEDIDOS FROM BAS WHERE ORDEM <= 5
UNION ALL
SELECT 'OUTROS' AS COMPRADOR, SUM(QTD_PEDIDOS) AS QTD_PEDIDOS FROM BAS WHERE ORDEM > 5
ORDER BY 2 DESC



</snk:query>	
	
	



        <c:forEach items="${pizza.rows}" var="row">

	</c:forEach>
    </tbody>
</table>

</body>
</html>




	2) a segunda parte será um tabela bem estilizada que será atualizada  com base no click em fatia da pizza (COMPRADOR).
os campos da TABELA sao:
COMPRADOR
	DTMOV
	NUNOTA
	NUMNOTA
	CODPARC
	RAZAOSOCIAL
	CODTIPOPER
	VLRNOTA





















SELECT
APELIDO,
COUNT(*) QTD_PEDIDOS


FROM TGFCAB CAB
JOIN TGFVEN VEN USING (CODVEND)
WHERE TIPMOV IN ('O')
GROUP BY APELIDO

/*('C','O','J','Q'

F_DESCROPC('TGFCAB','TIPMOV',TGFCAB.TIPMOV) AS DESC_TIPMOV,
)*/




SELECT
DECODE(VEN.APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',VEN.APELIDO) AS COMPRADOR,
CAB.DTMOV,
CAB.NUNOTA,
CAB.NUMNOTA,
CAB.CODPARC,
PAR.RAZAOSOCIAL,
CAB.CODTIPOPER,
CAB.VLRNOTA
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
WHERE TIPMOV IN ('O')
AND DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO) = 'TANIA'



SELECT
DECODE(VEN.APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',VEN.APELIDO) AS COMPRADOR,
CAB.DTMOV,
CAB.NUNOTA,
CAB.NUMNOTA,
F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS DESC_TIPMOV,
CAB.CODPARC,
PAR.RAZAOSOCIAL,
CAB.CODTIPOPER,
CAB.VLRNOTA
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
WHERE TIPMOV IN ('Q')
ORDER BY CAB.NUNOTA DESC
--AND DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO) = 'TANIA'

```
WITH BAS AS( SELECT
ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS ORDEM,
DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO) AS COMPRADOR,
SUM(CASE WHEN CAB.NUMCOTACAO IS NULL THEN 1 END) AS SEM_COTACAO,
SUM(CASE WHEN CAB.NUMCOTACAO IS NOT NULL THEN 1 END) AS COM_COTACAO,
COUNT(*) QTD_PEDIDOS,
SUM(CAB.VLRNOTA) AS VLRNOTA,
SUM(CASE WHEN CAB.NUMCOTACAO IS NULL THEN CAB.VLRNOTA END) AS VLR_SEM_COTACAO,
SUM(CASE WHEN CAB.NUMCOTACAO IS NOT NULL THEN CAB.VLRNOTA END) AS VLR_COM_COTACAO
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
WHERE TIPMOV IN ('O')
GROUP BY 
DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO)
ORDER BY 2 DESC)
SELECT COMPRADOR,VLRNOTA,VLR_SEM_COTACAO,VLR_COM_COTACAO, QTD_PEDIDOS,SEM_COTACAO,COM_COTACAO FROM BAS WHERE ORDEM <= 4
UNION ALL
SELECT 'OUTROS' AS COMPRADOR, SUM(VLRNOTA) AS VLRNOTA,SUM(VLR_SEM_COTACAO) AS VLR_SEM_COTACAO,SUM(VLR_COM_COTACAO) AS VLR_COM_COTACAO,
SUM(QTD_PEDIDOS) AS QTD_PEDIDOS, SUM(SEM_COTACAO) AS SEM_COTACAO, SUM(COM_COTACAO) AS COM_COTACAO FROM BAS WHERE ORDEM > 4



/*

('C','O','J','Q')
F_DESCROPC('TGFCAB','TIPMOV',TGFCAB.TIPMOV) AS DESC_TIPMOV,
-<SEM VENDEDOR>-

*/

	
	
	SELECT
NUMCOTACAO,
SITUACAO,
F_DESCROPC('TGFITC','SITUACAO',TGFITC.SITUACAO) AS DESC_SITUACAO,
NUNOTACPA,
SEQNOTACPA
FROM TGFITC
WHERE SITUACAO = 'A'



