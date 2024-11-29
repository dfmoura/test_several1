<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grid Tree</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <snk:load />
<style>
        /* Custom CSS */
        .tree {
            overflow: auto;
        }
        .tree table {
            width: 100%;
        }
        .tree th,
        .tree td {
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
        }
        .tree th {
            background-color: #f2f2f2;
        }
        .tree tr:hover {
            background-color: #f5f5f5;
        }
        .tree .child-row {
            display: none;
        }
        .tree .parent-row:hover .child-row {
            display: table-row;
        }
    </style>
</head>
<body>

<snk:query var="dias">
    SELECT 
        CODCENCUS,
        DESCRCENCUS,
        CODNAT,
        DESCRNAT,
        VLRBAIXA
    FROM VGF_RESULTADO_GM
    WHERE DHBAIXA BETWEEN '01-01-2024' AND '03-01-2024'
</snk:query>

<div class="container">
    <div class="row">
        <div class="col">
            <div class="tree">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>CODCENCUS</th>
                            <th>DESCRCENCUS</th>
                            <th>CODNAT</th>
                            <th>DESCRNAT</th>
                            <th>VLRBAIXA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <%-- Loop through SQL query result and generate table rows --%>
                        <c:forEach var="dia" items="${dias.rows}">
                            <tr class="parent-row">
                                <td>${dia.CODCENCUS}</td>
                                <td>${dia.DESCRCENCUS}</td>
                                <td>${dia.CODNAT}</td>
                                <td>${dia.DESCRNAT}</td>
                                <td>${dia.VLRBAIXA}</td>
                            </tr>
                            <%-- Child row for more detailed information, assuming nested data --%>
                            <tr class="child-row">
                                <td colspan="5">
                                    <p>Additional Details:</p>
                                    <p>Placeholder for detailed information about ${dia.DESCRCENCUS}</p>
                                </td>
                            </tr>
                        </c:forEach>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    // Add click event listener to toggle child rows
    $(document).ready(function(){
        $('.parent-row').click(function(){
            $(this).next('.child-row').toggle();
        });
    });
</script>
</body>
</html>
