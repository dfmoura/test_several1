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

                        <snk:query var="dias">

                            select
                            anc.codparc as cod_parc
                            , par.razaosocial as parceiro
                            , anc.codanalise
                            , anc.abempresa as abertura_empresa
                            , anc.conserasa as consulta_serasa
                            , anc.scorserasa as score_serasa
                            , anc.obsserasa as obs_serasa
                            , anc.anodre as ano_dre
                            , anc.recdre as rec_dre
                            , anc.lucdre
                            , anc.predre
                            , anc.dadosir
                            , anc.pretcompra
                            , anc.catfianca
                            , anc.observacoes
                            , anc.parecer
                            , anc.anoanalise
                            , anc.anofat
                            , anc.valorfat
                            from ad_ancredito anc
                            inner join tgfpar par on anc.codparc = par.codparc
                            where anc.codparc = :A_CODPARC


                        </snk:query>


                        <c:forEach items="${dias.rows}" var="row">

                            <div>Análise de Crédito</div>


                            <div>${row.cod_parc}</div>
                            <div>${row.parceiro}</div>
                            <div>${row.codanalise}</div>
                            <div>${row.abertura_empresa}</div>
                            <div>${row.consulta_serasa}</div>
                            <div>${row.score_serasa}</div>
                            <div>${row.obs_serasa}</div>
                            <div>${row.ano_dre}</div>
                            <div>${row.rec_dre}</div>
                            <div>${row.lucdre}</div>
                            <div>${row.predre}</div>
                            <div>${row.dadosir}</div>
                            <div>${row.pretcompra}</div>
                            <div>${row.catfianca}</div>
                            <div>${row.observacoes}</div>
                            <div>${row.parecer}</div>
                            <div>${row.anoanalise}</div>
                            <div>${row.anofat}</div>
                            <div>${row.valorfat}</div>

                        </c:forEach>
                    </body>

                    </html>