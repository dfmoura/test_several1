<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="br.com.sankhya.modelcore.auth.AuthenticationInfo" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>



        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tabela com Consultas SQL</title>
            <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
            <snk:load />

            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                table, th, td {
                    border: 1px solid #ddd;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                }
                th {
                    background-color: #4CAF50;
                    color: white;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                .loading {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 18px;
                }
            </style>
        </head>
        <body>
        

            
                <h1>TESTE</h1>
        
                <script>
                    var idUsuario = '<%= ((AuthenticationInfo) session.getAttribute ("usuarioLogado")).getUserID ().toString () %>';
        
                    JX.consultar (`
                        SELECT *
                          FROM TSIUSU USU
                         WHERE USU.CODUSU = ` + idUsuario
                    ).then (usuariosRetornados => {
        
                        document.querySelector ('h1').innerHTML = usuariosRetornados [0]['CODUSU'];
        
                    });
                </script>            
        </body>
        </html>
        