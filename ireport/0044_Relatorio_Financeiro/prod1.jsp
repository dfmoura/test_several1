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
    <title>Dashboard com Chart.js</title>
    <style>

    </style>
    
    <snk:load/>
</head>
<body>
    <snk:query var="base">
select
fin.nufin,
fin.numnota,
fin.dtneg,
fin.dtvenc,
fin.dhbaixa,
case 
when fin.recdesp = 1 then fin.vlrdesdob
when fin.recdesp = -1  then fin.vlrdesdob*-1 end vlrdesdob,
fin.codparc||'-'||par.razaosocial razaosocial,
fin.codnat||'-'||nat.descrnat descrnat,
fin.historico
from tgffin fin
inner join tgfnat nat on fin.codnat = nat.codnat
inner join tgfpar par on fin.codparc = par.codparc
where 
  ((:p_verificacao = 1 and fin.dtvenc between :P_PERIODO and :P_PERIODO1)
  or
  (:p_verificacao = 2 and fin.dhbaixa between :P_PERIODO and :P_PERIODO1))
and (fin.codnat in :P_CODNAT)
and (
(:P_RECDESP = 1 )
OR
(:P_RECDESP = 2 AND fin.recdesp = 1)
OR
(:P_RECDESP = 3 AND fin.recdesp = -1)
)

and ((fin.PROVISAO = 'S' AND fin.DHBAIXA IS NULL) OR fin.PROVISAO = 'N')
    </snk:query>





<script></script>

 </body>
</html>
