<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grid Tree</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <snk:load />
    <style>
        /* Add custom CSS styling here */
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
            <div id="gridTree">
                <!-- Tree structure will be generated here -->
            </div>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    $(document).ready(function () {
        var dias = ${dias.rows};
        var gridTree = $('#gridTree');

        // Group by CODCENCUS and DESCRCENCUS
        var groupedByCencus = {};
        dias.forEach(function (dia) {
            var key = dia.CODCENCUS + '-' + dia.DESCRCENCUS;
            if (!groupedByCencus[key]) {
                groupedByCencus[key] = [];
            }
            groupedByCencus[key].push(dia);
        });

        // Generate tree structure
        Object.keys(groupedByCencus).forEach(function (key) {
            var cencusData = groupedByCencus[key];
            var cencusRow = $('<div class="cencus-row"></div>');

            cencusData.forEach(function (data) {
                var cencusCell = $('<div class="cencus-cell"></div>').text(data.CODCENCUS + ' - ' + data.DESCRCENCUS);
                cencusCell.on('click', function () {
                    // Toggle visibility of children on click
                    $(this).next().toggle();
                });
                cencusRow.append(cencusCell);

                var natData = data.natData;
                var natRow = $('<div class="nat-row"></div>').hide();
                natData.forEach(function (nat) {
                    var natCell = $('<div class="nat-cell"></div>').text(nat.CODNAT + ' - ' + nat.DESCRNAT + ' - ' + nat.VLRBAIXA);
                    natRow.append(natCell);
                });

                cencusRow.append(natRow);
            });

            gridTree.append(cencusRow);
        });
    });
</script>

</body>
</html>
