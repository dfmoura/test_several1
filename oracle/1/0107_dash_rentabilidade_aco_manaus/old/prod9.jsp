<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

<style>
    /* Estilos adicionais aqui */
    body {
        
        margin-top: 10px; /* Remove o espaço no topo da página */
    }
    .card {
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        height: 85%; /* Reduz a altura em 15% */
    }
    .card:hover {
        transform: translateY(-10px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }
    .card:hover .card-body {
        border-radius: 15px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        background-color: #130455; /* Azul */
        color: #fff; /* Branco para o texto */
    }
    .card-footer {
        text-align: center; /* Centraliza o texto no rodapé */
        height: 50px; /* Ajusta a altura */
        font-size: 9px; /* Reduz o tamanho da fonte */
        padding: 8px 4px; /* Reduz o padding */
        line-height: 1.2; /* Reduz o line-height */
        white-space: nowrap; /* Evita quebra de linha */
        overflow: hidden; /* Esconde conteúdo que ultrapasse */
        text-overflow: ellipsis; /* Adiciona ... se necessário */
    }
    .icon {
        margin: 0 auto; /* Centraliza horizontalmente */
        display: block;
        width: 25px;
        height: 25px;
        background-color: transparent; 
    }
    .card:hover .icon svg,
    .card:hover .icon img {
        filter: brightness(0) invert(1); /* Deixa o ícone branco ao passar o mouse */
    }
    .logo {
        width: 100%;
        max-width: 150px;
    }
    
    /* Estilos para as setas organizados */
    .arrow-up {
        color: #10b981; /* Verde */
        font-size: 30px;
        font-weight: bold;
    }
    .arrow-down {
        color: #ef4444; /* Vermelho */
        font-size: 30px;
        font-weight: bold;
    }
    .arrow-neutral {
        color: #6b7280; /* Cinza */
        font-size: 30px;
        font-weight: bold;
    }

    /* Redução do espaçamento entre as seções */
    .custom-row {
        margin-top: 1rem; /* Reduz o espaçamento superior */
        margin-bottom: -2.5rem; /* Reduz o espaçamento inferior */
    }

    /* Fixed header styles */
    .fixed-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 35px;
      background: linear-gradient(135deg, #130455, #0f0340);
      box-shadow: 0 2px 8px rgba(19, 4, 85, 0.2);
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
      width: 40px;
      height: auto;
      filter: brightness(0) invert(1);
    }
    
    .header-title {
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0;
      text-align: center;
    }
    

    
    /* Adjust body padding to account for fixed header */
    body {
      padding-top: 35px !important;
    }        

    /* Estilos para as tags <p> e <h1> */
    p {
        font-size: 15px; /* Ajusta o tamanho da fonte de <p> */
    }
    h1 {
        font-size: 23px; /* Ajusta o tamanho da fonte de <h1> */
    }
    .footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background-color: #f8f9fa; /* Ajuste conforme necessário */
    border-top: 0.2px solid #130455; /* Ajuste conforme necessário */
    }

    .logo-footer {
        max-width: 70px; /* Ajuste conforme necessário */
    }
</style>

<snk:load/>




</head>

<body class="bg-light">
  <!-- Fixed Header -->
  <div class="fixed-header">
    <div class="header-logo">
      <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
        <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
      </a>
    </div>
    <h1 class="header-title">Rentabilidade Financeira 2.0</h1>
  </div>

