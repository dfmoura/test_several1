
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="path/to/chartjs/dist/chart.umd.js"></script>
   
  

    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f7fa;
            margin: 0;
            padding: 0;
        }

        .container {
            height: 100vh;
            display: flex;
        }

        .sidebar {
            width: 250px;
            background-color: #fff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }

        .content {
            flex: 1;
            padding: 20px;
        }

        .sidebar h2 {
            text-align: center;
            font-size: 24px;
            margin-bottom: 20px;
        }

        .menu-item {
            margin-bottom: 15px;
            font-size: 18px;
            color: #333;
            padding: 10px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .menu-item:hover {
            background-color: #f0f0f0;
        }

        .menu-item.active {
            background-color: #007bff;
            color: white;
        }

        .menu-item i {
            margin-right: 10px;
        }

        .card {
            background-color: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        .card-header {
            font-size: 20px;
            margin-bottom: 15px;
        }

        .card-content {
            display: flex;
            justify-content: space-between;
        }

        .card-content div {
            width: 30%;
        }

        .graph {
            height: 150px;
            background-color: #eaeaea;
            margin-top: 10px;
        }

        .user-list {
            list-style: none;
            padding: 0;
        }

        .user-list li {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ccc;
        }

        .user-list li:last-child {
            border-bottom: none;
        }

        .user-list li img {
            border-radius: 50%;
            width: 40px;
            height: 40px;
        }

        .user-list .name {
            flex: 1;
            margin-left: 10px;
        }

        .performance-table {
            width: 100%;
            border-collapse: collapse;
        }

        .performance-table th, .performance-table td {
            padding: 12px;
            border: 1px solid #ddd;
            text-align: left;
        }

        .performance-table th {
            background-color: #f8f8f8;
        }

        .btn-back {
        display: inline-block;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        font-size: 16px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        text-align: center;
        margin: 20px;
        text-decoration: none;
    }

    .btn-back:hover {
        background-color: #0056b3;
    }

    .btn-back i {
        margin-right: 8px;
    }


    </style>
</head>
<body>

    <div class="container">
        <div class="sidebar">
            <h2>Menu</h2>
             
            <div class="menu-item" onclick="goToPage('principal.jsp')">
                
                <i class="fas fa-chart-bar"></i> Principal
            </div>
        </div>

        <div class="content">
            <div class="card">
                <div class="card-header">Atividades por Executante</div>
                <table class="performance-table">
                   
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>


function goToPage(page) {
    window.location.href = page;
}
    </script>
</body>
</html>
