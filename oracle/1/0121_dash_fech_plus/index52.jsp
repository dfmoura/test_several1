<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard Fechamento Plus</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link
      rel="stylesheet"
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"
    />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <!-- SheetJS para exportação Excel -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <!-- jsPDF para exportação PDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>

    <style>
      /* Estilos base */
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding-top: 40px !important;
        min-height: 100vh;
      }

      /* Fixed header styles */
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 35px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
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
        width: 22px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
      }

      .header-logo img:hover {
        transform: scale(1.1);
      }

      .header-title {
        color: white;
        font-size: 1rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 1px;
      }

      /* Filtro dropdown */
      .filter-container {
        position: fixed;
        top: 40px;
        left: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(0, 138, 112, 0.1);
        padding: 6px 20px;
        z-index: 999;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }

      .filter-label {
        font-size: 11px;
        font-weight: 600;
        color: #6e6e6e;
        margin-right: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .filter-dropdown {
        background: white;
        border: 1px solid rgba(0, 138, 112, 0.2);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12px;
        color: #2c3e50;
        font-weight: 500;
        min-width: 150px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      }

      .filter-dropdown:hover {
        border-color: #008a70;
        box-shadow: 0 3px 8px rgba(0, 138, 112, 0.15);
        transform: translateY(-1px);
      }

      .filter-dropdown:focus {
        outline: none;
        border-color: #008a70;
        box-shadow: 0 0 0 2px rgba(0, 138, 112, 0.2);
      }

      /* Container principal */
      .main-container {
        padding: 5px 20px;
        max-width: 1400px;
        margin: 0 auto;
        margin-top: 55px;
      }

      /* Cards superiores */
      .dashboard-card {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: none;
        overflow: hidden;
        height: 95px;
        position: relative;
      }

      .dashboard-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      }

      .dashboard-card .card-body {
        padding: 12px 15px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
      }

      .card-icon {
        position: absolute;
        top: 15px;
        right: 15px;
        width: 45px;
        height: 45px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
      }

      .card-title {
        font-size: 13px;
        font-weight: 600;
        color: #6e6e6e;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .card-value {
        font-size: 20px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
        line-height: 1.1;
      }

      .card-subtitle {
        font-size: 12px;
        color: #9c9c9c;
        font-weight: 500;
      }

      /* Cores específicas dos cards */
      .card-faturamento .card-icon {
        background: linear-gradient(135deg, #00afa0, #008a70);
      }

      .card-meta .card-icon {
        background: linear-gradient(135deg, #00b4cd, #00695e);
      }

      .card-comissao .card-icon {
        background: linear-gradient(135deg, #ffb914, #f56e1e);
      }

      /* Cards dinâmicos de variáveis - Grid 5 por linha */
      .grid-variable-card {
        background: white;
        border-radius: 10px;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
        padding: 8px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
        border-left: 3px solid #008a70;
        height: 90px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .grid-variable-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      }

      .grid-card-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
      }

      .grid-card-icon {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        background: linear-gradient(135deg, #008a70, #00695e);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        color: white;
        font-size: 11px;
      }

      .grid-card-title {
        font-size: 11px;
        font-weight: 700;
        color: #2c3e50;
        margin: 0;
        line-height: 1.2;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .grid-card-percentage {
        font-size: 16px;
        font-weight: 800;
        color: #008a70;
        text-align: right;
        min-width: 40px;
      }

      .grid-card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .grid-card-main-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .grid-card-vendors {
        font-size: 9px;
        color: #6c757d;
        font-weight: 600;
      }

      .grid-card-details {
        display: flex;
        justify-content: space-between;
        gap: 4px;
      }

      .grid-detail-item {
        text-align: center;
        padding: 3px 4px;
        background: #f8f9fa;
        border-radius: 4px;
        border: 1px solid #e9ecef;
        flex: 1;
      }

      .grid-detail-label {
        font-size: 7px;
        font-weight: 600;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        margin-bottom: 2px;
        line-height: 1;
      }

      .grid-detail-value {
        font-size: 8px;
        font-weight: 700;
        color: #495057;
        line-height: 1;
      }

      .grid-detail-value.currency {
        color: #28a745;
      }

      .grid-detail-value.number {
        color: #007bff;
      }

      /* Responsividade para grid de 5 cards */
      @media (max-width: 1200px) {
        .grid-variable-card {
          height: 95px;
        }
      }

      @media (max-width: 992px) {
        .grid-variable-card {
          height: 100px;
        }
      }

      @media (max-width: 768px) {
        .grid-variable-card {
          height: 90px;
        }
      }

      /* Seção de variáveis dinâmica */
      .variables-section {
        margin-top: -15px;
      }

      .variables-section .chart-container {
        min-height: auto;
        height: auto;
        padding: 10px 15px;
        position: relative;
      }

      .variables-section .chart-container.has-cards {
        padding: 10px 15px;
        min-height: auto;
      }

      /* Rolagem horizontal para cards de variáveis */
      .horizontal-scroll-wrapper {
        position: relative;
        padding: 5px 0;
      }

      .horizontal-scroller {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 8px 5px;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 138, 112, 0.3) transparent;
      }

      .horizontal-scroller::-webkit-scrollbar {
        height: 8px;
      }

      .horizontal-scroller::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 10px;
      }

      .horizontal-scroller::-webkit-scrollbar-thumb {
        background: rgba(0, 138, 112, 0.3);
        border-radius: 10px;
      }

      .horizontal-scroller::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 138, 112, 0.5);
      }

      /* Cards em modo horizontal */
      .grid-variable-card.horizontal-mode {
        flex: 0 0 auto;
        width: 210px;
        min-width: 210px;
        height: 100px;
        margin-bottom: 0;
      }

      /* Botões de navegação horizontal */
      .scroll-nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        border: 1px solid rgba(0, 138, 112, 0.2);
        color: #008a70;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
        opacity: 0.9;
      }

      .scroll-nav-btn:hover {
        background: #008a70;
        color: white;
        opacity: 1;
        box-shadow: 0 6px 16px rgba(0, 138, 112, 0.3);
      }

      .scroll-nav-btn.left {
        left: -10px;
      }

      .scroll-nav-btn.right {
        right: -10px;
      }

      .scroll-nav-btn i {
        font-size: 14px;
      }

      .scroll-nav-btn:focus {
        outline: 2px solid rgba(0, 138, 112, 0.3);
      }

      /* Seção de gráficos */
      .charts-section {
        margin-top: 0px;
        margin-bottom: 10px;
      }

      .chart-container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        padding: 15px;
        margin-bottom: 5px;
        height: 320px;
      }

      .chart-title {
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 10px;
        text-align: center;
        position: relative;
      }

      .chart-title::after {
        content: "";
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 3px;
        background: linear-gradient(135deg, #008a70, #00afa0);
        border-radius: 2px;
      }

      .chart-wrapper {
        height: 250px;
        position: relative;
      }

      /* Loading states */
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        flex-direction: column;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        color: #6e6e6e;
        font-size: 14px;
        font-weight: 500;
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .header-title {
          font-size: 1rem;
        }

        .header-logo {
          left: 10px;
        }

        .header-logo img {
          width: 22px;
        }

        .fixed-header {
          height: 30px;
          padding: 0 10px;
        }

        body {
          padding-top: 35px !important;
        }

        .filter-container {
          top: 35px;
          padding: 5px 15px;
        }

        .main-container {
          margin-top: 50px;
        }

        .main-container {
          padding: 5px 15px;
        }

        .dashboard-card {
          height: 85px;
          margin-bottom: 10px;
        }

        .dashboard-card .card-body {
          padding: 8px 12px;
        }

        .card-value {
          font-size: 18px;
        }

        .chart-container {
          padding: 12px;
          height: 280px;
        }

        .chart-wrapper {
          height: 220px;
        }
      }

      @media (max-width: 576px) {
        .main-container {
          padding: 3px 10px;
        }

        .dashboard-card {
          height: 80px;
        }

        .dashboard-card .card-body {
          padding: 6px 10px;
        }

        .card-value {
          font-size: 16px;
        }

        .card-icon {
          width: 35px;
          height: 35px;
          font-size: 18px;
        }
      }

      /* Estilos para overlays e modais */
      .overlay-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(4px);
      }

      .overlay-modal.show {
        display: flex;
      }

      .overlay-content {
        background: white;
        border-radius: 20px;
        padding: 0;
        max-width: 95vw;
        width: 95vw;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .overlay-header {
        background: linear-gradient(135deg, #008a70, #00695e);
        color: white;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 20px 20px 0 0;
      }

      .overlay-title {
        font-size: 1.3rem;
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .overlay-title i {
        font-size: 1.5rem;
      }

      .overlay-close {
        width: 40px;
        height: 40px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 18px;
      }

      .overlay-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .overlay-toolbar {
        background: #f8f9fa;
        padding: 10px 20px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        flex-wrap: wrap;
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 300px;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .search-container {
        position: relative;
        flex: 1;
        max-width: 400px;
      }

      .search-input {
        width: 100%;
        padding: 10px 15px 10px 45px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-size: 14px;
        background: white;
        transition: all 0.3s;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      }

      .search-input:focus {
        outline: none;
        border-color: #008a70;
        box-shadow: 0 0 0 3px rgba(0, 138, 112, 0.1);
      }

      .search-icon {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: #6c757d;
        font-size: 14px;
      }

      .btn-overlay {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        background: white;
        color: #495057;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        text-decoration: none;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      }

      .btn-overlay:hover {
        background: #f8f9fa;
        border-color: #dee2e6;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }

      .btn-overlay.btn-success {
        background: #50af32;
        border-color: #50af32;
        color: white;
      }

      .btn-overlay.btn-success:hover {
        background: #45a02a;
        border-color: #45a02a;
        box-shadow: 0 4px 12px rgba(80, 175, 50, 0.3);
      }

      .btn-overlay.btn-primary {
        background: #008a70;
        border-color: #008a70;
        color: white;
      }

      .btn-overlay.btn-primary:hover {
        background: #00695e;
        border-color: #00695e;
        box-shadow: 0 4px 12px rgba(0, 138, 112, 0.3);
      }

      .overlay-info {
        background: #f8f9fa;
        padding: 12px 30px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 15px;
      }

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #6c757d;
      }

      .info-value {
        font-weight: 600;
        color: #495057;
      }

      .overlay-table-container {
        overflow-x: auto;
        position: relative;
        background: white;
        max-height: 60vh;
        overflow-y: auto;
      }

      .overlay-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        background: white;
      }

      .overlay-table thead {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .overlay-table th {
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
        white-space: nowrap;
        position: relative;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .overlay-table th.sortable {
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        padding-right: 30px;
      }

      .overlay-table th.sortable:hover {
        background: #e9ecef;
        color: #008a70;
      }

      .sort-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #6c757d;
        font-size: 12px;
        transition: all 0.2s;
      }

      .overlay-table th.sortable:hover .sort-icon {
        color: #008a70;
      }

      .overlay-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f3f4;
        vertical-align: middle;
        color: #495057;
        font-size: 13px;
      }

      .overlay-table tbody tr {
        transition: all 0.15s;
      }

      .overlay-table tbody tr:hover {
        background: linear-gradient(
          135deg,
          rgba(0, 138, 112, 0.02) 0%,
          rgba(0, 138, 112, 0.05) 100%
        );
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .overlay-footer {
        background: #f8f9fa;
        padding: 15px 30px;
        border-top: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }

      .footer-left {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .footer-right {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .page-info {
        font-size: 14px;
        color: #6c757d;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .page-size-select {
        padding: 8px 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: white;
        font-size: 14px;
        color: #495057;
        cursor: pointer;
        transition: all 0.2s;
      }

      .page-size-select:focus {
        outline: none;
        border-color: #008a70;
      }

      .pagination {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .page-btn {
        width: 36px;
        height: 36px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: white;
        color: #6c757d;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
      }

      .page-btn:hover:not(:disabled) {
        background: #008a70;
        border-color: #008a70;
        color: white;
        transform: translateY(-1px);
      }

      .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .page-btn.active {
        background: #008a70;
        border-color: #008a70;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.3);
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100;
        backdrop-filter: blur(2px);
      }

      .loading-overlay.show {
        display: flex;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e9ecef;
        border-top: 4px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* Badges para status */
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        border: 1px solid transparent;
      }

      .badge-success {
        background: rgba(80, 175, 50, 0.1);
        color: #50af32;
        border-color: rgba(80, 175, 50, 0.2);
      }

      .badge-warning {
        background: rgba(255, 185, 20, 0.1);
        color: #cc9200;
        border-color: rgba(255, 185, 20, 0.2);
      }

      .badge-danger {
        background: rgba(227, 6, 19, 0.1);
        color: #e30613;
        border-color: rgba(227, 6, 19, 0.2);
      }

      .badge-info {
        background: rgba(0, 180, 205, 0.1);
        color: #00b4cd;
        border-color: rgba(0, 180, 205, 0.2);
      }

      .badge-neutral {
        background: #f8f9fa;
        color: #6c757d;
        border-color: #dee2e6;
      }

      /* Cursor pointer para cards clicáveis */
      .dashboard-card {
        cursor: pointer;
      }

      .dashboard-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      }

      /* Estilos para painel de filtros avançados */
      .filters-panel {
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        padding: 12px 20px;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .filters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e9ecef;
      }

      .filters-header h4 {
        margin: 0;
        color: #495057;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .filters-header h4 i {
        color: #008a70;
      }

      .btn-clear-filters {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-clear-filters:hover {
        background: #c82333;
        transform: translateY(-1px);
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 12px;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .filter-group label {
        font-size: 12px;
        font-weight: 600;
        color: #495057;
        margin: 0;
      }

      .filter-input,
      .filter-select {
        padding: 6px 10px;
        border: 2px solid #e9ecef;
        border-radius: 6px;
        font-size: 13px;
        background: white;
        transition: all 0.2s;
        width: 100%;
      }

      .filter-input:focus,
      .filter-select:focus {
        outline: none;
        border-color: #008a70;
        box-shadow: 0 0 0 3px rgba(0, 138, 112, 0.1);
      }

      .range-inputs {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .range-inputs .filter-input {
        flex: 1;
      }

      .range-inputs span {
        font-size: 11px;
        color: #6c757d;
        font-weight: 500;
        white-space: nowrap;
      }

      .filters-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
        padding-top: 8px;
        border-top: 1px solid #e9ecef;
      }

      .filters-actions .btn-overlay {
        min-width: 120px;
        padding: 6px 12px;
        font-size: 12px;
      }

      /* Indicador de filtros ativos */
      .filters-active-indicator {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #dc3545;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .btn-overlay.has-active-filters {
        position: relative;
      }

      /* Responsividade para filtros */
      @media (max-width: 768px) {
        .filters-panel {
          padding: 8px 15px;
        }

        .filters-grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .filters-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .filters-actions .btn-overlay {
          min-width: auto;
        }

        .range-inputs {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }

        .range-inputs span {
          text-align: center;
          order: -1;
        }
      }

      /* Responsividade para overlays */
      @media (max-width: 768px) {
        .overlay-content {
          width: 98vw;
          max-height: 95vh;
        }

        .overlay-header {
          padding: 8px 15px;
        }

        .overlay-title {
          font-size: 1.1rem;
        }

        .overlay-toolbar {
          padding: 8px 15px;
          flex-direction: column;
          align-items: stretch;
        }

        .toolbar-left,
        .toolbar-right {
          justify-content: center;
        }

        .search-container {
          max-width: none;
        }

        .overlay-info {
          padding: 10px 20px;
          flex-direction: column;
          align-items: stretch;
        }

        .overlay-footer {
          padding: 12px 20px;
          flex-direction: column;
          align-items: stretch;
        }

        .footer-left,
        .footer-right {
          justify-content: center;
        }

        .overlay-table th,
        .overlay-table td {
          padding: 6px 10px;
        }
      }
    </style>
  </head>

  <body>
    <!-- Fixed Header -->
    <div class="fixed-header">
      <div class="header-logo">
        <a
          href="https://neuon.com.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg"
            alt="Neuon Logo"
          />
        </a>
      </div>
      <h1 class="header-title">Dashboard Fechamento Plus</h1>
    </div>

    <!-- Filtro Dropdown -->
    <div class="filter-container">
      <span class="filter-label">Fechamento:</span>
      <select class="filter-dropdown" id="fechamentoFilter">
        <option value="">Carregando...</option>
      </select>
    </div>

    <div class="main-container">
      <!-- Cards Superiores -->
      <div class="row mb-0">
        <div class="col-lg-4 col-md-6 mb-3">
          <div
            class="card dashboard-card card-faturamento"
            onclick="openFaturamentoOverlay()"
          >
            <div class="card-body">
              <div class="card-icon">
                <i class="fas fa-percentage"></i>
              </div>
              <div>
                <div class="card-title">ATINGIRAM GATILHO</div>
                <div class="card-value" id="faturamento-valor">0%</div>
                <div class="card-subtitle">Percentual</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4 col-md-6 mb-3">
          <div
            class="card dashboard-card card-meta"
            onclick="openMetaOverlay()"
          >
            <div class="card-body">
              <div class="card-icon">
                <i class="fas fa-bullseye"></i>
              </div>
              <div>
                <div class="card-title">Benefício Previsto</div>
                <div class="card-value" id="meta-valor">R$ 0,00</div>
                <div class="card-subtitle">Valor Previsto</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4 col-md-6 mb-3">
          <div
            class="card dashboard-card card-comissao"
            onclick="openBeneficioOverlay()"
            style="cursor: pointer"
          >
            <div class="card-body">
              <div class="card-icon">
                <i class="fas fa-coins"></i>
              </div>
              <div>
                <div class="card-title">Benefício Realizado</div>
                <div class="card-value" id="comissao-valor">R$ 0,00</div>
                <div class="card-subtitle">Valor Benefício</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Seção de Gráficos -->
      <div class="charts-section">
        <div class="row">
          <!-- Gráfico de Linha - Real x Meta Mês a Mês -->
          <div class="col-lg-12 mb-3">
            <div class="chart-container">
              <h3 class="chart-title">
                Real x Meta - Evolução Mensal Faturamento
              </h3>
              <div class="chart-wrapper">
                <canvas id="lineChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Seção de Cards em Grid de Variáveis -->
      <div class="variables-section">
        <div class="row">
          <div class="col-lg-12 mb-3">
            <div class="chart-container" id="variablesContainer">
              <h3 class="chart-title" style="margin-bottom: 15px">
                <i class="fas fa-chart-pie"></i>
                Análise de Variáveis de Benefício
              </h3>
              <div class="horizontal-scroll-wrapper">
                <button
                  class="scroll-nav-btn left"
                  id="scrollLeftBtn"
                  aria-label="Rolar para esquerda"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <div
                  id="gridVariablesCardsContainer"
                  class="horizontal-scroller"
                >
                  <!-- Cards serão inseridos dinamicamente via JavaScript -->
                  <div class="text-center py-3" style="width: 100%">
                    <div
                      class="spinner-border text-primary"
                      role="status"
                      style="width: 1.5rem; height: 1.5rem"
                    >
                      <span class="sr-only">Carregando variáveis...</span>
                    </div>
                    <p class="mt-2 text-muted mb-0" style="font-size: 12px">
                      Carregando dados das variáveis...
                    </p>
                  </div>
                </div>
                <button
                  class="scroll-nav-btn right"
                  id="scrollRightBtn"
                  aria-label="Rolar para direita"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay Modal para Faturamento -->
    <div class="overlay-modal" id="faturamentoModal">
      <div class="overlay-content">
        <div class="overlay-header">
          <h2 class="overlay-title">
            <i class="fas fa-percentage"></i>
            Detalhamento - Atingiram Gatilho
          </h2>
          <button
            class="overlay-close"
            onclick="closeOverlay('faturamentoModal')"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="overlay-toolbar">
          <div class="toolbar-left">
            <div class="search-container">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                id="faturamentoSearch"
                class="search-input"
                placeholder="Busca geral por vendedor, código..."
              />
            </div>
            <button class="btn-overlay" onclick="toggleFaturamentoFilters()">
              <i class="fas fa-filter"></i>
              Filtros Avançados
            </button>
            <button class="btn-overlay" onclick="refreshFaturamentoData()">
              <i class="fas fa-sync-alt"></i>
              Atualizar
            </button>
          </div>
          <div class="toolbar-right">
            <button
              class="btn-overlay btn-success"
              onclick="exportFaturamentoToExcel()"
            >
              <i class="fas fa-file-excel"></i>
              Excel
            </button>
            <button
              class="btn-overlay btn-primary"
              onclick="exportFaturamentoToPDF()"
            >
              <i class="fas fa-file-pdf"></i>
              PDF
            </button>
          </div>
        </div>

        <!-- Painel de Filtros Avançados -->
        <div
          class="filters-panel"
          id="faturamentoFiltersPanel"
          style="display: none"
        >
          <div class="filters-header">
            <h4><i class="fas fa-filter"></i> Filtros Avançados</h4>
            <button
              class="btn-clear-filters"
              onclick="clearFaturamentoFilters()"
            >
              <i class="fas fa-times"></i> Limpar Filtros
            </button>
          </div>
          <div class="filters-grid">
            <div class="filter-group">
              <label>Código Vendedor:</label>
              <input
                type="text"
                id="faturamentoFilterCodvend"
                class="filter-input"
                placeholder="Ex: 123 ou 123,456"
              />
            </div>
            <div class="filter-group">
              <label>Nome Vendedor:</label>
              <input
                type="text"
                id="faturamentoFilterApelido"
                class="filter-input"
                placeholder="Ex: João ou João,Maria"
              />
            </div>
            <div class="filter-group">
              <label>% Real:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="faturamentoFilterPercRealMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.1"
                  min="0"
                  max="1000"
                />
                <span>até</span>
                <input
                  type="number"
                  id="faturamentoFilterPercRealMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.1"
                  min="0"
                  max="1000"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Meta Gatilho:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="faturamentoFilterMetaGatMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="faturamentoFilterMetaGatMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Status Gatilho:</label>
              <select id="faturamentoFilterStatus" class="filter-select">
                <option value="">Todos</option>
                <option value="atingido">Gatilho Atingido (≥100%)</option>
                <option value="proximo">Próximo do Gatilho (80-99%)</option>
                <option value="abaixo">Abaixo do Gatilho (<80%)</option>
              </select>
            </div>
          </div>
          <div class="filters-actions">
            <button
              class="btn-overlay btn-primary"
              onclick="applyFaturamentoAdvancedFilters()"
            >
              <i class="fas fa-search"></i> Aplicar Filtros
            </button>
            <button class="btn-overlay" onclick="saveFaturamentoFilters()">
              <i class="fas fa-save"></i> Salvar Filtros
            </button>
            <button class="btn-overlay" onclick="loadFaturamentoFilters()">
              <i class="fas fa-folder-open"></i> Carregar Filtros
            </button>
          </div>
        </div>

        <div class="overlay-info">
          <div class="info-item">
            <i class="fas fa-database"></i>
            <span>Total de registros:</span>
            <span class="info-value" id="faturamentoTotalRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-eye"></i>
            <span>Registros visíveis:</span>
            <span class="info-value" id="faturamentoVisibleRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>Última atualização:</span>
            <span class="info-value" id="faturamentoLastUpdate">-</span>
          </div>
        </div>

        <div class="overlay-table-container">
          <div class="loading-overlay" id="faturamentoLoadingOverlay">
            <div class="spinner"></div>
          </div>

          <table class="overlay-table" id="faturamentoTable">
            <thead>
              <tr>
                <th
                  class="sortable"
                  data-sort="codvend"
                  onclick="sortFaturamentoTable('codvend')"
                >
                  Código Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="apelido"
                  onclick="sortFaturamentoTable('apelido')"
                >
                  Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="percreal"
                  onclick="sortFaturamentoTable('percreal')"
                >
                  % Real <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="metagat"
                  onclick="sortFaturamentoTable('metagat')"
                >
                  Meta Gatilho <i class="fas fa-sort sort-icon"></i>
                </th>
              </tr>
            </thead>
            <tbody id="faturamentoTableBody">
              <!-- Dados serão inseridos via JavaScript -->
            </tbody>
          </table>
        </div>

        <div class="overlay-footer">
          <div class="footer-left">
            <div class="page-info">
              <i class="fas fa-info-circle"></i>
              <span id="faturamentoPageInfo">Mostrando 0-0 de 0 registros</span>
            </div>
            <select
              class="page-size-select"
              id="faturamentoPageSize"
              onchange="changeFaturamentoPageSize()"
            >
              <option value="10">10 por página</option>
              <option value="25" selected>25 por página</option>
              <option value="50">50 por página</option>
              <option value="100">100 por página</option>
            </select>
          </div>
          <div class="footer-right">
            <div class="pagination" id="faturamentoPagination">
              <!-- Botões de paginação serão inseridos via JavaScript -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay Modal para Meta -->
    <div class="overlay-modal" id="metaModal">
      <div class="overlay-content">
        <div class="overlay-header">
          <h2 class="overlay-title">
            <i class="fas fa-bullseye"></i>
            Detalhamento Benefício Previsto
          </h2>
          <button class="overlay-close" onclick="closeOverlay('metaModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="overlay-toolbar">
          <div class="toolbar-left">
            <div class="search-container">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                id="metaSearch"
                class="search-input"
                placeholder="Buscar por vendedor, código..."
              />
            </div>
            <button
              class="btn-overlay btn-secondary has-active-filters"
              onclick="toggleMetaFilters()"
              id="metaFiltersToggle"
            >
              <i class="fas fa-filter"></i>
              Filtros Avançados
              <span
                class="filters-active-indicator"
                id="metaFiltersIndicator"
                style="display: none"
                >0</span
              >
            </button>
            <button class="btn-overlay" onclick="refreshMetaData()">
              <i class="fas fa-sync-alt"></i>
              Atualizar
            </button>
          </div>
          <div class="toolbar-right">
            <button
              class="btn-overlay btn-success"
              onclick="exportMetaToExcel()"
            >
              <i class="fas fa-file-excel"></i>
              Excel
            </button>
            <button class="btn-overlay btn-primary" onclick="exportMetaToPDF()">
              <i class="fas fa-file-pdf"></i>
              PDF
            </button>
          </div>
        </div>

        <!-- Painel de Filtros Avançados para Meta -->
        <div class="filters-panel" id="metaFiltersPanel" style="display: none">
          <div class="filters-header">
            <h4><i class="fas fa-filter"></i> Filtros Avançados</h4>
            <button class="btn-clear-filters" onclick="clearMetaFilters()">
              <i class="fas fa-times"></i>
              Limpar Filtros
            </button>
          </div>
          <div class="filters-grid">
            <div class="filter-group">
              <label>Código Vendedor:</label>
              <input
                type="text"
                id="metaFilterCodvend"
                class="filter-input"
                placeholder="Ex: 123 ou 123,456"
              />
            </div>
            <div class="filter-group">
              <label>Nome Vendedor:</label>
              <input
                type="text"
                id="metaFilterApelido"
                class="filter-input"
                placeholder="Ex: João ou João,Maria"
              />
            </div>
            <div class="filter-group">
              <label>Benefício Previsto:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="metaFilterVlrBenePrevMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="metaFilterVlrBenePrevMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Benefício Realizado:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="metaFilterVlrBeneficioMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="metaFilterVlrBeneficioMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Status Meta:</label>
              <select id="metaFilterStatus" class="filter-select">
                <option value="">Todos</option>
                <option value="atingida">Meta Atingida (≥100%)</option>
                <option value="proxima">Próximo da Meta (80-99%)</option>
                <option value="abaixo">Abaixo da Meta (<80%)</option>
              </select>
            </div>
          </div>
          <div class="filters-actions">
            <button
              class="btn-overlay btn-primary"
              onclick="applyMetaAdvancedFilters()"
            >
              <i class="fas fa-check"></i>
              Aplicar Filtros
            </button>
            <button
              class="btn-overlay btn-secondary"
              onclick="saveMetaFilters()"
            >
              <i class="fas fa-save"></i>
              Salvar Filtros
            </button>
            <button class="btn-overlay btn-outline" onclick="loadMetaFilters()">
              <i class="fas fa-upload"></i>
              Carregar Filtros
            </button>
          </div>
        </div>

        <div class="overlay-info">
          <div class="info-item">
            <i class="fas fa-database"></i>
            <span>Total de registros:</span>
            <span class="info-value" id="metaTotalRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-eye"></i>
            <span>Registros visíveis:</span>
            <span class="info-value" id="metaVisibleRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>Última atualização:</span>
            <span class="info-value" id="metaLastUpdate">-</span>
          </div>
        </div>

        <div class="overlay-table-container">
          <div class="loading-overlay" id="metaLoadingOverlay">
            <div class="spinner"></div>
          </div>

          <table class="overlay-table" id="metaTable">
            <thead>
              <tr>
                <th
                  class="sortable"
                  data-sort="codvend"
                  onclick="sortMetaTable('codvend')"
                >
                  Código Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="apelido"
                  onclick="sortMetaTable('apelido')"
                >
                  Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="vlrbene_prev"
                  onclick="sortMetaTable('vlrbene_prev')"
                >
                  Benefício Previsto <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="vlrbeneficio"
                  onclick="sortMetaTable('vlrbeneficio')"
                >
                  Benefício Realizado <i class="fas fa-sort sort-icon"></i>
                </th>
              </tr>
            </thead>
            <tbody id="metaTableBody">
              <!-- Dados serão inseridos via JavaScript -->
            </tbody>
          </table>
        </div>

        <div class="overlay-footer">
          <div class="footer-left">
            <div class="page-info">
              <i class="fas fa-info-circle"></i>
              <span id="metaPageInfo">Mostrando 0-0 de 0 registros</span>
            </div>
            <select
              class="page-size-select"
              id="metaPageSize"
              onchange="changeMetaPageSize()"
            >
              <option value="10">10 por página</option>
              <option value="25" selected>25 por página</option>
              <option value="50">50 por página</option>
              <option value="100">100 por página</option>
            </select>
          </div>
          <div class="footer-right">
            <div class="pagination" id="metaPagination">
              <!-- Botões de paginação serão inseridos via JavaScript -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay Modal para Detalhamento de Benefício -->
    <div class="overlay-modal" id="beneficioModal">
      <div class="overlay-content">
        <div class="overlay-header">
          <h2 class="overlay-title">
            <i class="fas fa-coins"></i>
            Detalhamento de Benefício Realizado
          </h2>
          <button
            class="overlay-close"
            onclick="closeOverlay('beneficioModal')"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="overlay-toolbar">
          <div class="toolbar-left">
            <div class="search-container">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                id="beneficioSearch"
                class="search-input"
                placeholder="Buscar por vendedor, código..."
              />
            </div>
            <button
              class="btn-overlay btn-secondary has-active-filters"
              onclick="toggleBeneficioFilters()"
              id="beneficioFiltersToggle"
            >
              <i class="fas fa-filter"></i>
              Filtros Avançados
              <span
                class="filters-active-indicator"
                id="beneficioFiltersIndicator"
                style="display: none"
                >0</span
              >
            </button>
            <button class="btn-overlay" onclick="refreshBeneficioData()">
              <i class="fas fa-sync-alt"></i>
              Atualizar
            </button>
          </div>
          <div class="toolbar-right">
            <button
              class="btn-overlay btn-success"
              onclick="exportBeneficioToExcel()"
            >
              <i class="fas fa-file-excel"></i>
              Excel
            </button>
            <button
              class="btn-overlay btn-primary"
              onclick="exportBeneficioToPDF()"
            >
              <i class="fas fa-file-pdf"></i>
              PDF
            </button>
          </div>
        </div>

        <!-- Painel de Filtros Avançados para Benefício -->
        <div
          class="filters-panel"
          id="beneficioFiltersPanel"
          style="display: none"
        >
          <div class="filters-header">
            <h4><i class="fas fa-filter"></i> Filtros Avançados</h4>
            <button class="btn-clear-filters" onclick="clearBeneficioFilters()">
              <i class="fas fa-times"></i>
              Limpar Filtros
            </button>
          </div>
          <div class="filters-grid">
            <div class="filter-group">
              <label>Código Vendedor:</label>
              <input
                type="text"
                id="beneficioFilterCodvend"
                class="filter-input"
                placeholder="Ex: 123 ou 123,456"
              />
            </div>
            <div class="filter-group">
              <label>Nome Vendedor:</label>
              <input
                type="text"
                id="beneficioFilterApelido"
                class="filter-input"
                placeholder="Ex: João ou João,Maria"
              />
            </div>
            <div class="filter-group">
              <label>Benefício Previsto:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="beneficioFilterVlrBenePrevMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="beneficioFilterVlrBenePrevMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Benefício Realizado:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="beneficioFilterVlrBeneficioMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="beneficioFilterVlrBeneficioMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Status Meta:</label>
              <select id="beneficioFilterStatus" class="filter-select">
                <option value="">Todos</option>
                <option value="atingida">Meta Atingida (≥100%)</option>
                <option value="proxima">Próximo da Meta (80-99%)</option>
                <option value="abaixo">Abaixo da Meta (<80%)</option>
              </select>
            </div>
          </div>
          <div class="filters-actions">
            <button
              class="btn-overlay btn-primary"
              onclick="applyBeneficioAdvancedFilters()"
            >
              <i class="fas fa-check"></i>
              Aplicar Filtros
            </button>
            <button
              class="btn-overlay btn-secondary"
              onclick="saveBeneficioFilters()"
            >
              <i class="fas fa-save"></i>
              Salvar Filtros
            </button>
            <button
              class="btn-overlay btn-outline"
              onclick="loadBeneficioFilters()"
            >
              <i class="fas fa-upload"></i>
              Carregar Filtros
            </button>
          </div>
        </div>

        <div class="overlay-info">
          <div class="info-item">
            <i class="fas fa-database"></i>
            <span>Total de registros:</span>
            <span class="info-value" id="beneficioTotalRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-eye"></i>
            <span>Registros visíveis:</span>
            <span class="info-value" id="beneficioVisibleRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>Última atualização:</span>
            <span class="info-value" id="beneficioLastUpdate">-</span>
          </div>
        </div>

        <div class="overlay-table-container">
          <div class="loading-overlay" id="beneficioLoadingOverlay">
            <div class="spinner"></div>
          </div>

          <table class="overlay-table" id="beneficioTable">
            <thead>
              <tr>
                <th
                  class="sortable"
                  data-sort="codvend"
                  onclick="sortBeneficioTable('codvend')"
                >
                  Código Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="apelido"
                  onclick="sortBeneficioTable('apelido')"
                >
                  Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="vlrbene_prev"
                  onclick="sortBeneficioTable('vlrbene_prev')"
                >
                  Benefício Previsto <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="vlrbeneficio"
                  onclick="sortBeneficioTable('vlrbeneficio')"
                >
                  Benefício Realizado <i class="fas fa-sort sort-icon"></i>
                </th>
              </tr>
            </thead>
            <tbody id="beneficioTableBody">
              <!-- Dados serão inseridos via JavaScript -->
            </tbody>
          </table>
        </div>

        <div class="overlay-footer">
          <div class="footer-left">
            <div class="page-info">
              <i class="fas fa-info-circle"></i>
              <span id="beneficioPageInfo">Mostrando 0-0 de 0 registros</span>
            </div>
            <select
              class="page-size-select"
              id="beneficioPageSize"
              onchange="changeBeneficioPageSize()"
            >
              <option value="10">10 por página</option>
              <option value="25" selected>25 por página</option>
              <option value="50">50 por página</option>
              <option value="100">100 por página</option>
            </select>
          </div>
          <div class="footer-right">
            <div class="pagination" id="beneficioPagination">
              <!-- Botões de paginação serão inseridos via JavaScript -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay Modal para Detalhamento Evolução Mensal -->
    <div class="overlay-modal" id="evolucaoMensalModal">
      <div class="overlay-content">
        <div class="overlay-header">
          <h2 class="overlay-title">
            <i class="fas fa-chart-line"></i>
            Detalhamento Evolução Mensal
          </h2>
          <button
            class="overlay-close"
            onclick="closeOverlay('evolucaoMensalModal')"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="overlay-toolbar">
          <div class="toolbar-left">
            <div class="search-container">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                id="evolucaoMensalSearch"
                class="search-input"
                placeholder="Busca geral por vendedor, código..."
              />
            </div>
            <button class="btn-overlay" onclick="toggleEvolucaoMensalFilters()">
              <i class="fas fa-filter"></i>
              Filtros Avançados
            </button>
            <button class="btn-overlay" onclick="refreshEvolucaoMensalData()">
              <i class="fas fa-sync-alt"></i>
              Atualizar
            </button>
          </div>
          <div class="toolbar-right">
            <button
              class="btn-overlay btn-success"
              onclick="exportEvolucaoMensalToExcel()"
            >
              <i class="fas fa-file-excel"></i>
              Excel
            </button>
            <button
              class="btn-overlay btn-primary"
              onclick="exportEvolucaoMensalToPDF()"
            >
              <i class="fas fa-file-pdf"></i>
              PDF
            </button>
          </div>
        </div>

        <!-- Painel de Filtros Avançados -->
        <div
          class="filters-panel"
          id="evolucaoMensalFiltersPanel"
          style="display: none"
        >
          <div class="filters-header">
            <h4><i class="fas fa-filter"></i> Filtros Avançados</h4>
            <button
              class="btn-clear-filters"
              onclick="clearEvolucaoMensalFilters()"
            >
              <i class="fas fa-times"></i> Limpar Filtros
            </button>
          </div>
          <div class="filters-grid">
            <div class="filter-group">
              <label>Código Vendedor:</label>
              <input
                type="text"
                id="evolucaoMensalFilterCodvend"
                class="filter-input"
                placeholder="Ex: 123 ou 123,456"
              />
            </div>
            <div class="filter-group">
              <label>Nome Vendedor:</label>
              <input
                type="text"
                id="evolucaoMensalFilterApelido"
                class="filter-input"
                placeholder="Ex: João ou João,Maria"
              />
            </div>
            <div class="filter-group">
              <label>Valor Previsto:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="evolucaoMensalFilterVlrPrevMin"
                  class="filter-input"
                  placeholder="Mín"
                />
                <span>até</span>
                <input
                  type="number"
                  id="evolucaoMensalFilterVlrPrevMax"
                  class="filter-input"
                  placeholder="Máx"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Valor Real:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="evolucaoMensalFilterVlrRealMin"
                  class="filter-input"
                  placeholder="Mín"
                />
                <span>até</span>
                <input
                  type="number"
                  id="evolucaoMensalFilterVlrRealMax"
                  class="filter-input"
                  placeholder="Máx"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>% Atingido:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="evolucaoMensalFilterPercMin"
                  class="filter-input"
                  placeholder="Mín"
                />
                <span>até</span>
                <input
                  type="number"
                  id="evolucaoMensalFilterPercMax"
                  class="filter-input"
                  placeholder="Máx"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Tabela de Dados -->
        <div class="overlay-table-container">
          <div class="loading-overlay" id="evolucaoMensalLoadingOverlay">
            <div class="spinner"></div>
          </div>

          <table class="overlay-table" id="evolucaoMensalTable">
            <thead>
              <tr>
                <th
                  class="sortable"
                  data-sort="codvend"
                  onclick="sortEvolucaoMensalTable('codvend')"
                >
                  Código Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="apelido"
                  onclick="sortEvolucaoMensalTable('apelido')"
                >
                  Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="vlr_prev"
                  onclick="sortEvolucaoMensalTable('vlr_prev')"
                >
                  Valor Previsto <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="vlr_real"
                  onclick="sortEvolucaoMensalTable('vlr_real')"
                >
                  Valor Real <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="perc"
                  onclick="sortEvolucaoMensalTable('perc')"
                >
                  % Atingido <i class="fas fa-sort sort-icon"></i>
                </th>
              </tr>
            </thead>
            <tbody id="evolucaoMensalTableBody">
              <!-- Dados serão inseridos via JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- Rodapé com paginação -->
        <div class="overlay-footer">
          <div class="footer-left">
            <span class="results-info" id="evolucaoMensalResultsInfo">
              Mostrando 0 de 0 resultados
            </span>
            <select
              class="page-size-select"
              id="evolucaoMensalPageSize"
              onchange="changeEvolucaoMensalPageSize()"
            >
              <option value="10">10 por página</option>
              <option value="20" selected>20 por página</option>
              <option value="50">50 por página</option>
              <option value="100">100 por página</option>
            </select>
          </div>
          <div class="footer-right">
            <div class="pagination" id="evolucaoMensalPagination">
              <!-- Botões de paginação serão inseridos via JavaScript -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay Modal para Detalhamento das Variáveis -->
    <div class="overlay-modal" id="variaveisModal">
      <div class="overlay-content">
        <div class="overlay-header">
          <h2 class="overlay-title">
            <i class="fas fa-chart-bar"></i>
            Detalhamento das Variáveis
          </h2>
          <button
            class="overlay-close"
            onclick="closeOverlay('variaveisModal')"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="overlay-toolbar">
          <div class="toolbar-left">
            <div class="search-container">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                id="variaveisSearch"
                class="search-input"
                placeholder="Buscar por vendedor, código..."
              />
            </div>
            <button
              class="btn-overlay btn-secondary has-active-filters"
              onclick="toggleVariaveisFilters()"
              id="variaveisFiltersToggle"
            >
              <i class="fas fa-filter"></i>
              Filtros Avançados
              <span
                class="filters-active-indicator"
                id="variaveisFiltersIndicator"
                style="display: none"
                >0</span
              >
            </button>
            <button class="btn-overlay" onclick="refreshVariaveisData()">
              <i class="fas fa-sync-alt"></i>
              Atualizar
            </button>
          </div>
          <div class="toolbar-right">
            <button
              class="btn-overlay btn-success"
              onclick="exportVariaveisToExcel()"
            >
              <i class="fas fa-file-excel"></i>
              Excel
            </button>
            <button
              class="btn-overlay btn-primary"
              onclick="exportVariaveisToPDF()"
            >
              <i class="fas fa-file-pdf"></i>
              PDF
            </button>
          </div>
        </div>

        <!-- Painel de Filtros Avançados para Variáveis -->
        <div
          class="filters-panel"
          id="variaveisFiltersPanel"
          style="display: none"
        >
          <div class="filters-header">
            <h4><i class="fas fa-filter"></i> Filtros Avançados</h4>
            <button class="btn-clear-filters" onclick="clearVariaveisFilters()">
              <i class="fas fa-times"></i>
              Limpar Filtros
            </button>
          </div>
          <div class="filters-grid">
            <div class="filter-group">
              <label>Código Vendedor:</label>
              <input
                type="text"
                id="variaveisFilterCodvend"
                class="filter-input"
                placeholder="Ex: 123 ou 123,456"
              />
            </div>
            <div class="filter-group">
              <label>Nome Vendedor:</label>
              <input
                type="text"
                id="variaveisFilterApelido"
                class="filter-input"
                placeholder="Ex: João ou João,Maria"
              />
            </div>
            <div class="filter-group">
              <label>Percentual:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="variaveisFilterPercMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.1"
                  min="0"
                  max="1000"
                />
                <span>até</span>
                <input
                  type="number"
                  id="variaveisFilterPercMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.1"
                  min="0"
                  max="1000"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Benefício Real:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="variaveisFilterBeneficioRealMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="variaveisFilterBeneficioRealMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
            <div class="filter-group">
              <label>Benefício Previsto:</label>
              <div class="range-inputs">
                <input
                  type="number"
                  id="variaveisFilterBeneficioPrevistoMin"
                  class="filter-input"
                  placeholder="Mín"
                  step="0.01"
                />
                <span>até</span>
                <input
                  type="number"
                  id="variaveisFilterBeneficioPrevistoMax"
                  class="filter-input"
                  placeholder="Máx"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          <div class="filters-actions">
            <button
              class="btn-overlay btn-primary"
              onclick="applyVariaveisAdvancedFilters()"
            >
              <i class="fas fa-check"></i>
              Aplicar Filtros
            </button>
            <button
              class="btn-overlay btn-secondary"
              onclick="saveVariaveisFilters()"
            >
              <i class="fas fa-save"></i>
              Salvar Filtros
            </button>
            <button
              class="btn-overlay btn-outline"
              onclick="loadVariaveisFilters()"
            >
              <i class="fas fa-upload"></i>
              Carregar Filtros
            </button>
          </div>
        </div>

        <div class="overlay-info">
          <div class="info-item">
            <i class="fas fa-database"></i>
            <span>Total de registros:</span>
            <span class="info-value" id="variaveisTotalRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-eye"></i>
            <span>Registros visíveis:</span>
            <span class="info-value" id="variaveisVisibleRecords">0</span>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>Última atualização:</span>
            <span class="info-value" id="variaveisLastUpdate">-</span>
          </div>
        </div>

        <div class="overlay-table-container">
          <div class="loading-overlay" id="variaveisLoadingOverlay">
            <div class="spinner"></div>
          </div>

          <table class="overlay-table" id="variaveisTable">
            <thead>
              <tr>
                <th
                  class="sortable"
                  data-sort="codvend"
                  onclick="sortVariaveisTable('codvend')"
                >
                  Código Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="apelido"
                  onclick="sortVariaveisTable('apelido')"
                >
                  Vendedor <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="codvar"
                  onclick="sortVariaveisTable('codvar')"
                >
                  Código Variável <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable"
                  data-sort="descrvar"
                  onclick="sortVariaveisTable('descrvar')"
                >
                  Descrição Variável <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="perc"
                  onclick="sortVariaveisTable('perc')"
                >
                  Percentual <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="beneficio_real"
                  onclick="sortVariaveisTable('beneficio_real')"
                >
                  Benefício Real <i class="fas fa-sort sort-icon"></i>
                </th>
                <th
                  class="sortable text-right"
                  data-sort="beneficio_previsto"
                  onclick="sortVariaveisTable('beneficio_previsto')"
                >
                  Benefício Previsto <i class="fas fa-sort sort-icon"></i>
                </th>
              </tr>
            </thead>
            <tbody id="variaveisTableBody">
              <!-- Dados serão inseridos via JavaScript -->
            </tbody>
          </table>
        </div>

        <div class="overlay-footer">
          <div class="footer-left">
            <div class="page-info">
              <i class="fas fa-info-circle"></i>
              <span id="variaveisPageInfo">Mostrando 0-0 de 0 registros</span>
            </div>
            <select
              class="page-size-select"
              id="variaveisPageSize"
              onchange="changeVariaveisPageSize()"
            >
              <option value="10">10 por página</option>
              <option value="25" selected>25 por página</option>
              <option value="50">50 por página</option>
              <option value="100">100 por página</option>
            </select>
          </div>
          <div class="footer-right">
            <div class="pagination" id="variaveisPagination">
              <!-- Botões de paginação serão inseridos via JavaScript -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Variáveis globais para os gráficos
      let lineChart = null;

      // Variável global para o código de fechamento selecionado
      let codFechSelecionado = 1;

      // Função para formatar valores monetários
      function formatCurrency(value) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      }

      // Função para formatar percentuais
      function formatPercentage(value) {
        return value.toFixed(1) + "%";
      }

      // Função para formatar data do Oracle no formato DD/MM/YYYY
      function formatOracleDate(dateString) {
        if (!dateString) return "";

        try {
          // Remove espaços em branco
          const cleanDate = dateString.toString().trim();

          // Se já está no formato DD/MM/YYYY, retorna formatado
          if (cleanDate.includes("/")) {
            // Remove a parte do horário se existir
            const datePart = cleanDate.split(" ")[0];
            const parts = datePart.split("/");

            // Verifica se tem 3 partes (dia, mês, ano)
            if (parts.length === 3) {
              const [day, month, year] = parts;
              // Garante que dia e mês tenham 2 dígitos
              const formattedDay = day.padStart(2, "0");
              const formattedMonth = month.padStart(2, "0");
              return `${formattedDay}/${formattedMonth}/${year}`;
            }
          }

          // Trata formato DDMMYYYY HH:MM:SS (formato Oracle comum)
          if (/^\d{8}\s+\d{2}:\d{2}:\d{2}$/.test(cleanDate)) {
            const datePart = cleanDate.split(" ")[0]; // Pega apenas a parte da data
            const day = datePart.substring(0, 2);
            const month = datePart.substring(2, 4);
            const year = datePart.substring(4, 8);
            return `${day}/${month}/${year}`;
          }

          // Trata formato DDMMYYYY (sem horário)
          if (/^\d{8}$/.test(cleanDate)) {
            const day = cleanDate.substring(0, 2);
            const month = cleanDate.substring(2, 4);
            const year = cleanDate.substring(4, 8);
            return `${day}/${month}/${year}`;
          }

          // Tenta converter se for uma data válida
          const date = new Date(cleanDate);
          if (isNaN(date.getTime())) {
            return cleanDate; // Retorna o valor original se não conseguir converter
          }

          // Formata no padrão DD/MM/YYYY
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (error) {
          return dateString; // Retorna o valor original em caso de erro
        }
      }

      // Função para carregar dados do dropdown de fechamento
      async function loadFechamentoDropdown() {
        try {
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error(
              "SankhyaJX não está disponível para carregar dropdown"
            );
            return;
          }

          const sql = `
                    SELECT
                        codfech,
                        descr
                    FROM AD_FECHAPLUS
                    ORDER BY codfech
                `;

          const data = await JX.consultar(sql);
          const dropdown = document.getElementById("fechamentoFilter");

          // Limpar opções existentes
          dropdown.innerHTML = "";

          if (data && data.length > 0) {
            data.forEach((item) => {
              const option = document.createElement("option");
              option.value = item.CODFECH;
              option.textContent = `${item.CODFECH} - ${item.DESCR}`;
              dropdown.appendChild(option);
            });

            // Selecionar o primeiro item por padrão
            dropdown.value = data[0].CODFECH;
            codFechSelecionado = data[0].CODFECH;
          } else {
            dropdown.innerHTML =
              '<option value="">Nenhum registro encontrado</option>';
          }
        } catch (error) {
          console.error("Erro ao carregar dropdown de fechamento:", error);
          document.getElementById("fechamentoFilter").innerHTML =
            '<option value="">Erro ao carregar</option>';
        }
      }

      // Função para atualizar filtro
      function updateFechamentoFilter() {
        const dropdown = document.getElementById("fechamentoFilter");
        codFechSelecionado = dropdown.value;

        // Recarregar todos os dados com o novo filtro
        initializeDashboard();
      }

      // Função para carregar dados dos cards usando SankhyaJX
      async function loadCardsData() {
        try {
          // Query para buscar dados de faturamento, meta e percentual atingido
          const sql = `
                    SELECT
                        SUM(VLR_PREV) AS VLR_PREV,
                        SUM(VLR_REAL) AS VLR_REAL,
                        
                        CASE WHEN SUM(VLR_PREV) = 0 THEN 0 ELSE SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0) END AS PERC
                    FROM (
                        SELECT
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD,
                            SUM(QTDPREV) AS QTDPREV,
                            SUM(QTDREAL) AS QTDREAL,
                            SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                            SUM(NVL(VLRREAL, 0)) AS VLR_REAL
                        FROM (
                            SELECT MET.CODMETA,MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(VEN.APELIDO,0) AS APELIDO,NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                            NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                            NVL(MET.MARCA,0) AS MARCA,
                            NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                            NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                            NVL(MET.QTDPREV,0) AS QTDPREV, 
                            SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                            NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                            SUM(NVL(VGF.VLR,0)) AS VLRREAL
                            FROM TGFMET MET
                            LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                            LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                            LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                            LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                            LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                            GROUP BY NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD), MET.CODMETA,MET.DTREF,NVL(MET.CODVEND,0),NVL(VEN.APELIDO,0),NVL(VEN.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)
                        )
                        WHERE 
                            CODMETA = 4
                            AND (DTREF BETWEEN 
                                (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                            AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                            AND (
                                CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                            )
                        GROUP BY
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD
                    )
                `;

          // Query para buscar dados de ATINGIRAM GATILHO
          const sqlGatilho = `
                    SELECT 
                        COUNT(*) AS TOTAL_CODGAT_IGUAL_1,
                        COUNT(CASE WHEN PERCREAL >= 100 THEN 1 END) AS ATINGIRAM_GATILHO,
                        COUNT(CASE WHEN PERCREAL < 100 THEN 1 END) AS NAO_ATINGIRAM_GATILHO,
                        ROUND(100 * COUNT(CASE WHEN PERCREAL >= 100 THEN 1 END) / COUNT(*), 2) AS PERC_ATINGIRAM,
                        ROUND(100 * COUNT(CASE WHEN PERCREAL < 100 THEN 1 END) / COUNT(*), 2) AS PERC_NAO_ATINGIRAM
                    FROM AD_REALSINTET
                    WHERE AGRUPADOR = 'GATILHO' AND CODFECH = ${codFechSelecionado}
                `;

          // Executar queries usando SankhyaJX
          const resultado = await JX.consultar(sql);
          const resultadoGatilho = await JX.consultar(sqlGatilho);

          // Query para buscar dados de benefício previsto
          const sqlBeneficioPrevisto = `
                    SELECT SUM(VLRPREV) VLRBENE_PREV
                    FROM AD_REALSINTET
                    WHERE CODFECH = ${codFechSelecionado}
                `;

          // Query para buscar dados de comissão
          const sqlComissao = `
                    SELECT SUM(BASECALC) AS VLRBENEFICIO
                    FROM AD_REALSINTET
                    WHERE CODFECH = ${codFechSelecionado}
                `;

          const resultadoBeneficioPrevisto = await JX.consultar(
            sqlBeneficioPrevisto
          );
          const resultadoComissao = await JX.consultar(sqlComissao);

          // Processar dados
          let vlrReal = 0;
          let vlrPrev = 0;
          let percentualAtingido = 0;
          let vlrComissao = 0;
          let percAtingiramGatilho = 0;
          let vlrBeneficioPrevisto = 0;

          if (resultado && resultado.length > 0) {
            const dados = resultado[0];
            vlrReal = parseFloat(dados.VLR_REAL) || 0;
            vlrPrev = parseFloat(dados.VLR_PREV) || 0;
            percentualAtingido = parseFloat(dados.PERC) || 0;
          }

          if (resultadoGatilho && resultadoGatilho.length > 0) {
            const dadosGatilho = resultadoGatilho[0];
            percAtingiramGatilho = parseFloat(dadosGatilho.PERC_ATINGIRAM) || 0;
          }

          if (
            resultadoBeneficioPrevisto &&
            resultadoBeneficioPrevisto.length > 0
          ) {
            vlrBeneficioPrevisto =
              parseFloat(resultadoBeneficioPrevisto[0].VLRBENE_PREV) || 0;
          }

          if (resultadoComissao && resultadoComissao.length > 0) {
            vlrComissao = parseFloat(resultadoComissao[0].VLRBENEFICIO) || 0;
          }

          // Atualizar cards
          document.getElementById("faturamento-valor").textContent =
            formatPercentage(percAtingiramGatilho);
          document.getElementById("meta-valor").textContent =
            formatCurrency(vlrBeneficioPrevisto);
          document.getElementById("comissao-valor").textContent =
            formatCurrency(vlrComissao);
        } catch (error) {
          console.error("Erro ao carregar dados dos cards:", error);
          // Definir valores padrão em caso de erro
          document.getElementById("faturamento-valor").textContent = "0%";
          document.getElementById("meta-valor").textContent = "R$ 0,00";
          document.getElementById("comissao-valor").textContent = "R$ 0,00";
        }
      }

      // Função para carregar dados das variáveis de benefício (versão grid)
      async function loadGridVariablesData() {
        try {
          // Verificar se JX está disponível
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error(
              "SankhyaJX não está disponível para carregar variáveis"
            );
            return;
          }

          // Query para buscar dados das variáveis
          const sql = `
                    SELECT 
                        TET.CODVAR,
                        VAR.DESCRVAR,
                        COUNT(CASE WHEN TET.BASECALC > 0 THEN 1 END) AS ATING_VAR,
                        ROUND(100 * COUNT(CASE WHEN TET.BASECALC > 0 THEN 1 END) / COUNT(*), 2) AS PERC_ATING_VAR,
                        SUM(TET.BASECALC) AS BENEFICIO_REAL,
                        0 AS BENEFICIO_PREVISTO
                    FROM AD_REALSINTET TET
                    INNER JOIN AD_VARIAVPLUS VAR ON TET.CODVAR = VAR.NUVARIAV
                    WHERE TET.AGRUPADOR NOT LIKE 'GATILHO' 
                    AND TET.CODFECH = ${codFechSelecionado}
                    GROUP BY 
                        TET.CODVAR,
                        VAR.DESCRVAR
                    ORDER BY PERC_ATING_VAR DESC
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            // Armazenar dados das variáveis
            window.gridVariablesData = data.map((item) => ({
              codvar: item.CODVAR,
              descrvar: item.DESCRVAR,
              ating_var: parseInt(item.ATING_VAR) || 0,
              perc_ating_var: parseFloat(item.PERC_ATING_VAR) || 0,
              beneficio_real: parseFloat(item.BENEFICIO_REAL) || 0,
              beneficio_previsto: parseFloat(item.BENEFICIO_PREVISTO) || 0,
            }));

            // Renderizar cards em grid das variáveis
            renderGridVariablesCards();
          } else {
            // Mostrar mensagem quando não há dados
            document.getElementById("gridVariablesCardsContainer").innerHTML = `
              <div class="text-center py-3">
                <i class="fas fa-info-circle text-muted" style="font-size: 24px;"></i>
                <p class="mt-2 text-muted mb-0" style="font-size: 12px;">Nenhuma variável de benefício encontrada para o período selecionado.</p>
              </div>
            `;
          }
        } catch (error) {
          console.error("Erro ao carregar dados das variáveis:", error);
          document.getElementById("gridVariablesCardsContainer").innerHTML = `
            <div class="text-center py-3">
              <i class="fas fa-exclamation-triangle text-warning" style="font-size: 24px;"></i>
              <p class="mt-2 text-muted mb-0" style="font-size: 12px;">Erro ao carregar dados das variáveis. Tente novamente.</p>
            </div>
          `;
        }
      }

      // Função para renderizar cards em grid de 5 por linha
      function renderGridVariablesCards() {
        const container = document.getElementById(
          "gridVariablesCardsContainer"
        );

        if (
          !window.gridVariablesData ||
          window.gridVariablesData.length === 0
        ) {
          container.innerHTML = `
            <div class="text-center py-3">
              <i class="fas fa-info-circle text-muted" style="font-size: 24px;"></i>
              <p class="mt-2 text-muted mb-0" style="font-size: 12px;">Nenhuma variável de benefício encontrada.</p>
            </div>
          `;
          // Ajustar altura dinamicamente quando não há cards
          adjustVariablesContainerHeight();
          return;
        }

        // Criar cards em modo horizontal (scroll)
        const cardsHTML = window.gridVariablesData
          .map((variable, index) => {
            // Definir ícone baseado no índice para variedade visual
            const icons = [
              "fas fa-chart-bar",
              "fas fa-chart-pie",
              "fas fa-chart-line",
              "fas fa-percentage",
              "fas fa-trophy",
              "fas fa-star",
              "fas fa-gem",
              "fas fa-crown",
            ];
            const icon = icons[index % icons.length];

            return `
              <div class="grid-variable-card horizontal-mode" onclick="openVariaveisOverlay(${
                variable.codvar
              })" style="cursor: pointer;">
                <div class="grid-card-header">
                  <div class="grid-card-icon">
                    <i class="${icon}"></i>
                  </div>
                  <div class="grid-card-title">${variable.descrvar}</div>
                  <div class="grid-card-percentage">${variable.perc_ating_var.toFixed(
                    1
                  )}%</div>
                </div>
                <div class="grid-card-content">
                  <div class="grid-card-main-info">
                    <div class="grid-card-vendors">${
                      variable.ating_var
                    } vendedores</div>
                  </div>
                  <div class="grid-card-details">
                    <div class="grid-detail-item">
                      <div class="grid-detail-label">Real</div>
                      <div class="grid-detail-value currency">${formatGridCurrency(
                        variable.beneficio_real
                      )}</div>
                    </div>
                    <div class="grid-detail-item">
                      <div class="grid-detail-label">Previsto</div>
                      <div class="grid-detail-value currency">${formatGridCurrency(
                        variable.beneficio_previsto
                      )}</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");

        // Renderizar cards em scroll horizontal
        container.innerHTML = cardsHTML;

        // Ajustar altura dinamicamente após renderizar os cards
        adjustVariablesContainerHeight();

        // Inicializar rolagem horizontal
        initializeHorizontalScroll();
      }

      // Função para inicializar rolagem horizontal
      function initializeHorizontalScroll() {
        const scroller = document.getElementById("gridVariablesCardsContainer");
        const scrollLeftBtn = document.getElementById("scrollLeftBtn");
        const scrollRightBtn = document.getElementById("scrollRightBtn");

        if (!scroller || !scrollLeftBtn || !scrollRightBtn) return;

        // Função para rolar por cards
        function scrollByCards(direction = 1) {
          const cardWidth = 210; // largura do card
          const gap = 12; // gap entre cards
          const scrollAmount = (cardWidth + gap) * direction * 2; // rola 2 cards por vez
          scroller.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }

        // Event listeners para botões
        scrollLeftBtn.addEventListener("click", () => scrollByCards(-1));
        scrollRightBtn.addEventListener("click", () => scrollByCards(1));

        // Drag to scroll (mouse)
        let isDown = false;
        let startX;
        let scrollLeft;

        scroller.addEventListener("mousedown", (e) => {
          isDown = true;
          scroller.style.cursor = "grabbing";
          startX = e.pageX - scroller.offsetLeft;
          scrollLeft = scroller.scrollLeft;
        });

        scroller.addEventListener("mouseleave", () => {
          isDown = false;
          scroller.style.cursor = "grab";
        });

        scroller.addEventListener("mouseup", () => {
          isDown = false;
          scroller.style.cursor = "grab";
        });

        scroller.addEventListener("mousemove", (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - scroller.offsetLeft;
          const walk = (x - startX) * 1.5;
          scroller.scrollLeft = scrollLeft - walk;
        });

        // Touch scroll (mobile)
        let touchStartX = 0;
        let touchStartScroll = 0;

        scroller.addEventListener("touchstart", (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartScroll = scroller.scrollLeft;
        });

        scroller.addEventListener("touchmove", (e) => {
          const dx = e.touches[0].clientX - touchStartX;
          scroller.scrollLeft = touchStartScroll - dx;
        });

        // Keyboard navigation
        scroller.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollByCards(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollByCards(-1);
          }
        });

        // Definir cursor padrão
        scroller.style.cursor = "grab";
      }

      // Função auxiliar para formatação compacta de moeda no grid
      function formatGridCurrency(value) {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        } else {
          return `${value.toFixed(0)}`;
        }
      }

      // Função para ajustar altura dinamicamente da seção de variáveis
      function adjustVariablesContainerHeight() {
        const container = document.getElementById("variablesContainer");
        const cardsContainer = document.getElementById(
          "gridVariablesCardsContainer"
        );

        if (!container || !cardsContainer) return;

        // Calcular altura baseada no número de cards
        const cards = cardsContainer.querySelectorAll(".grid-variable-card");
        const numCards = cards.length;

        if (numCards === 0) {
          // Se não há cards, usar altura mínima
          container.style.minHeight = "auto";
          container.style.height = "auto";
          return;
        }

        // Para rolagem horizontal, altura fixa baseada em uma linha
        // Altura base: título (40px) + padding wrapper (10px)
        const baseHeight = 50;

        // Altura da linha horizontal: altura do card (100px) + padding scroller (16px)
        const scrollerHeight = 116;

        // Calcular altura total necessária (uma linha horizontal)
        const totalHeight = baseHeight + scrollerHeight;

        // Aplicar altura dinâmica
        container.style.minHeight = `${totalHeight}px`;
        container.style.height = "auto";

        // Adicionar classe para indicar que tem cards
        container.classList.add("has-cards");
      }

      // Função para carregar dados do gráfico de linha
      async function loadLineChartData() {
        try {
          // Verificar se JX está disponível
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível para o gráfico");
            return;
          }

          // Query para dados mensais do gráfico
          const sql = `
                    SELECT
                        TO_CHAR(DTREF,'MM')MES,
                        TO_CHAR(DTREF,'YYYY')ANO,
                        TO_CHAR(DTREF,'MM/YYYY') MES_ANO,
                        SUM(VLR_PREV) AS VLR_PREV,
                        SUM(VLR_REAL) AS VLR_REAL,
                        
                        CASE WHEN SUM(VLR_PREV) = 0 THEN 0 ELSE SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0) END AS PERC
                    FROM (
                        SELECT
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD,
                            SUM(QTDPREV) AS QTDPREV,
                            SUM(QTDREAL) AS QTDREAL,
                            SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                            SUM(NVL(VLRREAL, 0)) AS VLR_REAL
                        FROM (
                            SELECT MET.CODMETA,MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(VEN.APELIDO,0) AS APELIDO,NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                            NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                            NVL(MET.MARCA,0) AS MARCA,
                            NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                            NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                            NVL(MET.QTDPREV,0) AS QTDPREV, 
                            SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                            NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                            SUM(NVL(VGF.VLR,0)) AS VLRREAL
                            FROM TGFMET MET
                            LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                            LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                            LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                            LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                            LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                            GROUP BY NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD), MET.CODMETA,MET.DTREF,NVL(MET.CODVEND,0),NVL(VEN.APELIDO,0),NVL(VEN.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)
                        )
                        WHERE 
                            CODMETA = 4
                            AND (DTREF BETWEEN 
                                (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                            AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                            AND (
                                CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                            )
                        GROUP BY
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD
                    )
                    GROUP BY 
                        TO_CHAR(DTREF,'MM'),
                        TO_CHAR(DTREF,'YYYY'),
                        TO_CHAR(DTREF,'MM/YYYY')
                    ORDER BY 2,1
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            const labels = data.map((item) => item.MES_ANO);
            const realData = data.map((item) => parseFloat(item.VLR_REAL) || 0);
            const metaData = data.map((item) => parseFloat(item.VLR_PREV) || 0);

            createLineChart(labels, realData, metaData);
          } else {
            console.warn("Nenhum dado encontrado para o gráfico de linha");
          }
        } catch (error) {
          console.error("Erro ao carregar dados do gráfico de linha:", error);
        }
      }

      // Função para criar gráfico de linha
      function createLineChart(labels, realData, metaData) {
        // Verificar se os dados são válidos
        if (!labels || !realData || !metaData || labels.length === 0) {
          console.warn("Dados inválidos para o gráfico de linha");
          return;
        }

        // Destruir gráfico anterior se existir
        if (lineChart) {
          lineChart.destroy();
          lineChart = null;
        }

        // Verificar se Chart.js está disponível
        if (typeof Chart === "undefined") {
          console.error("Chart.js não está carregado");
          return;
        }

        const ctx = document.getElementById("lineChart").getContext("2d");

        lineChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Real",
                data: realData,
                borderColor: "#008a70",
                backgroundColor: "rgba(0, 138, 112, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#008a70",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
              },
              {
                label: "Meta",
                data: metaData,
                borderColor: "#00afa0",
                backgroundColor: "rgba(0, 175, 160, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#00afa0",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                borderDash: [5, 5],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: {
                    size: 12,
                    weight: "bold",
                  },
                },
              },
              tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#ffffff",
                bodyColor: "#ffffff",
                borderColor: "#008a70",
                borderWidth: 1,
                callbacks: {
                  label: function (context) {
                    const value = context.parsed.y;
                    return (
                      context.dataset.label +
                      ": R$ " +
                      value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    );
                  },
                },
              },
            },
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: "Mês/Ano",
                  font: {
                    size: 12,
                    weight: "bold",
                  },
                },
                grid: {
                  display: true,
                  color: "rgba(0, 0, 0, 0.1)",
                },
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: "Valor (R$)",
                  font: {
                    size: 12,
                    weight: "bold",
                  },
                },
                grid: {
                  display: true,
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  callback: function (value) {
                    return "R$ " + value.toLocaleString("pt-BR");
                  },
                },
              },
            },
            interaction: {
              intersect: false,
              mode: "index",
            },
            onClick: (event, elements) => {
              if (elements.length > 0) {
                const element = elements[0];
                const datasetIndex = element.datasetIndex;
                const dataIndex = element.index;
                const label = lineChart.data.labels[dataIndex];

                // Abrir overlay de evolução mensal com o mês/ano selecionado
                openEvolucaoMensalOverlay(label);
              }
            },
          },
        });
      }

      // Função principal de inicialização
      async function initializeDashboard() {
        try {
          await loadCardsData();
          await loadLineChartData();
          await loadGridVariablesData();
        } catch (error) {
          console.error("Erro ao inicializar dashboard:", error);
        }
      }

      // Inicializar quando a página carregar
      document.addEventListener("DOMContentLoaded", function () {
        // Aguardar um pouco para garantir que o SankhyaJX esteja carregado
        setTimeout(async function () {
          await loadFechamentoDropdown();
          await initializeDashboard();
        }, 500);

        // Event listener para o dropdown de fechamento
        document
          .getElementById("fechamentoFilter")
          .addEventListener("change", updateFechamentoFilter);
      });

      // Função para atualizar dados (pode ser chamada externamente)
      window.refreshDashboard = function () {
        initializeDashboard();
      };

      // Auto-refresh a cada 5 minutos
      setInterval(function () {
        initializeDashboard();
      }, 300000);

      // ===== FUNÇÕES DOS OVERLAYS =====

      // Estados dos overlays
      const overlayStates = {
        faturamento: {
          data: [],
          filteredData: [],
          currentPage: 1,
          pageSize: 25,
          sortField: null,
          sortDirection: "asc",
          searchTerm: "",
          lastUpdate: new Date(),
          // Filtros avançados
          advancedFilters: {
            codvend: "",
            apelido: "",
            qtdprevMin: "",
            qtdprevMax: "",
            qtdrealMin: "",
            qtdrealMax: "",
            vlrprevMin: "",
            vlrprevMax: "",
            vlrrealMin: "",
            vlrrealMax: "",
            percMin: "",
            percMax: "",
            status: "",
          },
          filtersVisible: false,
          activeFiltersCount: 0,
        },
        meta: {
          data: [],
          filteredData: [],
          currentPage: 1,
          pageSize: 25,
          sortField: null,
          sortDirection: "asc",
          searchTerm: "",
          lastUpdate: new Date(),
          // Filtros avançados
          advancedFilters: {
            codvend: "",
            apelido: "",
            qtdprevMin: "",
            qtdprevMax: "",
            qtdrealMin: "",
            qtdrealMax: "",
            vlrprevMin: "",
            vlrprevMax: "",
            vlrrealMin: "",
            vlrrealMax: "",
            percMin: "",
            percMax: "",
            status: "",
          },
          filtersVisible: false,
          activeFiltersCount: 0,
        },
        beneficio: {
          data: [],
          filteredData: [],
          currentPage: 1,
          pageSize: 25,
          sortField: null,
          sortDirection: "asc",
          searchTerm: "",
          lastUpdate: new Date(),
          // Filtros avançados
          advancedFilters: {
            codvend: "",
            apelido: "",
            gatilhoMin: "",
            gatilhoMax: "",
            variavel_precomedMin: "",
            variavel_precomedMax: "",
            variavel_custo_crMin: "",
            variavel_custo_crMax: "",
            variavel_faturamentoMin: "",
            variavel_faturamentoMax: "",
            fat_grupoprodgatMin: "",
            fat_grupoprodgatMax: "",
            totalMin: "",
            totalMax: "",
          },
          filtersVisible: false,
          activeFiltersCount: 0,
        },
        evolucaoMensal: {
          data: [],
          filteredData: [],
          currentPage: 1,
          pageSize: 25,
          sortField: null,
          sortDirection: "asc",
          searchTerm: "",
          lastUpdate: new Date(),
          mesAnoSelecionado: "",
          // Filtros avançados
          advancedFilters: {
            codvend: "",
            apelido: "",
            vlrprevMin: "",
            vlrprevMax: "",
            vlrrealMin: "",
            vlrrealMax: "",
            percMin: "",
            percMax: "",
          },
          filtersVisible: false,
          activeFiltersCount: 0,
        },
        vendedor: {
          data: [],
          filteredData: [],
          currentPage: 1,
          pageSize: 25,
          sortField: null,
          sortDirection: "asc",
          searchTerm: "",
          lastUpdate: new Date(),
          codvendSelecionado: "",
          // Filtros avançados
          advancedFilters: {
            codparc: "",
            parceiro: "",
            marca: "",
            qtdprevMin: "",
            qtdprevMax: "",
            qtdrealMin: "",
            qtdrealMax: "",
            vlrprevMin: "",
            vlrprevMax: "",
            vlrrealMin: "",
            vlrrealMax: "",
            percMin: "",
            percMax: "",
          },
          filtersVisible: false,
          activeFiltersCount: 0,
        },
        variaveis: {
          data: [],
          filteredData: [],
          currentPage: 1,
          pageSize: 25,
          sortField: null,
          sortDirection: "asc",
          searchTerm: "",
          lastUpdate: new Date(),
          codvarSelecionado: "",
          // Filtros avançados
          advancedFilters: {
            codvend: "",
            apelido: "",
            percMin: "",
            percMax: "",
            beneficioRealMin: "",
            beneficioRealMax: "",
            beneficioPrevistoMin: "",
            beneficioPrevistoMax: "",
          },
          filtersVisible: false,
          activeFiltersCount: 0,
        },
      };

      // Função para abrir overlay de faturamento
      function openFaturamentoOverlay() {
        document.getElementById("faturamentoModal").classList.add("show");
        loadFaturamentoData();
      }

      // Função para abrir overlay de meta
      function openMetaOverlay() {
        document.getElementById("metaModal").classList.add("show");
        loadMetaData();
      }

      // Função para abrir overlay de benefício
      function openBeneficioOverlay() {
        document.getElementById("beneficioModal").classList.add("show");
        loadBeneficioData();
      }

      // Função para abrir overlay de evolução mensal
      function openEvolucaoMensalOverlay(mesAno) {
        overlayStates.evolucaoMensal.mesAnoSelecionado = mesAno;
        document.getElementById("evolucaoMensalModal").classList.add("show");
        loadEvolucaoMensalData();
      }

      // Função para abrir overlay de variáveis
      function openVariaveisOverlay(codvar) {
        overlayStates.variaveis.codvarSelecionado = codvar;
        document.getElementById("variaveisModal").classList.add("show");
        loadVariaveisData();
      }

      // Função para abrir overlay de vendedor
      function openVendedorOverlay(codvend) {
        overlayStates.vendedor.codvendSelecionado = codvend;
        document.getElementById("vendedorModal").classList.add("show");
        loadVendedorData();
      }

      // Função para fechar overlays
      function closeOverlay(modalId) {
        document.getElementById(modalId).classList.remove("show");
      }

      // Função para carregar dados do faturamento
      async function loadFaturamentoData() {
        try {
          showOverlayLoading("faturamentoLoadingOverlay");

          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            return;
          }

          const sql = `
                    SELECT 
                        TET.CODVEND,
                        VEN.APELIDO,
                        TET.PERCREAL,
                        TET.METAGAT
                    FROM AD_REALSINTET TET
                    INNER JOIN TGFVEN VEN ON TET.CODVEND = VEN.CODVEND
                    WHERE TET.AGRUPADOR = 'GATILHO' AND CODFECH = ${codFechSelecionado}
                    ORDER BY PERCREAL DESC
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            overlayStates.faturamento.data = data.map((item) => ({
              codvend: item.CODVEND,
              apelido: item.APELIDO,
              percreal: parseFloat(item.PERCREAL) || 0,
              metagat: parseFloat(item.METAGAT) || 0,
            }));

            overlayStates.faturamento.filteredData = [
              ...overlayStates.faturamento.data,
            ];
            overlayStates.faturamento.lastUpdate = new Date();

            renderFaturamentoTable();
            updateFaturamentoInfo();
          } else {
            overlayStates.faturamento.data = [];
            overlayStates.faturamento.filteredData = [];
            renderFaturamentoTable();
            updateFaturamentoInfo();
          }

          hideOverlayLoading("faturamentoLoadingOverlay");
        } catch (error) {
          console.error("Erro ao carregar dados do faturamento:", error);
          hideOverlayLoading("faturamentoLoadingOverlay");
        }
      }

      // Função para carregar dados da meta (mesma query)
      async function loadMetaData() {
        try {
          showOverlayLoading("metaLoadingOverlay");

          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            return;
          }

          const sql = `
                    SELECT 
                    TET.CODVEND,
                    VEN.APELIDO,
                    SUM(TET.VLRPREV) VLRBENE_PREV, 
                    SUM(TET.BASECALC) AS VLRBENEFICIO
                    FROM AD_REALSINTET TET
                    INNER JOIN TGFVEN VEN ON TET.CODVEND = VEN.CODVEND
                    WHERE TET.CODFECH = ${codFechSelecionado}
                    GROUP BY TET.CODVEND,VEN.APELIDO
                    ORDER BY 4 DESC
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            overlayStates.meta.data = data.map((item) => ({
              codvend: item.CODVEND,
              apelido: item.APELIDO,
              vlrbene_prev: parseFloat(item.VLRBENE_PREV) || 0,
              vlrbeneficio: parseFloat(item.VLRBENEFICIO) || 0,
            }));

            overlayStates.meta.filteredData = [...overlayStates.meta.data];
            overlayStates.meta.lastUpdate = new Date();

            renderMetaTable();
            updateMetaInfo();
          } else {
            overlayStates.meta.data = [];
            overlayStates.meta.filteredData = [];
            renderMetaTable();
            updateMetaInfo();
          }

          hideOverlayLoading("metaLoadingOverlay");
        } catch (error) {
          console.error("Erro ao carregar dados da meta:", error);
          hideOverlayLoading("metaLoadingOverlay");
        }
      }

      // Função para carregar dados de benefício
      async function loadBeneficioData() {
        try {
          showOverlayLoading("beneficioLoadingOverlay");

          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            return;
          }

          const sql = `
                    SELECT 
                    TET.CODVEND,
                    VEN.APELIDO,
                    SUM(TET.VLRPREV) VLRBENE_PREV, 
                    SUM(TET.BASECALC) AS VLRBENEFICIO
                    FROM AD_REALSINTET TET
                    INNER JOIN TGFVEN VEN ON TET.CODVEND = VEN.CODVEND
                    WHERE TET.CODFECH = ${codFechSelecionado}
                    GROUP BY TET.CODVEND,VEN.APELIDO
                    ORDER BY 4 DESC
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            overlayStates.beneficio.data = data.map((item) => ({
              codvend: item.CODVEND,
              apelido: item.APELIDO,
              vlrbene_prev: parseFloat(item.VLRBENE_PREV) || 0,
              vlrbeneficio: parseFloat(item.VLRBENEFICIO) || 0,
            }));

            overlayStates.beneficio.filteredData = [
              ...overlayStates.beneficio.data,
            ];
            overlayStates.beneficio.lastUpdate = new Date();

            renderBeneficioTable();
            updateBeneficioInfo();
          } else {
            overlayStates.beneficio.data = [];
            overlayStates.beneficio.filteredData = [];
            renderBeneficioTable();
            updateBeneficioInfo();
          }

          hideOverlayLoading("beneficioLoadingOverlay");
        } catch (error) {
          console.error("Erro ao carregar dados de benefício:", error);
          hideOverlayLoading("beneficioLoadingOverlay");
        }
      }

      // Função para carregar dados de evolução mensal
      async function loadEvolucaoMensalData() {
        try {
          showOverlayLoading("evolucaoMensalLoadingOverlay");

          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            return;
          }

          const mesAno = overlayStates.evolucaoMensal.mesAnoSelecionado;

          const sql = `
                    SELECT
                        TO_CHAR(DTREF,'MM') AS MES,
                        TO_CHAR(DTREF,'YYYY') AS ANO,
                        TO_CHAR(DTREF,'MM/YYYY') AS MES_ANO,
                        CODVEND,
                        APELIDO,
                        SUM(VLR_PREV) AS VLR_PREV,
                        SUM(VLR_REAL) AS VLR_REAL,
                        
                        CASE WHEN SUM(VLR_PREV) = 0 THEN 0 ELSE SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0) END AS PERC
                    FROM
                    (
                        SELECT
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD,
                            SUM(QTDPREV) AS QTDPREV,
                            SUM(QTDREAL) AS QTDREAL,
                            SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                            SUM(NVL(VLRREAL, 0)) AS VLR_REAL
                        FROM(
                            SELECT MET.CODMETA,MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(VEN.APELIDO,0) AS APELIDO,NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                            NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                            NVL(MET.MARCA,0) AS MARCA,
                            NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                            NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                            NVL(MET.QTDPREV,0) AS QTDPREV, 
                            SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                            NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                            SUM(NVL(VGF.VLR,0)) AS VLRREAL
                            FROM TGFMET MET
                            LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                            LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                            LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                            LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                            LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                            GROUP BY NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD), MET.CODMETA,MET.DTREF,NVL(MET.CODVEND,0),NVL(VEN.APELIDO,0),NVL(VEN.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)
                        )
                        WHERE 
                            CODMETA = 4
                            AND (DTREF BETWEEN 
                                (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                            AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                            AND (
                                CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                            )
                        GROUP BY
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD
                    )
                    WHERE TO_CHAR(DTREF,'MM/YYYY') = '${mesAno}'
                    GROUP BY 
                        TO_CHAR(DTREF,'MM'),
                        TO_CHAR(DTREF,'YYYY'),
                        TO_CHAR(DTREF,'MM/YYYY'),
                        CODVEND,
                        APELIDO
                    ORDER BY 2,1,7 DESC
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            overlayStates.evolucaoMensal.data = data.map((item) => ({
              mes: item.MES,
              ano: item.ANO,
              mes_ano: item.MES_ANO,
              codvend: item.CODVEND,
              apelido: item.APELIDO,
              vlr_prev: parseFloat(item.VLR_PREV) || 0,
              vlr_real: parseFloat(item.VLR_REAL) || 0,
              perc: parseFloat(item.PERC) || 0,
            }));

            overlayStates.evolucaoMensal.filteredData = [
              ...overlayStates.evolucaoMensal.data,
            ];
            overlayStates.evolucaoMensal.lastUpdate = new Date();

            renderEvolucaoMensalTable();
            updateEvolucaoMensalInfo();
          } else {
            overlayStates.evolucaoMensal.data = [];
            overlayStates.evolucaoMensal.filteredData = [];
            renderEvolucaoMensalTable();
            updateEvolucaoMensalInfo();
          }

          hideOverlayLoading("evolucaoMensalLoadingOverlay");
        } catch (error) {
          console.error("Erro ao carregar dados de evolução mensal:", error);
          hideOverlayLoading("evolucaoMensalLoadingOverlay");
        }
      }

      // Função para carregar dados de vendedor
      async function loadVendedorData() {
        try {
          showOverlayLoading("vendedorLoadingOverlay");

          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            return;
          }

          const codvend = overlayStates.vendedor.codvendSelecionado;

          const sql = `
                    SELECT
                        DTREF,
                        CODVEND,
                        APELIDO,
                        CODGER,
                        CODPARC,
                        PARCEIRO,
                        MARCA,
                        SUM(QTDPREV) AS QTDPREV,
                        SUM(QTDREAL) AS QTDREAL,
                        SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                        SUM(NVL(VLRREAL, 0)) AS VLR_REAL,
                        CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
                    FROM(
                        SELECT MET.CODMETA,MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(VEN.APELIDO,0) AS APELIDO,NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                        NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                        NVL(MET.MARCA,0) AS MARCA,
                        NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                        NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                        NVL(MET.QTDPREV,0) AS QTDPREV, 
                        SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                        NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                        SUM(NVL(VGF.VLR,0)) AS VLRREAL
                        FROM TGFMET MET
                        LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                        LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                        LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                        LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                        LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                        GROUP BY NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD), MET.CODMETA,MET.DTREF,NVL(MET.CODVEND,0),NVL(VEN.APELIDO,0),NVL(VEN.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)
                    )
                    WHERE 
                        CODMETA = 4
                        AND (DTREF BETWEEN 
                            (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                        AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                        AND (
                            CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                        )
                        AND CODVEND = ${codvend}
                    GROUP BY
                        DTREF,
                        CODVEND,
                        APELIDO,
                        CODGER,
                        CODPARC,
                        PARCEIRO,
                        MARCA
                    ORDER BY 1,6
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            overlayStates.vendedor.data = data.map((item) => ({
              dtref: item.DTREF,
              codvend: item.CODVEND,
              apelido: item.APELIDO,
              codger: item.CODGER,
              codparc: item.CODPARC,
              parceiro: item.PARCEIRO,
              marca: item.MARCA,
              qtdprev: parseFloat(item.QTDPREV) || 0,
              qtdreal: parseFloat(item.QTDREAL) || 0,
              vlr_prev: parseFloat(item.VLR_PREV) || 0,
              vlr_real: parseFloat(item.VLR_REAL) || 0,
              perc: parseFloat(item.PERC) || 0,
            }));

            overlayStates.vendedor.filteredData = [
              ...overlayStates.vendedor.data,
            ];
            overlayStates.vendedor.lastUpdate = new Date();

            renderVendedorTable();
            updateVendedorInfo();
          } else {
            overlayStates.vendedor.data = [];
            overlayStates.vendedor.filteredData = [];
            renderVendedorTable();
            updateVendedorInfo();
          }

          hideOverlayLoading("vendedorLoadingOverlay");
        } catch (error) {
          console.error("Erro ao carregar dados de vendedor:", error);
          hideOverlayLoading("vendedorLoadingOverlay");
        }
      }

      // Função para carregar dados de variáveis
      async function loadVariaveisData() {
        try {
          showOverlayLoading("variaveisLoadingOverlay");

          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            return;
          }

          const codvar = overlayStates.variaveis.codvarSelecionado;

          const sql = `
                    SELECT 
                        TET.CODVEND,
                        VEN.APELIDO,
                        TET.CODVAR,
                        VAR.DESCRVAR,
                        NVL(AVG(TET.PERCREAL),0) PERC,
                        NVL(SUM(TET.BASECALC),0) BENEFICIO_REAL,
                        NVL(SUM(TET.VLRPREV),0) BENEFICIO_PREVISTO
                    FROM AD_REALSINTET TET
                    INNER JOIN AD_VARIAVPLUS VAR ON TET.CODVAR = VAR.NUVARIAV
                    INNER JOIN TGFVEN VEN ON TET.CODVEND = VEN.CODVEND
                    WHERE TET.AGRUPADOR NOT LIKE 'GATILHO' 
                    AND TET.CODFECH = ${codFechSelecionado}
                    AND TET.CODVAR = ${codvar}
                    GROUP BY 
                        TET.CODVEND,
                        VEN.APELIDO,
                        TET.CODVAR,
                        VAR.DESCRVAR
                    ORDER BY BENEFICIO_REAL DESC
                `;

          const data = await JX.consultar(sql);

          if (data && data.length > 0) {
            overlayStates.variaveis.data = data.map((item) => ({
              codvend: item.CODVEND,
              apelido: item.APELIDO,
              codvar: item.CODVAR,
              descrvar: item.DESCRVAR,
              perc: parseFloat(item.PERC) || 0,
              beneficio_real: parseFloat(item.BENEFICIO_REAL) || 0,
              beneficio_previsto: parseFloat(item.BENEFICIO_PREVISTO) || 0,
            }));

            overlayStates.variaveis.filteredData = [
              ...overlayStates.variaveis.data,
            ];
            overlayStates.variaveis.lastUpdate = new Date();

            renderVariaveisTable();
            updateVariaveisInfo();
          } else {
            overlayStates.variaveis.data = [];
            overlayStates.variaveis.filteredData = [];
            renderVariaveisTable();
            updateVariaveisInfo();
          }

          hideOverlayLoading("variaveisLoadingOverlay");
        } catch (error) {
          console.error("Erro ao carregar dados de variáveis:", error);
          hideOverlayLoading("variaveisLoadingOverlay");
        }
      }

      // Funções de loading
      function showOverlayLoading(loadingId) {
        document.getElementById(loadingId).classList.add("show");
      }

      function hideOverlayLoading(loadingId) {
        document.getElementById(loadingId).classList.remove("show");
      }

      // Funções de renderização das tabelas
      function renderFaturamentoTable() {
        const tbody = document.getElementById("faturamentoTableBody");
        const startIndex =
          (overlayStates.faturamento.currentPage - 1) *
          overlayStates.faturamento.pageSize;
        const endIndex = startIndex + overlayStates.faturamento.pageSize;
        const pageData = overlayStates.faturamento.filteredData.slice(
          startIndex,
          endIndex
        );

        tbody.innerHTML = "";

        pageData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right">${getPercentualBadge(
                      item.percreal
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.metagat
                    )}</td>
                `;
          tbody.appendChild(row);
        });

        updateFaturamentoPageInfo();
        renderFaturamentoPagination();
      }

      function renderMetaTable() {
        const tbody = document.getElementById("metaTableBody");
        const startIndex =
          (overlayStates.meta.currentPage - 1) * overlayStates.meta.pageSize;
        const endIndex = startIndex + overlayStates.meta.pageSize;
        const pageData = overlayStates.meta.filteredData.slice(
          startIndex,
          endIndex
        );

        tbody.innerHTML = "";

        pageData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlrbene_prev
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlrbeneficio
                    )}</td>
                `;
          tbody.appendChild(row);
        });

        updateMetaPageInfo();
        renderMetaPagination();
      }

      function renderBeneficioTable() {
        const tbody = document.getElementById("beneficioTableBody");
        const startIndex =
          (overlayStates.beneficio.currentPage - 1) *
          overlayStates.beneficio.pageSize;
        const endIndex = startIndex + overlayStates.beneficio.pageSize;
        const pageData = overlayStates.beneficio.filteredData.slice(
          startIndex,
          endIndex
        );

        tbody.innerHTML = "";

        pageData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlrbene_prev
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlrbeneficio
                    )}</td>
                `;
          tbody.appendChild(row);
        });

        updateBeneficioPageInfo();
        renderBeneficioPagination();
      }

      function renderEvolucaoMensalTable() {
        const tbody = document.getElementById("evolucaoMensalTableBody");
        const startIndex =
          (overlayStates.evolucaoMensal.currentPage - 1) *
          overlayStates.evolucaoMensal.pageSize;
        const endIndex = startIndex + overlayStates.evolucaoMensal.pageSize;
        const pageData = overlayStates.evolucaoMensal.filteredData.slice(
          startIndex,
          endIndex
        );

        tbody.innerHTML = "";

        pageData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlr_prev
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlr_real
                    )}</td>
                    <td class="text-right">${getPercentualBadge(item.perc)}</td>
                `;
          tbody.appendChild(row);
        });

        updateEvolucaoMensalPageInfo();
        renderEvolucaoMensalPagination();
      }

      function renderVendedorTable() {
        const tbody = document.getElementById("vendedorTableBody");
        const startIndex =
          (overlayStates.vendedor.currentPage - 1) *
          overlayStates.vendedor.pageSize;
        const endIndex = startIndex + overlayStates.vendedor.pageSize;
        const pageData = overlayStates.vendedor.filteredData.slice(
          startIndex,
          endIndex
        );

        tbody.innerHTML = "";

        pageData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td class="font-mono font-semibold">${formatOracleDate(
                      item.dtref
                    )}</td>
                    <td class="font-mono font-semibold">${item.codparc}</td>
                    <td>${item.parceiro}</td>
                    <td>${item.marca}</td>
                    <td class="text-right font-semibold">${item.qtdprev.toLocaleString(
                      "pt-BR"
                    )}</td>
                    <td class="text-right font-semibold">${item.qtdreal.toLocaleString(
                      "pt-BR"
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlr_prev
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.vlr_real
                    )}</td>
                    <td class="text-right">${getPercentualBadge(item.perc)}</td>
                `;
          tbody.appendChild(row);
        });

        updateVendedorPageInfo();
        renderVendedorPagination();
      }

      function renderVariaveisTable() {
        const tbody = document.getElementById("variaveisTableBody");
        const startIndex =
          (overlayStates.variaveis.currentPage - 1) *
          overlayStates.variaveis.pageSize;
        const endIndex = startIndex + overlayStates.variaveis.pageSize;
        const pageData = overlayStates.variaveis.filteredData.slice(
          startIndex,
          endIndex
        );

        tbody.innerHTML = "";

        pageData.forEach((item, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="font-mono font-semibold">${item.codvar}</td>
                    <td>${item.descrvar}</td>
                    <td class="text-right">${getPercentualBadge(item.perc)}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.beneficio_real
                    )}</td>
                    <td class="text-right font-semibold">${formatCurrency(
                      item.beneficio_previsto
                    )}</td>
                `;
          tbody.appendChild(row);
        });

        updateVariaveisPageInfo();
        renderVariaveisPagination();
      }

      // Função para criar badge de percentual
      function getPercentualBadge(perc) {
        let badgeClass = "badge-neutral";
        if (perc >= 100) {
          badgeClass = "badge-success";
        } else if (perc >= 80) {
          badgeClass = "badge-warning";
        } else {
          badgeClass = "badge-danger";
        }
        return `<span class="badge ${badgeClass}">${perc.toFixed(1)}%</span>`;
      }

      // Funções de atualização de informações
      function updateFaturamentoInfo() {
        document.getElementById("faturamentoTotalRecords").textContent =
          overlayStates.faturamento.data.length.toLocaleString("pt-BR");
        document.getElementById("faturamentoVisibleRecords").textContent =
          overlayStates.faturamento.filteredData.length.toLocaleString("pt-BR");
        document.getElementById("faturamentoLastUpdate").textContent =
          overlayStates.faturamento.lastUpdate.toLocaleTimeString("pt-BR");
      }

      function updateMetaInfo() {
        document.getElementById("metaTotalRecords").textContent =
          overlayStates.meta.data.length.toLocaleString("pt-BR");
        document.getElementById("metaVisibleRecords").textContent =
          overlayStates.meta.filteredData.length.toLocaleString("pt-BR");
        document.getElementById("metaLastUpdate").textContent =
          overlayStates.meta.lastUpdate.toLocaleTimeString("pt-BR");
      }

      function updateAtingidoInfo() {
        document.getElementById("atingidoTotalRecords").textContent =
          overlayStates.atingido.data.length.toLocaleString("pt-BR");
        document.getElementById("atingidoVisibleRecords").textContent =
          overlayStates.atingido.filteredData.length.toLocaleString("pt-BR");
        document.getElementById("atingidoLastUpdate").textContent =
          overlayStates.atingido.lastUpdate.toLocaleTimeString("pt-BR");
      }

      function updateBeneficioInfo() {
        document.getElementById(
          "beneficioResultsInfo"
        ).textContent = `Mostrando ${overlayStates.beneficio.filteredData.length} de ${overlayStates.beneficio.data.length} resultados`;
      }

      function updateBeneficioPageInfo() {
        const startIndex =
          (overlayStates.beneficio.currentPage - 1) *
            overlayStates.beneficio.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.beneficio.currentPage *
            overlayStates.beneficio.pageSize,
          overlayStates.beneficio.filteredData.length
        );
        const total = overlayStates.beneficio.filteredData.length;

        document.getElementById(
          "beneficioResultsInfo"
        ).textContent = `Mostrando ${startIndex} a ${endIndex} de ${total} resultados`;
      }

      function updateEvolucaoMensalInfo() {
        document.getElementById(
          "evolucaoMensalResultsInfo"
        ).textContent = `Mostrando ${overlayStates.evolucaoMensal.filteredData.length} de ${overlayStates.evolucaoMensal.data.length} resultados`;
      }

      function updateEvolucaoMensalPageInfo() {
        const startIndex =
          (overlayStates.evolucaoMensal.currentPage - 1) *
            overlayStates.evolucaoMensal.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.evolucaoMensal.currentPage *
            overlayStates.evolucaoMensal.pageSize,
          overlayStates.evolucaoMensal.filteredData.length
        );
        const total = overlayStates.evolucaoMensal.filteredData.length;

        document.getElementById(
          "evolucaoMensalResultsInfo"
        ).textContent = `Mostrando ${startIndex} a ${endIndex} de ${total} resultados`;
      }

      function updateVendedorInfo() {
        document.getElementById(
          "vendedorResultsInfo"
        ).textContent = `Mostrando ${overlayStates.vendedor.filteredData.length} de ${overlayStates.vendedor.data.length} resultados`;
      }

      function updateVendedorPageInfo() {
        const startIndex =
          (overlayStates.vendedor.currentPage - 1) *
            overlayStates.vendedor.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.vendedor.currentPage * overlayStates.vendedor.pageSize,
          overlayStates.vendedor.filteredData.length
        );
        const total = overlayStates.vendedor.filteredData.length;

        document.getElementById(
          "vendedorResultsInfo"
        ).textContent = `Mostrando ${startIndex} a ${endIndex} de ${total} resultados`;
      }

      function updateVariaveisInfo() {
        document.getElementById("variaveisTotalRecords").textContent =
          overlayStates.variaveis.data.length;
        document.getElementById("variaveisVisibleRecords").textContent =
          overlayStates.variaveis.filteredData.length;
        document.getElementById("variaveisLastUpdate").textContent =
          overlayStates.variaveis.lastUpdate
            ? overlayStates.variaveis.lastUpdate.toLocaleTimeString("pt-BR")
            : "-";
        document.getElementById(
          "variaveisResultsInfo"
        ).textContent = `Mostrando ${overlayStates.variaveis.filteredData.length} de ${overlayStates.variaveis.data.length} resultados`;
      }

      function updateVariaveisPageInfo() {
        const startIndex =
          (overlayStates.variaveis.currentPage - 1) *
            overlayStates.variaveis.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.variaveis.currentPage *
            overlayStates.variaveis.pageSize,
          overlayStates.variaveis.filteredData.length
        );
        const total = overlayStates.variaveis.filteredData.length;

        document.getElementById(
          "variaveisPageInfo"
        ).textContent = `Mostrando ${startIndex} a ${endIndex} de ${total} registros`;
      }

      // Funções de paginação
      function updateFaturamentoPageInfo() {
        const startIndex =
          (overlayStates.faturamento.currentPage - 1) *
            overlayStates.faturamento.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.faturamento.currentPage *
            overlayStates.faturamento.pageSize,
          overlayStates.faturamento.filteredData.length
        );
        const total = overlayStates.faturamento.filteredData.length;

        document.getElementById(
          "faturamentoPageInfo"
        ).textContent = `Mostrando ${startIndex}-${endIndex} de ${total} registros`;
      }

      function updateMetaPageInfo() {
        const startIndex =
          (overlayStates.meta.currentPage - 1) * overlayStates.meta.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.meta.currentPage * overlayStates.meta.pageSize,
          overlayStates.meta.filteredData.length
        );
        const total = overlayStates.meta.filteredData.length;

        document.getElementById(
          "metaPageInfo"
        ).textContent = `Mostrando ${startIndex}-${endIndex} de ${total} registros`;
      }

      function updateAtingidoPageInfo() {
        const startIndex =
          (overlayStates.atingido.currentPage - 1) *
            overlayStates.atingido.pageSize +
          1;
        const endIndex = Math.min(
          overlayStates.atingido.currentPage * overlayStates.atingido.pageSize,
          overlayStates.atingido.filteredData.length
        );
        const total = overlayStates.atingido.filteredData.length;

        document.getElementById(
          "atingidoPageInfo"
        ).textContent = `Mostrando ${startIndex}-${endIndex} de ${total} registros`;
      }

      // Funções de paginação (renderização dos botões)
      function renderFaturamentoPagination() {
        const totalPages = Math.ceil(
          overlayStates.faturamento.filteredData.length /
            overlayStates.faturamento.pageSize
        );
        const pagination = document.getElementById("faturamentoPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToFaturamentoPage(${
          overlayStates.faturamento.currentPage - 1
        })" 
                     ${
                       overlayStates.faturamento.currentPage === 1
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(
          1,
          overlayStates.faturamento.currentPage - 2
        );
        const endPage = Math.min(
          totalPages,
          overlayStates.faturamento.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToFaturamentoPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.faturamento.currentPage ? "active" : ""
          }" 
                         onclick="goToFaturamentoPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToFaturamentoPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToFaturamentoPage(${
          overlayStates.faturamento.currentPage + 1
        })" 
                     ${
                       overlayStates.faturamento.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      function renderMetaPagination() {
        const totalPages = Math.ceil(
          overlayStates.meta.filteredData.length / overlayStates.meta.pageSize
        );
        const pagination = document.getElementById("metaPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToMetaPage(${
          overlayStates.meta.currentPage - 1
        })" 
                     ${overlayStates.meta.currentPage === 1 ? "disabled" : ""}>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(1, overlayStates.meta.currentPage - 2);
        const endPage = Math.min(
          totalPages,
          overlayStates.meta.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToMetaPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.meta.currentPage ? "active" : ""
          }" 
                         onclick="goToMetaPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToMetaPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToMetaPage(${
          overlayStates.meta.currentPage + 1
        })" 
                     ${
                       overlayStates.meta.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      function renderAtingidoPagination() {
        const totalPages = Math.ceil(
          overlayStates.atingido.filteredData.length /
            overlayStates.atingido.pageSize
        );
        const pagination = document.getElementById("atingidoPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToAtingidoPage(${
          overlayStates.atingido.currentPage - 1
        })" 
                     ${
                       overlayStates.atingido.currentPage === 1
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(1, overlayStates.atingido.currentPage - 2);
        const endPage = Math.min(
          totalPages,
          overlayStates.atingido.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToAtingidoPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.atingido.currentPage ? "active" : ""
          }" 
                         onclick="goToAtingidoPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToAtingidoPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToAtingidoPage(${
          overlayStates.atingido.currentPage + 1
        })" 
                     ${
                       overlayStates.atingido.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      function renderBeneficioPagination() {
        const totalPages = Math.ceil(
          overlayStates.beneficio.filteredData.length /
            overlayStates.beneficio.pageSize
        );
        const pagination = document.getElementById("beneficioPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToBeneficioPage(${
          overlayStates.beneficio.currentPage - 1
        })" 
                     ${
                       overlayStates.beneficio.currentPage === 1
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(1, overlayStates.beneficio.currentPage - 2);
        const endPage = Math.min(
          totalPages,
          overlayStates.beneficio.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToBeneficioPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.beneficio.currentPage ? "active" : ""
          }" 
                         onclick="goToBeneficioPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToBeneficioPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToBeneficioPage(${
          overlayStates.beneficio.currentPage + 1
        })" 
                     ${
                       overlayStates.beneficio.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      function renderEvolucaoMensalPagination() {
        const totalPages = Math.ceil(
          overlayStates.evolucaoMensal.filteredData.length /
            overlayStates.evolucaoMensal.pageSize
        );
        const pagination = document.getElementById("evolucaoMensalPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToEvolucaoMensalPage(${
          overlayStates.evolucaoMensal.currentPage - 1
        })" 
                     ${
                       overlayStates.evolucaoMensal.currentPage === 1
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(
          1,
          overlayStates.evolucaoMensal.currentPage - 2
        );
        const endPage = Math.min(
          totalPages,
          overlayStates.evolucaoMensal.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToEvolucaoMensalPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.evolucaoMensal.currentPage ? "active" : ""
          }" 
                         onclick="goToEvolucaoMensalPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToEvolucaoMensalPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToEvolucaoMensalPage(${
          overlayStates.evolucaoMensal.currentPage + 1
        })" 
                     ${
                       overlayStates.evolucaoMensal.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      function renderVendedorPagination() {
        const totalPages = Math.ceil(
          overlayStates.vendedor.filteredData.length /
            overlayStates.vendedor.pageSize
        );
        const pagination = document.getElementById("vendedorPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToVendedorPage(${
          overlayStates.vendedor.currentPage - 1
        })" 
                     ${
                       overlayStates.vendedor.currentPage === 1
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(1, overlayStates.vendedor.currentPage - 2);
        const endPage = Math.min(
          totalPages,
          overlayStates.vendedor.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToVendedorPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.vendedor.currentPage ? "active" : ""
          }" 
                         onclick="goToVendedorPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToVendedorPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToVendedorPage(${
          overlayStates.vendedor.currentPage + 1
        })" 
                     ${
                       overlayStates.vendedor.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      function renderVariaveisPagination() {
        const totalPages = Math.ceil(
          overlayStates.variaveis.filteredData.length /
            overlayStates.variaveis.pageSize
        );
        const pagination = document.getElementById("variaveisPagination");

        if (totalPages <= 1) {
          pagination.innerHTML = "";
          return;
        }

        let html = "";

        // Botão anterior
        html += `<button class="page-btn" onclick="goToVariaveisPage(${
          overlayStates.variaveis.currentPage - 1
        })" 
                     ${
                       overlayStates.variaveis.currentPage === 1
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;

        // Páginas
        const startPage = Math.max(1, overlayStates.variaveis.currentPage - 2);
        const endPage = Math.min(
          totalPages,
          overlayStates.variaveis.currentPage + 2
        );

        if (startPage > 1) {
          html += `<button class="page-btn" onclick="goToVariaveisPage(1)">1</button>`;
          if (startPage > 2) {
            html += `<span class="text-muted">...</span>`;
          }
        }

        for (let i = startPage; i <= endPage; i++) {
          html += `<button class="page-btn ${
            i === overlayStates.variaveis.currentPage ? "active" : ""
          }" 
                         onclick="goToVariaveisPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            html += `<span class="text-muted">...</span>`;
          }
          html += `<button class="page-btn" onclick="goToVariaveisPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="page-btn" onclick="goToVariaveisPage(${
          overlayStates.variaveis.currentPage + 1
        })" 
                     ${
                       overlayStates.variaveis.currentPage === totalPages
                         ? "disabled"
                         : ""
                     }>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;

        pagination.innerHTML = html;
      }

      // Funções de navegação de páginas
      function goToFaturamentoPage(page) {
        const totalPages = Math.ceil(
          overlayStates.faturamento.filteredData.length /
            overlayStates.faturamento.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.faturamento.currentPage = page;
          renderFaturamentoTable();
        }
      }

      function goToMetaPage(page) {
        const totalPages = Math.ceil(
          overlayStates.meta.filteredData.length / overlayStates.meta.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.meta.currentPage = page;
          renderMetaTable();
        }
      }

      function goToAtingidoPage(page) {
        const totalPages = Math.ceil(
          overlayStates.atingido.filteredData.length /
            overlayStates.atingido.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.atingido.currentPage = page;
          renderAtingidoTable();
        }
      }

      function goToBeneficioPage(page) {
        const totalPages = Math.ceil(
          overlayStates.beneficio.filteredData.length /
            overlayStates.beneficio.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.beneficio.currentPage = page;
          renderBeneficioTable();
        }
      }

      function goToEvolucaoMensalPage(page) {
        const totalPages = Math.ceil(
          overlayStates.evolucaoMensal.filteredData.length /
            overlayStates.evolucaoMensal.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.evolucaoMensal.currentPage = page;
          renderEvolucaoMensalTable();
        }
      }

      function goToVendedorPage(page) {
        const totalPages = Math.ceil(
          overlayStates.vendedor.filteredData.length /
            overlayStates.vendedor.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.vendedor.currentPage = page;
          renderVendedorTable();
        }
      }

      function goToVariaveisPage(page) {
        const totalPages = Math.ceil(
          overlayStates.variaveis.filteredData.length /
            overlayStates.variaveis.pageSize
        );
        if (page >= 1 && page <= totalPages) {
          overlayStates.variaveis.currentPage = page;
          renderVariaveisTable();
        }
      }

      // Funções de mudança de tamanho de página
      function changeFaturamentoPageSize() {
        overlayStates.faturamento.pageSize = parseInt(
          document.getElementById("faturamentoPageSize").value
        );
        overlayStates.faturamento.currentPage = 1;
        renderFaturamentoTable();
      }

      function changeMetaPageSize() {
        overlayStates.meta.pageSize = parseInt(
          document.getElementById("metaPageSize").value
        );
        overlayStates.meta.currentPage = 1;
        renderMetaTable();
      }

      function changeAtingidoPageSize() {
        overlayStates.atingido.pageSize = parseInt(
          document.getElementById("atingidoPageSize").value
        );
        overlayStates.atingido.currentPage = 1;
        renderAtingidoTable();
      }

      function changeBeneficioPageSize() {
        overlayStates.beneficio.pageSize = parseInt(
          document.getElementById("beneficioPageSize").value
        );
        overlayStates.beneficio.currentPage = 1;
        renderBeneficioTable();
      }

      function changeEvolucaoMensalPageSize() {
        overlayStates.evolucaoMensal.pageSize = parseInt(
          document.getElementById("evolucaoMensalPageSize").value
        );
        overlayStates.evolucaoMensal.currentPage = 1;
        renderEvolucaoMensalTable();
      }

      function changeVendedorPageSize() {
        overlayStates.vendedor.pageSize = parseInt(
          document.getElementById("vendedorPageSize").value
        );
        overlayStates.vendedor.currentPage = 1;
        renderVendedorTable();
      }

      function changeVariaveisPageSize() {
        overlayStates.variaveis.pageSize = parseInt(
          document.getElementById("variaveisPageSize").value
        );
        overlayStates.variaveis.currentPage = 1;
        renderVariaveisTable();
      }

      // Funções de ordenação
      function sortFaturamentoTable(field) {
        if (overlayStates.faturamento.sortField === field) {
          overlayStates.faturamento.sortDirection =
            overlayStates.faturamento.sortDirection === "asc" ? "desc" : "asc";
        } else {
          overlayStates.faturamento.sortField = field;
          overlayStates.faturamento.sortDirection = "asc";
        }

        overlayStates.faturamento.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.faturamento.sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal)
            return overlayStates.faturamento.sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        updateFaturamentoSortIndicators();
        renderFaturamentoTable();
      }

      function sortMetaTable(field) {
        if (overlayStates.meta.sortField === field) {
          overlayStates.meta.sortDirection =
            overlayStates.meta.sortDirection === "asc" ? "desc" : "asc";
        } else {
          overlayStates.meta.sortField = field;
          overlayStates.meta.sortDirection = "asc";
        }

        overlayStates.meta.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.meta.sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal)
            return overlayStates.meta.sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        updateMetaSortIndicators();
        renderMetaTable();
      }

      function sortAtingidoTable(field) {
        if (overlayStates.atingido.sortField === field) {
          overlayStates.atingido.sortDirection =
            overlayStates.atingido.sortDirection === "asc" ? "desc" : "asc";
        } else {
          overlayStates.atingido.sortField = field;
          overlayStates.atingido.sortDirection = "asc";
        }

        overlayStates.atingido.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.atingido.sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal)
            return overlayStates.atingido.sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        updateAtingidoSortIndicators();
        renderAtingidoTable();
      }

      function sortBeneficioTable(field) {
        if (overlayStates.beneficio.sortField === field) {
          overlayStates.beneficio.sortDirection =
            overlayStates.beneficio.sortDirection === "asc" ? "desc" : "asc";
        } else {
          overlayStates.beneficio.sortField = field;
          overlayStates.beneficio.sortDirection = "asc";
        }

        overlayStates.beneficio.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.beneficio.sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal)
            return overlayStates.beneficio.sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        updateBeneficioSortIndicators();
        renderBeneficioTable();
      }

      function sortEvolucaoMensalTable(field) {
        if (overlayStates.evolucaoMensal.sortField === field) {
          overlayStates.evolucaoMensal.sortDirection =
            overlayStates.evolucaoMensal.sortDirection === "asc"
              ? "desc"
              : "asc";
        } else {
          overlayStates.evolucaoMensal.sortField = field;
          overlayStates.evolucaoMensal.sortDirection = "asc";
        }

        overlayStates.evolucaoMensal.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.evolucaoMensal.sortDirection === "asc"
              ? -1
              : 1;
          if (aVal > bVal)
            return overlayStates.evolucaoMensal.sortDirection === "asc"
              ? 1
              : -1;
          return 0;
        });

        updateEvolucaoMensalSortIndicators();
        renderEvolucaoMensalTable();
      }

      function sortVendedorTable(field) {
        if (overlayStates.vendedor.sortField === field) {
          overlayStates.vendedor.sortDirection =
            overlayStates.vendedor.sortDirection === "asc" ? "desc" : "asc";
        } else {
          overlayStates.vendedor.sortField = field;
          overlayStates.vendedor.sortDirection = "asc";
        }

        overlayStates.vendedor.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.vendedor.sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal)
            return overlayStates.vendedor.sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        updateVendedorSortIndicators();
        renderVendedorTable();
      }

      function sortVariaveisTable(field) {
        if (overlayStates.variaveis.sortField === field) {
          overlayStates.variaveis.sortDirection =
            overlayStates.variaveis.sortDirection === "asc" ? "desc" : "asc";
        } else {
          overlayStates.variaveis.sortField = field;
          overlayStates.variaveis.sortDirection = "asc";
        }

        overlayStates.variaveis.filteredData.sort((a, b) => {
          let aVal = a[field];
          let bVal = b[field];

          if (aVal < bVal)
            return overlayStates.variaveis.sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal)
            return overlayStates.variaveis.sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        updateVariaveisSortIndicators();
        renderVariaveisTable();
      }

      // Funções de atualização dos indicadores de ordenação
      function updateFaturamentoSortIndicators() {
        document
          .querySelectorAll("#faturamentoTable .sort-icon")
          .forEach((icon) => {
            icon.className = "fas fa-sort sort-icon";
          });

        if (overlayStates.faturamento.sortField) {
          const header = document.querySelector(
            `#faturamentoTable th[data-sort="${overlayStates.faturamento.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.faturamento.sortDirection === "asc" ? "up" : "down"
            } sort-icon`;
          }
        }
      }

      function updateMetaSortIndicators() {
        document.querySelectorAll("#metaTable .sort-icon").forEach((icon) => {
          icon.className = "fas fa-sort sort-icon";
        });

        if (overlayStates.meta.sortField) {
          const header = document.querySelector(
            `#metaTable th[data-sort="${overlayStates.meta.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.meta.sortDirection === "asc" ? "up" : "down"
            } sort-icon`;
          }
        }
      }

      function updateAtingidoSortIndicators() {
        document
          .querySelectorAll("#atingidoTable .sort-icon")
          .forEach((icon) => {
            icon.className = "fas fa-sort sort-icon";
          });

        if (overlayStates.atingido.sortField) {
          const header = document.querySelector(
            `#atingidoTable th[data-sort="${overlayStates.atingido.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.atingido.sortDirection === "asc" ? "up" : "down"
            } sort-icon`;
          }
        }
      }

      function updateBeneficioSortIndicators() {
        document
          .querySelectorAll("#beneficioTable .sort-icon")
          .forEach((icon) => {
            icon.className = "fas fa-sort sort-icon";
          });

        if (overlayStates.beneficio.sortField) {
          const header = document.querySelector(
            `#beneficioTable th[data-sort="${overlayStates.beneficio.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.beneficio.sortDirection === "asc" ? "up" : "down"
            } sort-icon`;
          }
        }
      }

      function updateEvolucaoMensalSortIndicators() {
        document
          .querySelectorAll("#evolucaoMensalTable .sort-icon")
          .forEach((icon) => {
            icon.className = "fas fa-sort sort-icon";
          });

        if (overlayStates.evolucaoMensal.sortField) {
          const header = document.querySelector(
            `#evolucaoMensalTable th[data-sort="${overlayStates.evolucaoMensal.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.evolucaoMensal.sortDirection === "asc"
                ? "up"
                : "down"
            } sort-icon`;
          }
        }
      }

      function updateVendedorSortIndicators() {
        document
          .querySelectorAll("#vendedorTable .sort-icon")
          .forEach((icon) => {
            icon.className = "fas fa-sort sort-icon";
          });

        if (overlayStates.vendedor.sortField) {
          const header = document.querySelector(
            `#vendedorTable th[data-sort="${overlayStates.vendedor.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.vendedor.sortDirection === "asc" ? "up" : "down"
            } sort-icon`;
          }
        }
      }

      function updateVariaveisSortIndicators() {
        document
          .querySelectorAll("#variaveisTable .sort-icon")
          .forEach((icon) => {
            icon.className = "fas fa-sort sort-icon";
          });

        if (overlayStates.variaveis.sortField) {
          const header = document.querySelector(
            `#variaveisTable th[data-sort="${overlayStates.variaveis.sortField}"] .sort-icon`
          );
          if (header) {
            header.className = `fas fa-sort-${
              overlayStates.variaveis.sortDirection === "asc" ? "up" : "down"
            } sort-icon`;
          }
        }
      }

      // Funções de refresh
      function refreshFaturamentoData() {
        loadFaturamentoData();
      }

      function refreshMetaData() {
        loadMetaData();
      }

      function refreshAtingidoData() {
        loadAtingidoData();
      }

      function refreshBeneficioData() {
        loadBeneficioData();
      }

      function refreshEvolucaoMensalData() {
        loadEvolucaoMensalData();
      }

      function refreshVendedorData() {
        loadVendedorData();
      }

      function refreshVariaveisData() {
        loadVariaveisData();
      }

      // Funções de exportação para Excel
      function exportFaturamentoToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.faturamento.filteredData.map((item) => ({
            "Código Vendedor": item.codvend,
            Vendedor: item.apelido,
            "% Real": item.percreal,
            "Meta Gatilho": item.metagat,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Atingiram Gatilho Detalhado");

        const fileName = `atingiram_gatilho_detalhado_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      function exportMetaToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.meta.filteredData.map((item) => ({
            "Código Vendedor": item.codvend,
            Vendedor: item.apelido,
            "Qtd Prevista": item.qtdprev,
            "Qtd Real": item.qtdreal,
            "Valor Previsto": item.vlr_prev,
            "Valor Real": item.vlr_real,
            "% Atingido": item.perc,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Meta Detalhada");

        const fileName = `meta_detalhada_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      function exportAtingidoToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.atingido.filteredData.map((item) => ({
            "Código Vendedor": item.codvend,
            Vendedor: item.apelido,
            "Qtd Prevista": item.qtdprev,
            "Qtd Real": item.qtdreal,
            "Valor Previsto": item.vlr_prev,
            "Valor Real": item.vlr_real,
            "% Atingido": item.perc,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Percentual Atingido Detalhado");

        const fileName = `percentual_atingido_detalhado_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      function exportBeneficioToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.beneficio.filteredData.map((item) => ({
            "Código Vendedor": item.codvend,
            Vendedor: item.apelido,
            Gatilho: item.gatilho,
            "Variável Preço Médio": item.variavel_precomed,
            "Variável Custo CR": item.variavel_custo_cr,
            "Variável Faturamento": item.variavel_faturamento,
            "FAT Grupo Prod Gat": item.fat_grupoprodgat,
            Total: item.total,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detalhamento de Benefício");

        const fileName = `detalhamento_beneficio_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      function exportEvolucaoMensalToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.evolucaoMensal.filteredData.map((item) => ({
            "Código Vendedor": item.codvend,
            Vendedor: item.apelido,
            "Valor Previsto": item.vlr_prev,
            "Valor Real": item.vlr_real,
            "% Atingido": item.perc,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detalhamento Evolução Mensal");

        const fileName = `detalhamento_evolucao_mensal_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      function exportVendedorToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.vendedor.filteredData.map((item) => ({
            "Data Ref.": formatOracleDate(item.dtref),
            "Código Parceiro": item.codparc,
            Parceiro: item.parceiro,
            Marca: item.marca,
            "Qtd Prevista": item.qtdprev,
            "Qtd Real": item.qtdreal,
            "Valor Previsto": item.vlr_prev,
            "Valor Real": item.vlr_real,
            "% Atingido": item.perc,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detalhamento Vendedor");

        const fileName = `detalhamento_vendedor_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      function exportVariaveisToExcel() {
        const ws = XLSX.utils.json_to_sheet(
          overlayStates.variaveis.filteredData.map((item) => ({
            "Código Vendedor": item.codvend,
            Vendedor: item.apelido,
            "Código Variável": item.codvar,
            "Descrição Variável": item.descrvar,
            Percentual: item.perc,
            "Benefício Real": item.beneficio_real,
            "Benefício Previsto": item.beneficio_previsto,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detalhamento Variáveis");

        const fileName = `detalhamento_variaveis_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(wb, fileName);
      }

      // Funções de exportação para PDF
      function exportFaturamentoToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(
          "Dashboard Fechamento Plus - Atingiram Gatilho Detalhado",
          20,
          16
        );

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.faturamento.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.faturamento.filteredData.map((item) => [
          item.codvend.toString(),
          item.apelido,
          item.percreal.toFixed(1) + "%",
          formatCurrency(item.metagat),
        ]);

        // Cabeçalhos da tabela
        const headers = ["Código", "Vendedor", "% Real", "Meta Gatilho"];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 25 },
          },
          margin: { top: 45, left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `faturamento_detalhado_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      function exportMetaToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Dashboard Fechamento Plus - Meta Detalhada", 20, 16);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.meta.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.meta.filteredData.map((item) => [
          item.codvend.toString(),
          item.apelido,
          item.qtdprev.toLocaleString("pt-BR"),
          item.qtdreal.toLocaleString("pt-BR"),
          formatCurrency(item.vlr_prev),
          formatCurrency(item.vlr_real),
          item.perc.toFixed(1) + "%",
        ]);

        // Cabeçalhos da tabela
        const headers = [
          "Código",
          "Vendedor",
          "Qtd Prevista",
          "Qtd Real",
          "Valor Previsto",
          "Valor Real",
          "% Atingido",
        ];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 25 },
          },
          margin: { top: 45, left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `meta_detalhada_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      function exportAtingidoToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Dashboard Fechamento Plus - % Atingido Detalhado", 20, 16);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.atingido.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.atingido.filteredData.map((item) => [
          item.codvend.toString(),
          item.apelido,
          item.qtdprev.toLocaleString("pt-BR"),
          item.qtdreal.toLocaleString("pt-BR"),
          formatCurrency(item.vlr_prev),
          formatCurrency(item.vlr_real),
          item.perc.toFixed(1) + "%",
        ]);

        // Cabeçalhos da tabela
        const headers = [
          "Código",
          "Vendedor",
          "Qtd Prevista",
          "Qtd Real",
          "Valor Previsto",
          "Valor Real",
          "% Atingido",
        ];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 25 },
          },
          margin: { top: 45, left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `percentual_atingido_detalhado_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      function exportBeneficioToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(
          "Dashboard Fechamento Plus - Detalhamento de Benefício",
          20,
          16
        );

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.beneficio.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.beneficio.filteredData.map((item) => [
          item.codvend.toString(),
          item.apelido,
          formatCurrency(item.gatilho),
          formatCurrency(item.variavel_precomed),
          formatCurrency(item.variavel_custo_cr),
          formatCurrency(item.variavel_faturamento),
          formatCurrency(item.fat_grupoprodgat),
          formatCurrency(item.total),
        ]);

        // Cabeçalhos da tabela
        const headers = [
          "Código",
          "Vendedor",
          "Gatilho",
          "Var. Preço Médio",
          "Var. Custo CR",
          "Var. Faturamento",
          "FAT Grupo Prod",
          "Total",
        ];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 },
            5: { cellWidth: 30 },
            6: { cellWidth: 30 },
            7: { cellWidth: 25 },
          },
          margin: { top: 45, left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `detalhamento_beneficio_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      function exportEvolucaoMensalToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(
          "Dashboard Fechamento Plus - Detalhamento Evolução Mensal",
          20,
          16
        );

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.evolucaoMensal.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.evolucaoMensal.filteredData.map(
          (item) => [
            item.codvend.toString(),
            item.apelido,
            formatCurrency(item.vlr_prev),
            formatCurrency(item.vlr_real),
            item.perc.toFixed(1) + "%",
          ]
        );

        // Cabeçalhos da tabela
        const headers = [
          "Código",
          "Vendedor",
          "Valor Previsto",
          "Valor Real",
          "% Atingido",
        ];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 15 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 35 },
            5: { cellWidth: 30 },
            6: { cellWidth: 30 },
            7: { cellWidth: 25 },
          },
          margin: { top: 45, left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `detalhamento_evolucao_mensal_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      function exportVendedorToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Dashboard Fechamento Plus - Detalhamento Vendedor", 20, 16);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.vendedor.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.vendedor.filteredData.map((item) => [
          formatOracleDate(item.dtref),
          item.codparc.toString(),
          item.parceiro,
          item.marca,
          item.qtdprev.toLocaleString("pt-BR"),
          item.qtdreal.toLocaleString("pt-BR"),
          formatCurrency(item.vlr_prev),
          formatCurrency(item.vlr_real),
          item.perc.toFixed(1) + "%",
        ]);

        // Cabeçalhos da tabela
        const headers = [
          "Data Ref.",
          "Código Parceiro",
          "Parceiro",
          "Marca",
          "Qtd Prevista",
          "Qtd Real",
          "Valor Previsto",
          "Valor Real",
          "% Atingido",
        ];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 30 },
            7: { cellWidth: 30 },
            8: { cellWidth: 25 },
          },
          margin: { top: 45, left: 5, right: 5 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `detalhamento_vendedor_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      function exportVariaveisToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        // Cabeçalho do PDF
        doc.setFillColor(0, 138, 112);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Dashboard Fechamento Plus - Detalhamento Variáveis", 20, 16);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 32);
        doc.text(
          `Total de registros: ${overlayStates.variaveis.filteredData.length}`,
          20,
          37
        );

        // Preparar dados para a tabela
        const tableData = overlayStates.variaveis.filteredData.map((item) => [
          item.codvend.toString(),
          item.apelido,
          item.codvar.toString(),
          item.descrvar,
          item.perc.toFixed(1) + "%",
          formatCurrency(item.beneficio_real),
          formatCurrency(item.beneficio_previsto),
        ]);

        // Cabeçalhos da tabela
        const headers = [
          "Código Vendedor",
          "Vendedor",
          "Código Variável",
          "Descrição Variável",
          "Percentual",
          "Benefício Real",
          "Benefício Previsto",
        ];

        // Configurações da tabela
        const tableConfig = {
          startY: 45,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [0, 138, 112],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 40 },
            4: { cellWidth: 25 },
            5: { cellWidth: 35 },
            6: { cellWidth: 35 },
          },
          margin: { top: 45, left: 5, right: 5 },
          pageBreak: "auto",
          tableWidth: "wrap",
        };

        doc.autoTable(tableConfig);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        const fileName = `detalhamento_variaveis_${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        doc.save(fileName);
      }

      // Event listeners para busca
      document.addEventListener("DOMContentLoaded", function () {
        // Event listeners para busca nos overlays
        document.getElementById("faturamentoSearch").addEventListener(
          "input",
          debounce(function (e) {
            overlayStates.faturamento.searchTerm = e.target.value.toLowerCase();
            overlayStates.faturamento.currentPage = 1;
            applyFaturamentoFilters();
            renderFaturamentoTable();
          }, 300)
        );

        // Event listeners para filtros avançados do faturamento
        const faturamentoFilterInputs = [
          "faturamentoFilterCodvend",
          "faturamentoFilterApelido",
          "faturamentoFilterPercRealMin",
          "faturamentoFilterPercRealMax",
          "faturamentoFilterMetaGatMin",
          "faturamentoFilterMetaGatMax",
          "faturamentoFilterStatus",
        ];

        faturamentoFilterInputs.forEach((inputId) => {
          const input = document.getElementById(inputId);
          if (input) {
            input.addEventListener(
              "input",
              debounce(function () {
                applyFaturamentoAdvancedFilters();
              }, 500)
            );
          }
        });

        document.getElementById("metaSearch").addEventListener(
          "input",
          debounce(function (e) {
            overlayStates.meta.searchTerm = e.target.value.toLowerCase();
            overlayStates.meta.currentPage = 1;
            applyMetaFilters();
            renderMetaTable();
          }, 300)
        );

        document.getElementById("evolucaoMensalSearch").addEventListener(
          "input",
          debounce(function (e) {
            overlayStates.evolucaoMensal.searchTerm =
              e.target.value.toLowerCase();
            overlayStates.evolucaoMensal.currentPage = 1;
            applyEvolucaoMensalFilters();
            renderEvolucaoMensalTable();
          }, 300)
        );

        // Event listeners para filtros avançados da Evolução Mensal
        const evolucaoMensalFilterInputs = [
          "evolucaoMensalFilterCodvend",
          "evolucaoMensalFilterApelido",
          "evolucaoMensalFilterVlrPrevMin",
          "evolucaoMensalFilterVlrPrevMax",
          "evolucaoMensalFilterVlrRealMin",
          "evolucaoMensalFilterVlrRealMax",
          "evolucaoMensalFilterPercMin",
          "evolucaoMensalFilterPercMax",
        ];

        evolucaoMensalFilterInputs.forEach((inputId) => {
          const input = document.getElementById(inputId);
          if (input) {
            input.addEventListener(
              "input",
              debounce(function () {
                applyEvolucaoMensalAdvancedFilters();
              }, 500)
            );
          }
        });

        // Event listeners para filtros avançados da Meta
        const metaFilterInputs = [
          "metaFilterCodvend",
          "metaFilterApelido",
          "metaFilterVlrBenePrevMin",
          "metaFilterVlrBenePrevMax",
          "metaFilterVlrBeneficioMin",
          "metaFilterVlrBeneficioMax",
        ];

        metaFilterInputs.forEach((inputId) => {
          const input = document.getElementById(inputId);
          if (input) {
            input.addEventListener(
              "input",
              debounce(function () {
                applyMetaAdvancedFilters();
              }, 500)
            );
          }
        });

        // Event listener para select de status da Meta
        const metaFilterStatus = document.getElementById("metaFilterStatus");
        if (metaFilterStatus) {
          metaFilterStatus.addEventListener("change", function () {
            applyMetaAdvancedFilters();
          });
        }

        // Event listener para busca geral de benefício
        document.getElementById("beneficioSearch").addEventListener(
          "input",
          debounce(function (e) {
            overlayStates.beneficio.searchTerm = e.target.value.toLowerCase();
            overlayStates.beneficio.currentPage = 1;
            applyBeneficioFilters();
            renderBeneficioTable();
          }, 300)
        );

        // Event listeners para filtros avançados de benefício
        const beneficioFilterInputs = [
          "beneficioFilterCodvend",
          "beneficioFilterApelido",
          "beneficioFilterGatilhoMin",
          "beneficioFilterGatilhoMax",
          "beneficioFilterPrecoMedMin",
          "beneficioFilterPrecoMedMax",
          "beneficioFilterCustoCRMin",
          "beneficioFilterCustoCRMax",
          "beneficioFilterFaturamentoMin",
          "beneficioFilterFaturamentoMax",
          "beneficioFilterFatGrupoMin",
          "beneficioFilterFatGrupoMax",
          "beneficioFilterTotalMin",
          "beneficioFilterTotalMax",
        ];

        beneficioFilterInputs.forEach((inputId) => {
          const input = document.getElementById(inputId);
          if (input) {
            input.addEventListener(
              "input",
              debounce(function () {
                applyBeneficioAdvancedFilters();
              }, 500)
            );
          }
        });

        // Event listener para busca geral de variáveis
        document.getElementById("variaveisSearch").addEventListener(
          "input",
          debounce(function (e) {
            overlayStates.variaveis.searchTerm = e.target.value.toLowerCase();
            overlayStates.variaveis.currentPage = 1;
            applyVariaveisFilters();
            renderVariaveisTable();
          }, 300)
        );

        // Event listeners para filtros avançados de variáveis
        const variaveisFilterInputs = [
          "variaveisFilterCodvend",
          "variaveisFilterApelido",
          "variaveisFilterPercMin",
          "variaveisFilterPercMax",
          "variaveisFilterBeneficioRealMin",
          "variaveisFilterBeneficioRealMax",
          "variaveisFilterBeneficioPrevistoMin",
          "variaveisFilterBeneficioPrevistoMax",
        ];

        variaveisFilterInputs.forEach((inputId) => {
          const input = document.getElementById(inputId);
          if (input) {
            input.addEventListener(
              "input",
              debounce(function () {
                applyVariaveisAdvancedFilters();
              }, 500)
            );
          }
        });

        // Fechar overlays ao clicar fora
        document
          .getElementById("faturamentoModal")
          .addEventListener("click", (e) => {
            if (e.target.id === "faturamentoModal") {
              closeOverlay("faturamentoModal");
            }
          });

        document.getElementById("metaModal").addEventListener("click", (e) => {
          if (e.target.id === "metaModal") {
            closeOverlay("metaModal");
          }
        });

        document
          .getElementById("beneficioModal")
          .addEventListener("click", (e) => {
            if (e.target.id === "beneficioModal") {
              closeOverlay("beneficioModal");
            }
          });

        document
          .getElementById("evolucaoMensalModal")
          .addEventListener("click", (e) => {
            if (e.target.id === "evolucaoMensalModal") {
              closeOverlay("evolucaoMensalModal");
            }
          });

        document
          .getElementById("variaveisModal")
          .addEventListener("click", (e) => {
            if (e.target.id === "variaveisModal") {
              closeOverlay("variaveisModal");
            }
          });
      });

      // Funções de filtro
      function applyFaturamentoFilters() {
        let filtered = overlayStates.faturamento.data;

        // Aplicar busca geral
        if (overlayStates.faturamento.searchTerm) {
          filtered = filtered.filter(
            (item) =>
              item.codvend
                .toString()
                .toLowerCase()
                .includes(overlayStates.faturamento.searchTerm) ||
              item.apelido
                .toLowerCase()
                .includes(overlayStates.faturamento.searchTerm)
          );
        }

        // Aplicar filtros avançados
        filtered = applyAdvancedFaturamentoFilters(filtered);

        overlayStates.faturamento.filteredData = filtered;
      }

      // Função para aplicar filtros avançados
      function applyAdvancedFaturamentoFilters(data) {
        const filters = overlayStates.faturamento.advancedFilters;
        let filtered = [...data];

        // Filtro por código vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.codvend) {
          const codvendList = filters.codvend.split(",").map((c) => c.trim());
          filtered = filtered.filter((item) =>
            codvendList.some((cod) => item.codvend.toString().includes(cod))
          );
        }

        // Filtro por nome vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.apelido) {
          const apelidoList = filters.apelido
            .split(",")
            .map((a) => a.trim().toLowerCase());
          filtered = filtered.filter((item) =>
            apelidoList.some((apelido) =>
              item.apelido.toLowerCase().includes(apelido)
            )
          );
        }

        // Filtro por percentual real (faixa)
        if (filters.percrealMin !== "") {
          filtered = filtered.filter(
            (item) => item.percreal >= parseFloat(filters.percrealMin)
          );
        }
        if (filters.percrealMax !== "") {
          filtered = filtered.filter(
            (item) => item.percreal <= parseFloat(filters.percrealMax)
          );
        }

        // Filtro por meta gatilho (faixa)
        if (filters.metagatMin !== "") {
          filtered = filtered.filter(
            (item) => item.metagat >= parseFloat(filters.metagatMin)
          );
        }
        if (filters.metagatMax !== "") {
          filtered = filtered.filter(
            (item) => item.metagat <= parseFloat(filters.metagatMax)
          );
        }

        // Filtro por status do gatilho
        if (filters.status) {
          switch (filters.status) {
            case "atingido":
              filtered = filtered.filter((item) => item.percreal >= 100);
              break;
            case "proximo":
              filtered = filtered.filter(
                (item) => item.percreal >= 80 && item.percreal < 100
              );
              break;
            case "abaixo":
              filtered = filtered.filter((item) => item.percreal < 80);
              break;
          }
        }

        return filtered;
      }

      // Função para alternar visibilidade dos filtros
      function toggleFaturamentoFilters() {
        const panel = document.getElementById("faturamentoFiltersPanel");
        const button = event.target.closest("button");

        if (overlayStates.faturamento.filtersVisible) {
          panel.style.display = "none";
          overlayStates.faturamento.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.faturamento.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      // Função para aplicar filtros avançados
      function applyFaturamentoAdvancedFilters() {
        // Coletar valores dos campos de filtro
        overlayStates.faturamento.advancedFilters.codvend =
          document.getElementById("faturamentoFilterCodvend").value;
        overlayStates.faturamento.advancedFilters.apelido =
          document.getElementById("faturamentoFilterApelido").value;
        overlayStates.faturamento.advancedFilters.percrealMin =
          document.getElementById("faturamentoFilterPercRealMin").value;
        overlayStates.faturamento.advancedFilters.percrealMax =
          document.getElementById("faturamentoFilterPercRealMax").value;
        overlayStates.faturamento.advancedFilters.metagatMin =
          document.getElementById("faturamentoFilterMetaGatMin").value;
        overlayStates.faturamento.advancedFilters.metagatMax =
          document.getElementById("faturamentoFilterMetaGatMax").value;
        overlayStates.faturamento.advancedFilters.status =
          document.getElementById("faturamentoFilterStatus").value;

        // Contar filtros ativos
        overlayStates.faturamento.activeFiltersCount = countActiveFilters(
          overlayStates.faturamento.advancedFilters
        );

        // Aplicar filtros
        applyFaturamentoFilters();
        renderFaturamentoTable();
        updateFaturamentoInfo();
        updateFaturamentoFiltersIndicator();
      }

      // Função para contar filtros ativos
      function countActiveFilters(filters) {
        let count = 0;
        Object.values(filters).forEach((value) => {
          if (value !== "" && value !== null && value !== undefined) {
            count++;
          }
        });
        return count;
      }

      // Função para limpar todos os filtros
      function clearFaturamentoFilters() {
        // Limpar campos de filtro
        document.getElementById("faturamentoFilterCodvend").value = "";
        document.getElementById("faturamentoFilterApelido").value = "";
        document.getElementById("faturamentoFilterPercRealMin").value = "";
        document.getElementById("faturamentoFilterPercRealMax").value = "";
        document.getElementById("faturamentoFilterMetaGatMin").value = "";
        document.getElementById("faturamentoFilterMetaGatMax").value = "";
        document.getElementById("faturamentoFilterStatus").value = "";

        // Limpar busca geral
        document.getElementById("faturamentoSearch").value = "";
        overlayStates.faturamento.searchTerm = "";

        // Resetar filtros no estado
        Object.keys(overlayStates.faturamento.advancedFilters).forEach(
          (key) => {
            overlayStates.faturamento.advancedFilters[key] = "";
          }
        );

        overlayStates.faturamento.activeFiltersCount = 0;

        // Aplicar filtros (que agora estarão vazios)
        applyFaturamentoFilters();
        renderFaturamentoTable();
        updateFaturamentoInfo();
        updateFaturamentoFiltersIndicator();
      }

      // Função para atualizar indicador de filtros ativos
      function updateFaturamentoFiltersIndicator() {
        const button = document.querySelector(
          'button[onclick="toggleFaturamentoFilters()"]'
        );

        if (overlayStates.faturamento.activeFiltersCount > 0) {
          button.classList.add("has-active-filters");
          if (!button.querySelector(".filters-active-indicator")) {
            const indicator = document.createElement("span");
            indicator.className = "filters-active-indicator";
            indicator.textContent =
              overlayStates.faturamento.activeFiltersCount;
            button.appendChild(indicator);
          } else {
            button.querySelector(".filters-active-indicator").textContent =
              overlayStates.faturamento.activeFiltersCount;
          }
        } else {
          button.classList.remove("has-active-filters");
          const indicator = button.querySelector(".filters-active-indicator");
          if (indicator) {
            indicator.remove();
          }
        }
      }

      // Função para salvar filtros no localStorage
      function saveFaturamentoFilters() {
        const filtersToSave = {
          ...overlayStates.faturamento.advancedFilters,
          searchTerm: overlayStates.faturamento.searchTerm,
        };

        localStorage.setItem(
          "faturamentoFilters",
          JSON.stringify(filtersToSave)
        );

        // Mostrar feedback visual
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        button.style.background = "#28a745";

        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.background = "";
        }, 2000);
      }

      // Função para carregar filtros do localStorage
      function loadFaturamentoFilters() {
        const savedFilters = localStorage.getItem("faturamentoFilters");

        if (savedFilters) {
          const filters = JSON.parse(savedFilters);

          // Aplicar filtros salvos aos campos
          document.getElementById("faturamentoFilterCodvend").value =
            filters.codvend || "";
          document.getElementById("faturamentoFilterApelido").value =
            filters.apelido || "";
          document.getElementById("faturamentoFilterQtdPrevMin").value =
            filters.qtdprevMin || "";
          document.getElementById("faturamentoFilterQtdPrevMax").value =
            filters.qtdprevMax || "";
          document.getElementById("faturamentoFilterQtdRealMin").value =
            filters.qtdrealMin || "";
          document.getElementById("faturamentoFilterQtdRealMax").value =
            filters.qtdrealMax || "";
          document.getElementById("faturamentoFilterVlrPrevMin").value =
            filters.vlrprevMin || "";
          document.getElementById("faturamentoFilterVlrPrevMax").value =
            filters.vlrprevMax || "";
          document.getElementById("faturamentoFilterVlrRealMin").value =
            filters.vlrrealMin || "";
          document.getElementById("faturamentoFilterVlrRealMax").value =
            filters.vlrrealMax || "";
          document.getElementById("faturamentoFilterPercMin").value =
            filters.percMin || "";
          document.getElementById("faturamentoFilterPercMax").value =
            filters.percMax || "";
          document.getElementById("faturamentoFilterStatus").value =
            filters.status || "";
          document.getElementById("faturamentoSearch").value =
            filters.searchTerm || "";

          // Aplicar filtros
          applyFaturamentoAdvancedFilters();

          // Mostrar feedback visual
          const button = event.target;
          const originalText = button.innerHTML;
          button.innerHTML = '<i class="fas fa-check"></i> Carregado!';
          button.style.background = "#28a745";

          setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = "";
          }, 2000);
        } else {
          // Mostrar feedback de erro
          const button = event.target;
          const originalText = button.innerHTML;
          button.innerHTML =
            '<i class="fas fa-exclamation"></i> Nenhum filtro salvo';
          button.style.background = "#ffc107";

          setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = "";
          }, 2000);
        }
      }

      // ===== FUNÇÕES DE FILTROS AVANÇADOS PARA META =====

      // Função para alternar visibilidade dos filtros da Meta
      function toggleMetaFilters() {
        const panel = document.getElementById("metaFiltersPanel");
        const button = document.getElementById("metaFiltersToggle");

        if (overlayStates.meta.filtersVisible) {
          panel.style.display = "none";
          overlayStates.meta.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.meta.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      // Função para aplicar filtros avançados da Meta
      function applyMetaAdvancedFilters() {
        // Coletar valores dos campos de filtro
        overlayStates.meta.advancedFilters.codvend =
          document.getElementById("metaFilterCodvend").value;
        overlayStates.meta.advancedFilters.apelido =
          document.getElementById("metaFilterApelido").value;
        overlayStates.meta.advancedFilters.vlrbene_prevMin =
          document.getElementById("metaFilterVlrBenePrevMin").value;
        overlayStates.meta.advancedFilters.vlrbene_prevMax =
          document.getElementById("metaFilterVlrBenePrevMax").value;
        overlayStates.meta.advancedFilters.vlrbeneficioMin =
          document.getElementById("metaFilterVlrBeneficioMin").value;
        overlayStates.meta.advancedFilters.vlrbeneficioMax =
          document.getElementById("metaFilterVlrBeneficioMax").value;

        // Contar filtros ativos
        overlayStates.meta.activeFiltersCount = countActiveFilters(
          overlayStates.meta.advancedFilters
        );

        // Aplicar filtros
        applyMetaFilters();
        renderMetaTable();
        updateMetaInfo();
        updateMetaFiltersIndicator();
      }

      // Função para aplicar filtros avançados da Meta (lógica de filtragem)
      function applyAdvancedMetaFilters(data) {
        const filters = overlayStates.meta.advancedFilters;
        let filtered = [...data];

        // Filtro por código vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.codvend) {
          const codvendList = filters.codvend.split(",").map((c) => c.trim());
          filtered = filtered.filter((item) =>
            codvendList.some((cod) => item.codvend.toString().includes(cod))
          );
        }

        // Filtro por nome vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.apelido) {
          const apelidoList = filters.apelido
            .split(",")
            .map((a) => a.trim().toLowerCase());
          filtered = filtered.filter((item) =>
            apelidoList.some((apelido) =>
              item.apelido.toLowerCase().includes(apelido)
            )
          );
        }

        // Filtros de benefício previsto
        if (filters.vlrbene_prevMin) {
          filtered = filtered.filter(
            (item) => item.vlrbene_prev >= parseFloat(filters.vlrbene_prevMin)
          );
        }
        if (filters.vlrbene_prevMax) {
          filtered = filtered.filter(
            (item) => item.vlrbene_prev <= parseFloat(filters.vlrbene_prevMax)
          );
        }

        // Filtros de benefício realizado
        if (filters.vlrbeneficioMin) {
          filtered = filtered.filter(
            (item) => item.vlrbeneficio >= parseFloat(filters.vlrbeneficioMin)
          );
        }
        if (filters.vlrbeneficioMax) {
          filtered = filtered.filter(
            (item) => item.vlrbeneficio <= parseFloat(filters.vlrbeneficioMax)
          );
        }

        return filtered;
      }

      // Função para limpar filtros da Meta
      function clearMetaFilters() {
        // Limpar campos de filtro
        document.getElementById("metaFilterCodvend").value = "";
        document.getElementById("metaFilterApelido").value = "";
        document.getElementById("metaFilterVlrBenePrevMin").value = "";
        document.getElementById("metaFilterVlrBenePrevMax").value = "";
        document.getElementById("metaFilterVlrBeneficioMin").value = "";
        document.getElementById("metaFilterVlrBeneficioMax").value = "";
        document.getElementById("metaSearch").value = "";

        // Limpar estado dos filtros
        overlayStates.meta.advancedFilters = {
          codvend: "",
          apelido: "",
          vlrbene_prevMin: "",
          vlrbene_prevMax: "",
          vlrbeneficioMin: "",
          vlrbeneficioMax: "",
        };
        overlayStates.meta.searchTerm = "";
        overlayStates.meta.activeFiltersCount = 0;

        // Aplicar filtros limpos
        applyMetaFilters();
        renderMetaTable();
        updateMetaInfo();
        updateMetaFiltersIndicator();
      }

      // Função para atualizar indicador de filtros ativos da Meta
      function updateMetaFiltersIndicator() {
        const indicator = document.getElementById("metaFiltersIndicator");
        if (overlayStates.meta.activeFiltersCount > 0) {
          indicator.textContent = overlayStates.meta.activeFiltersCount;
          indicator.style.display = "flex";
        } else {
          indicator.style.display = "none";
        }
      }

      // Função para salvar filtros da Meta
      function saveMetaFilters() {
        const filtersToSave = {
          ...overlayStates.meta.advancedFilters,
          searchTerm: overlayStates.meta.searchTerm,
        };

        localStorage.setItem("metaFilters", JSON.stringify(filtersToSave));

        // Mostrar feedback visual
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        button.style.background = "#28a745";

        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.background = "";
        }, 2000);
      }

      // Função para carregar filtros da Meta
      function loadMetaFilters() {
        const savedFilters = localStorage.getItem("metaFilters");

        if (savedFilters) {
          const filters = JSON.parse(savedFilters);

          // Aplicar filtros salvos aos campos
          document.getElementById("metaFilterCodvend").value =
            filters.codvend || "";
          document.getElementById("metaFilterApelido").value =
            filters.apelido || "";
          document.getElementById("metaFilterQtdPrevMin").value =
            filters.qtdprevMin || "";
          document.getElementById("metaFilterQtdPrevMax").value =
            filters.qtdprevMax || "";
          document.getElementById("metaFilterQtdRealMin").value =
            filters.qtdrealMin || "";
          document.getElementById("metaFilterQtdRealMax").value =
            filters.qtdrealMax || "";
          document.getElementById("metaFilterVlrPrevMin").value =
            filters.vlrprevMin || "";
          document.getElementById("metaFilterVlrPrevMax").value =
            filters.vlrprevMax || "";
          document.getElementById("metaFilterVlrRealMin").value =
            filters.vlrrealMin || "";
          document.getElementById("metaFilterVlrRealMax").value =
            filters.vlrrealMax || "";
          document.getElementById("metaFilterPercMin").value =
            filters.percMin || "";
          document.getElementById("metaFilterPercMax").value =
            filters.percMax || "";
          document.getElementById("metaFilterStatus").value =
            filters.status || "";
          document.getElementById("metaSearch").value =
            filters.searchTerm || "";

          // Aplicar filtros
          applyMetaAdvancedFilters();

          // Mostrar feedback visual
          const button = event.target;
          const originalText = button.innerHTML;
          button.innerHTML = '<i class="fas fa-check"></i> Carregado!';
          button.style.background = "#28a745";

          setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = "";
          }, 2000);
        } else {
          // Mostrar feedback de erro
          const button = event.target;
          const originalText = button.innerHTML;
          button.innerHTML =
            '<i class="fas fa-exclamation"></i> Nenhum filtro salvo';
          button.style.background = "#ffc107";

          setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = "";
          }, 2000);
        }
      }

      function applyMetaFilters() {
        let filtered = overlayStates.meta.data;

        // Aplicar busca geral
        if (overlayStates.meta.searchTerm) {
          filtered = filtered.filter(
            (item) =>
              item.codvend
                .toString()
                .toLowerCase()
                .includes(overlayStates.meta.searchTerm) ||
              item.apelido.toLowerCase().includes(overlayStates.meta.searchTerm)
          );
        }

        // Aplicar filtros avançados
        filtered = applyAdvancedMetaFilters(filtered);

        overlayStates.meta.filteredData = filtered;
      }

      function applyAtingidoFilters() {
        let filtered = overlayStates.atingido.data;

        // Aplicar busca geral
        if (overlayStates.atingido.searchTerm) {
          filtered = filtered.filter(
            (item) =>
              item.codvend
                .toString()
                .toLowerCase()
                .includes(overlayStates.atingido.searchTerm) ||
              item.apelido
                .toLowerCase()
                .includes(overlayStates.atingido.searchTerm)
          );
        }

        // Aplicar filtros avançados
        filtered = applyAdvancedAtingidoFilters(filtered);

        overlayStates.atingido.filteredData = filtered;
      }

      function applyEvolucaoMensalFilters() {
        let filtered = overlayStates.evolucaoMensal.data;

        // Aplicar busca geral
        if (overlayStates.evolucaoMensal.searchTerm) {
          filtered = filtered.filter(
            (item) =>
              item.codvend
                .toString()
                .toLowerCase()
                .includes(overlayStates.evolucaoMensal.searchTerm) ||
              item.apelido
                .toLowerCase()
                .includes(overlayStates.evolucaoMensal.searchTerm) ||
              item.mes_ano
                .toLowerCase()
                .includes(overlayStates.evolucaoMensal.searchTerm)
          );
        }

        // Aplicar filtros avançados
        filtered = applyAdvancedEvolucaoMensalFilters(filtered);

        overlayStates.evolucaoMensal.filteredData = filtered;
      }

      // Função para aplicar filtros de benefício
      function applyBeneficioFilters() {
        let filtered = overlayStates.beneficio.data;

        // Aplicar busca geral
        if (overlayStates.beneficio.searchTerm) {
          filtered = filtered.filter(
            (item) =>
              item.codvend
                .toString()
                .toLowerCase()
                .includes(overlayStates.beneficio.searchTerm) ||
              item.apelido
                .toLowerCase()
                .includes(overlayStates.beneficio.searchTerm)
          );
        }

        // Aplicar filtros avançados
        filtered = applyAdvancedBeneficioFilters(filtered);

        overlayStates.beneficio.filteredData = filtered;
      }

      // Função para aplicar filtros avançados de benefício
      function applyAdvancedBeneficioFilters(data) {
        const filters = overlayStates.beneficio.advancedFilters;
        let filtered = [...data];

        // Filtro por código vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.codvend) {
          const codvendList = filters.codvend.split(",").map((c) => c.trim());
          filtered = filtered.filter((item) =>
            codvendList.some((cod) => item.codvend.toString().includes(cod))
          );
        }

        // Filtro por nome vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.apelido) {
          const apelidoList = filters.apelido
            .split(",")
            .map((a) => a.trim().toLowerCase());
          filtered = filtered.filter((item) =>
            apelidoList.some((apelido) =>
              item.apelido.toLowerCase().includes(apelido)
            )
          );
        }

        // Filtros de benefício previsto
        if (filters.vlrbene_prevMin) {
          filtered = filtered.filter(
            (item) => item.vlrbene_prev >= parseFloat(filters.vlrbene_prevMin)
          );
        }
        if (filters.vlrbene_prevMax) {
          filtered = filtered.filter(
            (item) => item.vlrbene_prev <= parseFloat(filters.vlrbene_prevMax)
          );
        }

        // Filtros de benefício realizado
        if (filters.vlrbeneficioMin) {
          filtered = filtered.filter(
            (item) => item.vlrbeneficio >= parseFloat(filters.vlrbeneficioMin)
          );
        }
        if (filters.vlrbeneficioMax) {
          filtered = filtered.filter(
            (item) => item.vlrbeneficio <= parseFloat(filters.vlrbeneficioMax)
          );
        }

        return filtered;
      }

      // Função para aplicar filtros de variáveis
      function applyVariaveisFilters() {
        let filtered = overlayStates.variaveis.data;

        // Aplicar busca geral
        if (overlayStates.variaveis.searchTerm) {
          filtered = filtered.filter(
            (item) =>
              item.codvend
                .toString()
                .toLowerCase()
                .includes(overlayStates.variaveis.searchTerm) ||
              item.apelido
                .toLowerCase()
                .includes(overlayStates.variaveis.searchTerm) ||
              item.codvar
                .toString()
                .toLowerCase()
                .includes(overlayStates.variaveis.searchTerm) ||
              item.descrvar
                .toLowerCase()
                .includes(overlayStates.variaveis.searchTerm)
          );
        }

        // Aplicar filtros avançados
        filtered = applyAdvancedVariaveisFilters(filtered);

        overlayStates.variaveis.filteredData = filtered;
      }

      // Função para aplicar filtros avançados de variáveis
      function applyAdvancedVariaveisFilters(data) {
        const filters = overlayStates.variaveis.advancedFilters;
        let filtered = [...data];

        // Filtro por código vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.codvend) {
          const codvendList = filters.codvend.split(",").map((c) => c.trim());
          filtered = filtered.filter((item) =>
            codvendList.some((cod) => item.codvend.toString().includes(cod))
          );
        }

        // Filtro por nome vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.apelido) {
          const apelidoList = filters.apelido
            .split(",")
            .map((a) => a.trim().toLowerCase());
          filtered = filtered.filter((item) =>
            apelidoList.some((apelido) =>
              item.apelido.toLowerCase().includes(apelido)
            )
          );
        }

        // Filtros de percentual
        if (filters.percMin) {
          filtered = filtered.filter(
            (item) => item.perc >= parseFloat(filters.percMin)
          );
        }
        if (filters.percMax) {
          filtered = filtered.filter(
            (item) => item.perc <= parseFloat(filters.percMax)
          );
        }

        // Filtros de benefício real
        if (filters.beneficioRealMin) {
          filtered = filtered.filter(
            (item) =>
              item.beneficio_real >= parseFloat(filters.beneficioRealMin)
          );
        }
        if (filters.beneficioRealMax) {
          filtered = filtered.filter(
            (item) =>
              item.beneficio_real <= parseFloat(filters.beneficioRealMax)
          );
        }

        // Filtros de benefício previsto
        if (filters.beneficioPrevistoMin) {
          filtered = filtered.filter(
            (item) =>
              item.beneficio_previsto >=
              parseFloat(filters.beneficioPrevistoMin)
          );
        }
        if (filters.beneficioPrevistoMax) {
          filtered = filtered.filter(
            (item) =>
              item.beneficio_previsto <=
              parseFloat(filters.beneficioPrevistoMax)
          );
        }

        return filtered;
      }

      // ===== FUNÇÕES DE FILTROS AVANÇADOS PARA % ATINGIDO =====

      // Função para alternar visibilidade dos filtros do % Atingido
      function toggleAtingidoFilters() {
        const panel = document.getElementById("atingidoFiltersPanel");
        const button = document.getElementById("atingidoFiltersToggle");

        if (overlayStates.atingido.filtersVisible) {
          panel.style.display = "none";
          overlayStates.atingido.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.atingido.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      function toggleBeneficioFilters() {
        const panel = document.getElementById("beneficioFiltersPanel");
        const button = event.target.closest("button");

        if (overlayStates.beneficio.filtersVisible) {
          panel.style.display = "none";
          overlayStates.beneficio.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.beneficio.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      function toggleVariaveisFilters() {
        const panel = document.getElementById("variaveisFiltersPanel");
        const button = event.target.closest("button");

        if (overlayStates.variaveis.filtersVisible) {
          panel.style.display = "none";
          overlayStates.variaveis.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.variaveis.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      function clearVariaveisFilters() {
        // Limpar todos os campos de filtro
        document.getElementById("variaveisFilterCodvend").value = "";
        document.getElementById("variaveisFilterApelido").value = "";
        document.getElementById("variaveisFilterPercMin").value = "";
        document.getElementById("variaveisFilterPercMax").value = "";
        document.getElementById("variaveisFilterBeneficioRealMin").value = "";
        document.getElementById("variaveisFilterBeneficioRealMax").value = "";
        document.getElementById("variaveisFilterBeneficioPrevistoMin").value =
          "";
        document.getElementById("variaveisFilterBeneficioPrevistoMax").value =
          "";

        // Resetar filtros no estado
        overlayStates.variaveis.advancedFilters = {
          codvend: "",
          apelido: "",
          percMin: "",
          percMax: "",
          beneficioRealMin: "",
          beneficioRealMax: "",
          beneficioPrevistoMin: "",
          beneficioPrevistoMax: "",
        };

        // Aplicar filtros vazios
        applyVariaveisFilters();
        renderVariaveisTable();
        updateVariaveisFiltersIndicator();
      }

      function clearBeneficioFilters() {
        // Limpar todos os campos de filtro
        document.getElementById("beneficioFilterCodvend").value = "";
        document.getElementById("beneficioFilterApelido").value = "";
        document.getElementById("beneficioFilterGatilhoMin").value = "";
        document.getElementById("beneficioFilterGatilhoMax").value = "";
        document.getElementById("beneficioFilterPrecoMedMin").value = "";
        document.getElementById("beneficioFilterPrecoMedMax").value = "";
        document.getElementById("beneficioFilterCustoCRMin").value = "";
        document.getElementById("beneficioFilterCustoCRMax").value = "";
        document.getElementById("beneficioFilterFaturamentoMin").value = "";
        document.getElementById("beneficioFilterFaturamentoMax").value = "";
        document.getElementById("beneficioFilterFatGrupoMin").value = "";
        document.getElementById("beneficioFilterFatGrupoMax").value = "";
        document.getElementById("beneficioFilterTotalMin").value = "";
        document.getElementById("beneficioFilterTotalMax").value = "";

        // Limpar filtros no estado
        Object.keys(overlayStates.beneficio.advancedFilters).forEach((key) => {
          overlayStates.beneficio.advancedFilters[key] = "";
        });

        // Resetar dados filtrados
        overlayStates.beneficio.filteredData = [
          ...overlayStates.beneficio.data,
        ];
        overlayStates.beneficio.currentPage = 1;
        overlayStates.beneficio.activeFiltersCount = 0;

        renderBeneficioTable();
        updateBeneficioInfo();
      }

      // Função para aplicar filtros avançados de benefício (coletar valores dos campos)
      function applyBeneficioAdvancedFilters() {
        // Coletar valores dos campos de filtro
        overlayStates.beneficio.advancedFilters.codvend =
          document.getElementById("beneficioFilterCodvend").value;
        overlayStates.beneficio.advancedFilters.apelido =
          document.getElementById("beneficioFilterApelido").value;
        overlayStates.beneficio.advancedFilters.gatilhoMin =
          document.getElementById("beneficioFilterGatilhoMin").value;
        overlayStates.beneficio.advancedFilters.gatilhoMax =
          document.getElementById("beneficioFilterGatilhoMax").value;
        overlayStates.beneficio.advancedFilters.variavel_precomedMin =
          document.getElementById("beneficioFilterPrecoMedMin").value;
        overlayStates.beneficio.advancedFilters.variavel_precomedMax =
          document.getElementById("beneficioFilterPrecoMedMax").value;
        overlayStates.beneficio.advancedFilters.variavel_custo_crMin =
          document.getElementById("beneficioFilterCustoCRMin").value;
        overlayStates.beneficio.advancedFilters.variavel_custo_crMax =
          document.getElementById("beneficioFilterCustoCRMax").value;
        overlayStates.beneficio.advancedFilters.variavel_faturamentoMin =
          document.getElementById("beneficioFilterFaturamentoMin").value;
        overlayStates.beneficio.advancedFilters.variavel_faturamentoMax =
          document.getElementById("beneficioFilterFaturamentoMax").value;
        overlayStates.beneficio.advancedFilters.fat_grupoprodgatMin =
          document.getElementById("beneficioFilterFatGrupoMin").value;
        overlayStates.beneficio.advancedFilters.fat_grupoprodgatMax =
          document.getElementById("beneficioFilterFatGrupoMax").value;
        overlayStates.beneficio.advancedFilters.totalMin =
          document.getElementById("beneficioFilterTotalMin").value;
        overlayStates.beneficio.advancedFilters.totalMax =
          document.getElementById("beneficioFilterTotalMax").value;

        // Contar filtros ativos
        overlayStates.beneficio.activeFiltersCount = countActiveFilters(
          overlayStates.beneficio.advancedFilters
        );

        // Aplicar filtros
        applyBeneficioFilters();
        renderBeneficioTable();
        updateBeneficioInfo();
        updateBeneficioFiltersIndicator();
      }

      // Função para aplicar filtros avançados de variáveis (coletar valores dos campos)
      function applyVariaveisAdvancedFilters() {
        // Coletar valores dos campos de filtro
        overlayStates.variaveis.advancedFilters.codvend =
          document.getElementById("variaveisFilterCodvend").value;
        overlayStates.variaveis.advancedFilters.apelido =
          document.getElementById("variaveisFilterApelido").value;
        overlayStates.variaveis.advancedFilters.percMin =
          document.getElementById("variaveisFilterPercMin").value;
        overlayStates.variaveis.advancedFilters.percMax =
          document.getElementById("variaveisFilterPercMax").value;
        overlayStates.variaveis.advancedFilters.beneficioRealMin =
          document.getElementById("variaveisFilterBeneficioRealMin").value;
        overlayStates.variaveis.advancedFilters.beneficioRealMax =
          document.getElementById("variaveisFilterBeneficioRealMax").value;
        overlayStates.variaveis.advancedFilters.beneficioPrevistoMin =
          document.getElementById("variaveisFilterBeneficioPrevistoMin").value;
        overlayStates.variaveis.advancedFilters.beneficioPrevistoMax =
          document.getElementById("variaveisFilterBeneficioPrevistoMax").value;

        // Contar filtros ativos
        overlayStates.variaveis.activeFiltersCount = countActiveFilters(
          overlayStates.variaveis.advancedFilters
        );

        // Aplicar filtros
        applyVariaveisFilters();
        renderVariaveisTable();
        updateVariaveisInfo();
        updateVariaveisFiltersIndicator();
      }

      // Função para atualizar indicador de filtros ativos de variáveis
      function updateVariaveisFiltersIndicator() {
        const button = document.querySelector(
          'button[onclick="toggleVariaveisFilters()"]'
        );
        const indicator = document.getElementById("variaveisFiltersIndicator");

        if (overlayStates.variaveis.activeFiltersCount > 0) {
          indicator.textContent = overlayStates.variaveis.activeFiltersCount;
          indicator.style.display = "inline";
          button.classList.add("has-active-filters");
        } else {
          indicator.style.display = "none";
          button.classList.remove("has-active-filters");
        }
      }

      // Função para atualizar indicador de filtros ativos de benefício
      function updateBeneficioFiltersIndicator() {
        const button = document.querySelector(
          'button[onclick="toggleBeneficioFilters()"]'
        );

        if (overlayStates.beneficio.activeFiltersCount > 0) {
          // Adicionar indicador de filtros ativos
          let indicator = button.querySelector(".filters-indicator");
          if (!indicator) {
            indicator = document.createElement("span");
            indicator.className = "filters-indicator";
            button.appendChild(indicator);
          }
          indicator.textContent = overlayStates.beneficio.activeFiltersCount;
          indicator.style.display = "inline-flex";
        } else {
          // Remover indicador se não há filtros ativos
          const indicator = button.querySelector(".filters-indicator");
          if (indicator) {
            indicator.style.display = "none";
          }
        }
      }

      function toggleEvolucaoMensalFilters() {
        const panel = document.getElementById("evolucaoMensalFiltersPanel");
        const button = event.target.closest("button");

        if (overlayStates.evolucaoMensal.filtersVisible) {
          panel.style.display = "none";
          overlayStates.evolucaoMensal.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.evolucaoMensal.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      function clearEvolucaoMensalFilters() {
        // Limpar todos os campos de filtro
        document.getElementById("evolucaoMensalFilterCodvend").value = "";
        document.getElementById("evolucaoMensalFilterApelido").value = "";
        document.getElementById("evolucaoMensalFilterVlrPrevMin").value = "";
        document.getElementById("evolucaoMensalFilterVlrPrevMax").value = "";
        document.getElementById("evolucaoMensalFilterVlrRealMin").value = "";
        document.getElementById("evolucaoMensalFilterVlrRealMax").value = "";
        document.getElementById("evolucaoMensalFilterPercMin").value = "";
        document.getElementById("evolucaoMensalFilterPercMax").value = "";

        // Limpar filtros no estado
        Object.keys(overlayStates.evolucaoMensal.advancedFilters).forEach(
          (key) => {
            overlayStates.evolucaoMensal.advancedFilters[key] = "";
          }
        );

        // Resetar dados filtrados
        overlayStates.evolucaoMensal.filteredData = [
          ...overlayStates.evolucaoMensal.data,
        ];
        overlayStates.evolucaoMensal.currentPage = 1;
        overlayStates.evolucaoMensal.activeFiltersCount = 0;

        renderEvolucaoMensalTable();
        updateEvolucaoMensalInfo();
        updateEvolucaoMensalFiltersIndicator();
      }

      // Função para aplicar filtros avançados de Evolução Mensal
      function applyEvolucaoMensalAdvancedFilters() {
        // Coletar valores dos campos de filtro
        overlayStates.evolucaoMensal.advancedFilters.codvend =
          document.getElementById("evolucaoMensalFilterCodvend").value;
        overlayStates.evolucaoMensal.advancedFilters.apelido =
          document.getElementById("evolucaoMensalFilterApelido").value;
        overlayStates.evolucaoMensal.advancedFilters.vlrprevMin =
          document.getElementById("evolucaoMensalFilterVlrPrevMin").value;
        overlayStates.evolucaoMensal.advancedFilters.vlrprevMax =
          document.getElementById("evolucaoMensalFilterVlrPrevMax").value;
        overlayStates.evolucaoMensal.advancedFilters.vlrrealMin =
          document.getElementById("evolucaoMensalFilterVlrRealMin").value;
        overlayStates.evolucaoMensal.advancedFilters.vlrrealMax =
          document.getElementById("evolucaoMensalFilterVlrRealMax").value;
        overlayStates.evolucaoMensal.advancedFilters.percMin =
          document.getElementById("evolucaoMensalFilterPercMin").value;
        overlayStates.evolucaoMensal.advancedFilters.percMax =
          document.getElementById("evolucaoMensalFilterPercMax").value;

        // Contar filtros ativos
        overlayStates.evolucaoMensal.activeFiltersCount = countActiveFilters(
          overlayStates.evolucaoMensal.advancedFilters
        );

        // Aplicar filtros
        applyEvolucaoMensalFilters();
        renderEvolucaoMensalTable();
        updateEvolucaoMensalInfo();
        updateEvolucaoMensalFiltersIndicator();
      }

      // Função para atualizar indicador de filtros ativos de Evolução Mensal
      function updateEvolucaoMensalFiltersIndicator() {
        const button = document.querySelector(
          'button[onclick="toggleEvolucaoMensalFilters()"]'
        );

        if (button) {
          if (overlayStates.evolucaoMensal.activeFiltersCount > 0) {
            button.classList.add("has-active-filters");
            if (!button.querySelector(".filters-active-indicator")) {
              const indicator = document.createElement("span");
              indicator.className = "filters-active-indicator";
              indicator.textContent =
                overlayStates.evolucaoMensal.activeFiltersCount;
              button.appendChild(indicator);
            } else {
              button.querySelector(".filters-active-indicator").textContent =
                overlayStates.evolucaoMensal.activeFiltersCount;
            }
          } else {
            button.classList.remove("has-active-filters");
            const indicator = button.querySelector(".filters-active-indicator");
            if (indicator) {
              indicator.remove();
            }
          }
        }
      }

      function toggleVendedorFilters() {
        const panel = document.getElementById("vendedorFiltersPanel");
        const button = event.target.closest("button");

        if (overlayStates.vendedor.filtersVisible) {
          panel.style.display = "none";
          overlayStates.vendedor.filtersVisible = false;
          button.innerHTML = '<i class="fas fa-filter"></i> Filtros Avançados';
        } else {
          panel.style.display = "block";
          overlayStates.vendedor.filtersVisible = true;
          button.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
        }
      }

      function clearVendedorFilters() {
        // Limpar todos os campos de filtro
        document.getElementById("vendedorFilterCodparc").value = "";
        document.getElementById("vendedorFilterParceiro").value = "";
        document.getElementById("vendedorFilterMarca").value = "";
        document.getElementById("vendedorFilterQtdPrevMin").value = "";
        document.getElementById("vendedorFilterQtdPrevMax").value = "";
        document.getElementById("vendedorFilterQtdRealMin").value = "";
        document.getElementById("vendedorFilterQtdRealMax").value = "";
        document.getElementById("vendedorFilterVlrPrevMin").value = "";
        document.getElementById("vendedorFilterVlrPrevMax").value = "";
        document.getElementById("vendedorFilterVlrRealMin").value = "";
        document.getElementById("vendedorFilterVlrRealMax").value = "";
        document.getElementById("vendedorFilterPercMin").value = "";
        document.getElementById("vendedorFilterPercMax").value = "";

        // Limpar filtros no estado
        Object.keys(overlayStates.vendedor.advancedFilters).forEach((key) => {
          overlayStates.vendedor.advancedFilters[key] = "";
        });

        // Resetar dados filtrados
        overlayStates.vendedor.filteredData = [...overlayStates.vendedor.data];
        overlayStates.vendedor.currentPage = 1;
        overlayStates.vendedor.activeFiltersCount = 0;

        renderVendedorTable();
        updateVendedorInfo();
      }

      // Função para aplicar filtros avançados do % Atingido
      function applyAtingidoAdvancedFilters() {
        // Coletar valores dos campos de filtro
        overlayStates.atingido.advancedFilters.codvend =
          document.getElementById("atingidoFilterCodvend").value;
        overlayStates.atingido.advancedFilters.apelido =
          document.getElementById("atingidoFilterApelido").value;
        overlayStates.atingido.advancedFilters.qtdprevMin =
          document.getElementById("atingidoFilterQtdPrevMin").value;
        overlayStates.atingido.advancedFilters.qtdprevMax =
          document.getElementById("atingidoFilterQtdPrevMax").value;
        overlayStates.atingido.advancedFilters.qtdrealMin =
          document.getElementById("atingidoFilterQtdRealMin").value;
        overlayStates.atingido.advancedFilters.qtdrealMax =
          document.getElementById("atingidoFilterQtdRealMax").value;
        overlayStates.atingido.advancedFilters.vlrprevMin =
          document.getElementById("atingidoFilterVlrPrevMin").value;
        overlayStates.atingido.advancedFilters.vlrprevMax =
          document.getElementById("atingidoFilterVlrPrevMax").value;
        overlayStates.atingido.advancedFilters.vlrrealMin =
          document.getElementById("atingidoFilterVlrRealMin").value;
        overlayStates.atingido.advancedFilters.vlrrealMax =
          document.getElementById("atingidoFilterVlrRealMax").value;
        overlayStates.atingido.advancedFilters.percMin =
          document.getElementById("atingidoFilterPercMin").value;
        overlayStates.atingido.advancedFilters.percMax =
          document.getElementById("atingidoFilterPercMax").value;
        overlayStates.atingido.advancedFilters.status = document.getElementById(
          "atingidoFilterStatus"
        ).value;

        // Contar filtros ativos
        overlayStates.atingido.activeFiltersCount = countActiveFilters(
          overlayStates.atingido.advancedFilters
        );

        // Aplicar filtros
        applyAtingidoFilters();
        renderAtingidoTable();
        updateAtingidoInfo();
        updateAtingidoFiltersIndicator();
      }

      // Função para aplicar filtros avançados do % Atingido (lógica de filtragem)
      function applyAdvancedAtingidoFilters(data) {
        const filters = overlayStates.atingido.advancedFilters;
        let filtered = [...data];

        // Filtro por código vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.codvend) {
          const codvendList = filters.codvend.split(",").map((c) => c.trim());
          filtered = filtered.filter((item) =>
            codvendList.some((cod) => item.codvend.toString().includes(cod))
          );
        }

        // Filtro por nome vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.apelido) {
          const apelidoList = filters.apelido
            .split(",")
            .map((a) => a.trim().toLowerCase());
          filtered = filtered.filter((item) =>
            apelidoList.some((apelido) =>
              item.apelido.toLowerCase().includes(apelido)
            )
          );
        }

        // Filtros de quantidade prevista
        if (filters.qtdprevMin) {
          filtered = filtered.filter(
            (item) => item.qtdprev >= parseFloat(filters.qtdprevMin)
          );
        }
        if (filters.qtdprevMax) {
          filtered = filtered.filter(
            (item) => item.qtdprev <= parseFloat(filters.qtdprevMax)
          );
        }

        // Filtros de quantidade real
        if (filters.qtdrealMin) {
          filtered = filtered.filter(
            (item) => item.qtdreal >= parseFloat(filters.qtdrealMin)
          );
        }
        if (filters.qtdrealMax) {
          filtered = filtered.filter(
            (item) => item.qtdreal <= parseFloat(filters.qtdrealMax)
          );
        }

        // Filtros de valor previsto
        if (filters.vlrprevMin) {
          filtered = filtered.filter(
            (item) => item.vlr_prev >= parseFloat(filters.vlrprevMin)
          );
        }
        if (filters.vlrprevMax) {
          filtered = filtered.filter(
            (item) => item.vlr_prev <= parseFloat(filters.vlrprevMax)
          );
        }

        // Filtros de valor real
        if (filters.vlrrealMin) {
          filtered = filtered.filter(
            (item) => item.vlr_real >= parseFloat(filters.vlrrealMin)
          );
        }
        if (filters.vlrrealMax) {
          filtered = filtered.filter(
            (item) => item.vlr_real <= parseFloat(filters.vlrrealMax)
          );
        }

        // Filtros de percentual atingido
        if (filters.percMin) {
          filtered = filtered.filter(
            (item) => item.perc >= parseFloat(filters.percMin)
          );
        }
        if (filters.percMax) {
          filtered = filtered.filter(
            (item) => item.perc <= parseFloat(filters.percMax)
          );
        }

        // Filtro por status da meta
        if (filters.status) {
          filtered = filtered.filter((item) => {
            if (filters.status === "atingida") return item.perc >= 100;
            if (filters.status === "proxima")
              return item.perc >= 80 && item.perc < 100;
            if (filters.status === "abaixo") return item.perc < 80;
            return true;
          });
        }

        return filtered;
      }

      function applyAdvancedEvolucaoMensalFilters(data) {
        const filters = overlayStates.evolucaoMensal.advancedFilters;
        let filtered = [...data];

        // Filtro por código vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.codvend) {
          const codvendList = filters.codvend.split(",").map((c) => c.trim());
          filtered = filtered.filter((item) =>
            codvendList.some((cod) => item.codvend.toString().includes(cod))
          );
        }

        // Filtro por nome vendedor (suporta múltiplos valores separados por vírgula)
        if (filters.apelido) {
          const apelidoList = filters.apelido
            .split(",")
            .map((a) => a.trim().toLowerCase());
          filtered = filtered.filter((item) =>
            apelidoList.some((apelido) =>
              item.apelido.toLowerCase().includes(apelido)
            )
          );
        }

        // Filtros de valor previsto
        if (filters.vlrprevMin) {
          filtered = filtered.filter(
            (item) => item.vlr_prev >= parseFloat(filters.vlrprevMin)
          );
        }
        if (filters.vlrprevMax) {
          filtered = filtered.filter(
            (item) => item.vlr_prev <= parseFloat(filters.vlrprevMax)
          );
        }

        // Filtros de valor real
        if (filters.vlrrealMin) {
          filtered = filtered.filter(
            (item) => item.vlr_real >= parseFloat(filters.vlrrealMin)
          );
        }
        if (filters.vlrrealMax) {
          filtered = filtered.filter(
            (item) => item.vlr_real <= parseFloat(filters.vlrrealMax)
          );
        }

        // Filtros de percentual atingido
        if (filters.percMin) {
          filtered = filtered.filter(
            (item) => item.perc >= parseFloat(filters.percMin)
          );
        }
        if (filters.percMax) {
          filtered = filtered.filter(
            (item) => item.perc <= parseFloat(filters.percMax)
          );
        }

        return filtered;
      }

      // Função para limpar filtros do % Atingido
      function clearAtingidoFilters() {
        // Limpar campos de filtro
        document.getElementById("atingidoFilterCodvend").value = "";
        document.getElementById("atingidoFilterApelido").value = "";
        document.getElementById("atingidoFilterQtdPrevMin").value = "";
        document.getElementById("atingidoFilterQtdPrevMax").value = "";
        document.getElementById("atingidoFilterQtdRealMin").value = "";
        document.getElementById("atingidoFilterQtdRealMax").value = "";
        document.getElementById("atingidoFilterVlrPrevMin").value = "";
        document.getElementById("atingidoFilterVlrPrevMax").value = "";
        document.getElementById("atingidoFilterVlrRealMin").value = "";
        document.getElementById("atingidoFilterVlrRealMax").value = "";
        document.getElementById("atingidoFilterPercMin").value = "";
        document.getElementById("atingidoFilterPercMax").value = "";
        document.getElementById("atingidoFilterStatus").value = "";
        document.getElementById("atingidoSearch").value = "";

        // Limpar estado dos filtros
        overlayStates.atingido.advancedFilters = {
          codvend: "",
          apelido: "",
          qtdprevMin: "",
          qtdprevMax: "",
          qtdrealMin: "",
          qtdrealMax: "",
          vlrprevMin: "",
          vlrprevMax: "",
          vlrrealMin: "",
          vlrrealMax: "",
          percMin: "",
          percMax: "",
          status: "",
        };
        overlayStates.atingido.searchTerm = "";
        overlayStates.atingido.activeFiltersCount = 0;

        // Aplicar filtros limpos
        applyAtingidoFilters();
        renderAtingidoTable();
        updateAtingidoInfo();
        updateAtingidoFiltersIndicator();
      }

      // Função para atualizar indicador de filtros ativos do % Atingido
      function updateAtingidoFiltersIndicator() {
        const indicator = document.getElementById("atingidoFiltersIndicator");
        if (overlayStates.atingido.activeFiltersCount > 0) {
          indicator.textContent = overlayStates.atingido.activeFiltersCount;
          indicator.style.display = "flex";
        } else {
          indicator.style.display = "none";
        }
      }

      // Função para salvar filtros do % Atingido
      function saveAtingidoFilters() {
        const filtersToSave = {
          ...overlayStates.atingido.advancedFilters,
          searchTerm: overlayStates.atingido.searchTerm,
        };

        localStorage.setItem("atingidoFilters", JSON.stringify(filtersToSave));

        // Mostrar feedback visual
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        button.style.background = "#28a745";

        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.background = "";
        }, 2000);
      }

      // Função para carregar filtros do % Atingido
      function loadAtingidoFilters() {
        const savedFilters = localStorage.getItem("atingidoFilters");

        if (savedFilters) {
          const filters = JSON.parse(savedFilters);

          // Aplicar filtros salvos aos campos
          document.getElementById("atingidoFilterCodvend").value =
            filters.codvend || "";
          document.getElementById("atingidoFilterApelido").value =
            filters.apelido || "";
          document.getElementById("atingidoFilterQtdPrevMin").value =
            filters.qtdprevMin || "";
          document.getElementById("atingidoFilterQtdPrevMax").value =
            filters.qtdprevMax || "";
          document.getElementById("atingidoFilterQtdRealMin").value =
            filters.qtdrealMin || "";
          document.getElementById("atingidoFilterQtdRealMax").value =
            filters.qtdrealMax || "";
          document.getElementById("atingidoFilterVlrPrevMin").value =
            filters.vlrprevMin || "";
          document.getElementById("atingidoFilterVlrPrevMax").value =
            filters.vlrprevMax || "";
          document.getElementById("atingidoFilterVlrRealMin").value =
            filters.vlrrealMin || "";
          document.getElementById("atingidoFilterVlrRealMax").value =
            filters.vlrrealMax || "";
          document.getElementById("atingidoFilterPercMin").value =
            filters.percMin || "";
          document.getElementById("atingidoFilterPercMax").value =
            filters.percMax || "";
          document.getElementById("atingidoFilterStatus").value =
            filters.status || "";
          document.getElementById("atingidoSearch").value =
            filters.searchTerm || "";

          // Aplicar filtros
          applyAtingidoAdvancedFilters();

          // Mostrar feedback visual
          const button = event.target;
          const originalText = button.innerHTML;
          button.innerHTML = '<i class="fas fa-check"></i> Carregado!';
          button.style.background = "#28a745";

          setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = "";
          }, 2000);
        } else {
          // Mostrar feedback de erro
          const button = event.target;
          const originalText = button.innerHTML;
          button.innerHTML =
            '<i class="fas fa-exclamation"></i> Nenhum filtro salvo';
          button.style.background = "#ffc107";

          setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = "";
          }, 2000);
        }
      }

      // Função debounce
      function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }
    </script>
  </body>
</html>