<div class="container-fluid">

    <!-- Parte Superior - 6 Cards -->
    <div class="row custom-row">
        <div class="col-lg-2 col-md-4 mb-4" >
            <div class="card shadow-sm" title="Esta informação contempla o Total dos Produtos + IPI + ST - Desconto - Devoluções" onclick="abrir_fat()">
                <div class="card-body text-center" >
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                     <h1>Faturamento</h1>
                    <p>Faturamento</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_dev()">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Devolução</h1>
                    <p>Devolução</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla o ICMS + ST + IPI + PIS + COFINS + FEM*** " onclick="abrir_imp()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Impostos</h1>                    
                    <p>Impostos</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_cmv()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>CMV</h1>
                    <p>CMV</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>        
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_hl()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"></path></svg>
                    </div>
                    <h1>KG</h1>
                    <p>KG</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_desc()">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Desconto</h1>
                    <p>Desconto</p>
                </div>
                <div class="card-footer text-muted">
					<b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>

    <!-- Parte do Meio 1 - 2 Cards -->
    <div class="row custom-row">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla Faturamento - Impostos - CMV " onclick="abrir_mar()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21.19 7h2.81v15h-21v-5h-2.81v-15h21v5zm1.81 1h-19v13h19v-13zm-9.5 1c3.036 0 5.5 2.464 5.5 5.5s-2.464 5.5-5.5 5.5-5.5-2.464-5.5-5.5 2.464-5.5 5.5-5.5zm0 1c2.484 0 4.5 2.016 4.5 4.5s-2.016 4.5-4.5 4.5-4.5-2.016-4.5-4.5 2.016-4.5 4.5-4.5zm.5 8h-1v-.804c-.767-.16-1.478-.689-1.478-1.704h1.022c0 .591.326.886.978.886.817 0 1.327-.915-.167-1.439-.768-.27-1.68-.676-1.68-1.693 0-.796.573-1.297 1.325-1.448v-.798h1v.806c.704.161 1.313.673 1.313 1.598h-1.018c0-.788-.727-.776-.815-.776-.55 0-.787.291-.787.622 0 .247.134.497.957.768 1.056.344 1.663.845 1.663 1.746 0 .651-.376 1.288-1.313 1.448v.788zm6.19-11v-4h-19v13h1.81v-9h17.19z"/></svg>
                    </div>
                    <h1>Margem de Contribuição Nominal</h1>
                    <p>Margem de Contribuição Nominal</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla (Faturamento - Impostos - CMV) / Faturamento " onclick="abrir_mar_perc()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21.19 7h2.81v15h-21v-5h-2.81v-15h21v5zm1.81 1h-19v13h19v-13zm-9.5 1c3.036 0 5.5 2.464 5.5 5.5s-2.464 5.5-5.5 5.5-5.5-2.464-5.5-5.5 2.464-5.5 5.5-5.5zm0 1c2.484 0 4.5 2.016 4.5 4.5s-2.016 4.5-4.5 4.5-4.5-2.016-4.5-4.5 2.016-4.5 4.5-4.5zm.5 8h-1v-.804c-.767-.16-1.478-.689-1.478-1.704h1.022c0 .591.326.886.978.886.817 0 1.327-.915-.167-1.439-.768-.27-1.68-.676-1.68-1.693 0-.796.573-1.297 1.325-1.448v-.798h1v.806c.704.161 1.313.673 1.313 1.598h-1.018c0-.788-.727-.776-.815-.776-.55 0-.787.291-.787.622 0 .247.134.497.957.768 1.056.344 1.663.845 1.663 1.746 0 .651-.376 1.288-1.313 1.448v.788zm6.19-11v-4h-19v13h1.81v-9h17.19z"/></svg>
                    </div>
                    <h1>Margem de Contribuição %</h1>
                    <p>Margem de Contribuição %</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>    

    <!-- Parte do Meio 2 - 2 Cards -->
    <div class="row mt-2">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" onclick="abrir_do()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Despesa Operacional</h1>
                    <p>Despesa Operacional</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" onclick="abrir_inv()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Investimentos</h1>
                    <p>Investimentos</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>

    <!-- Parte Inferior - Somente Card -->
    <div class="row parte-inferior">
        <div class="col-lg-12 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla = Faturamento - Impostos - CMV - Despesa Operacional - Investimento " onclick="abrir_res()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8.502 5c-.257-1.675.04-3.562 1.229-5h7.259c-.522.736-1.768 2.175-1.391 5h-1.154c-.147-1.336.066-2.853.562-4h-4.725c-.666 1.003-.891 2.785-.657 4h-1.123zm10.498-1v20h-14v-20h2.374v.675c0 .732.583 1.325 1.302 1.325h6.647c.721 0 1.304-.593 1.304-1.325v-.675h2.373zm-9 17h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm3 4h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm3 4h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm-6-2h-2v1h2v-1zm3 0h-2v1h2v-1zm3 0h-2v1h2v-1zm1-7h-10v5h10v-5z"/></svg>
                    </div>
                    <h1>Resultado</h1>
                    <p>Resultado</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>
</div>

<script>
  /**
   * Função para adicionar seta baseada no valor
   * @param {number} value - Valor para comparar
   * @returns {string} HTML da seta
   */
  function addArrow(value) {
      if (value >= 0) {
          return '<span class="arrow-up">&uarr;</span>';
      } else {
          return '<span class="arrow-down">&darr;</span>';
      } 
  }

  /**
   * Função para carregar dados de faturamento
   */
  async function carregarDadosFaturamento() {
    try {
      const sql = `
        select 
            sum(case when dtneg between '01/08/2025' and '31/08/2025' then totalliq else 0 end) as totalliq_atual,
            sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
            and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end) as totalliq_anterior,
            case 
                when sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
                and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end) = 0 then null
                else round(((sum(case when dtneg between '01/08/2025' and '31/08/2025' then totalliq else 0 end) - 
                  sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
                  and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end)) * 100.0 / 
                 sum(case when dtneg between DATEADD(month, -1, '01/08/2025') 
                 and DATEADD(day, 30, DATEADD(month, -1, '01/08/2025')) then totalliq else 0 end)), 2)
            end as variacao_percentual
        from vw_rentabilidade_aco 
        where tipmov = 'V' and ATIVO_TOP = 'S' and AD_COMPOE_FAT = 'S'
      `;

      const resultado = await JX.consultar(sql);
      
      if (resultado && resultado.length > 0) {
        const dados = resultado[0];
        
        // Atualizar o card de faturamento
        const faturamentoCard = document.querySelector('.card[onclick="abrir_fat()"]');
        if (faturamentoCard) {
          // Atualizar o valor do faturamento
          const faturamentoElement = faturamentoCard.querySelector('p');
          if (faturamentoElement) {
            const valorAtual = dados.totalliq_atual || 0;
            faturamentoElement.textContent = `R$ ${valorAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          }
          
          // Atualizar o rodapé com período anterior e variação
          const cardFooter = faturamentoCard.querySelector('.card-footer');
          if (cardFooter) {
            const valorAnterior = dados.totalliq_anterior || 0;
            const variacao = dados.variacao_percentual || 0;
            
            // Adicionar seta indicativa baseada na variação usando a função addArrow
            const seta = addArrow(variacao);
            
            cardFooter.innerHTML = `
              <b>Per.Ant:</b>R$${valorAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
              <b>Var%:</b>${variacao.toFixed(2)}%${seta}
            `;
          }
        }
      } else {
        console.log('Nenhum dado de faturamento encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de faturamento:', error);
      // Em caso de erro, manter os valores padrão
    }
  }

  // Carregar dados quando a página carregar
  document.addEventListener('DOMContentLoaded', function() {
    carregarDadosFaturamento();
    
    // Atualizar dados a cada 5 minutos (300000 ms)
    setInterval(carregarDadosFaturamento, 300000);
  });

</script>

</body>
</html>