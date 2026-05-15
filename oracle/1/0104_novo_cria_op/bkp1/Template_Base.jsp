<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Template Base</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

<style>
    /* Estilos para o body */
    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8f9fa;
        padding-top: 50px !important;
    }

    /* Fixed header styles */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
    }
    
    .header-logo {
        position: absolute;
        left: 20px;
        display: flex;
        align-items: center;
    }
    
    .header-logo img {
        width: 35px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
    }
    
    .header-logo img:hover {
        transform: scale(1.1);
    }
    
    .header-title {
        color: white;
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0;
        text-align: center;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* Responsividade */
    @media (max-width: 768px) {
        .header-title {
            font-size: 1.2rem;
        }
        
        .header-logo {
            left: 10px;
        }
        
        .header-logo img {
            width: 30px;
        }
        
        .fixed-header {
            height: 45px;
            padding: 0 10px;
        }
        
        body {
            padding-top: 45px !important;
        }
    }
</style>
</head>

<body class="bg-light">
    <!-- Fixed Header -->
    <div class="fixed-header">
        <div class="header-logo">
            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
                <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
            </a>
        </div>
        <h1 class="header-title">Template Base</h1>
    </div>

    
</body>
</html>