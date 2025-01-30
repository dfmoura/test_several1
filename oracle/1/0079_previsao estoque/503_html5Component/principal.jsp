
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

        /* Splash screen */
        #splash-screen {
            position: fixed;
            width: 100%;
            height: 100vh;
            background-color: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }

        #splash-screen img {
        width: 300px; 
        margin-bottom: 50px;
        animation: pulse 2s infinite; 
    }


        .loading-bar {
            width: 40%;
            height: 10px;
            background-color: #e0e0e0;
            border-radius: 5px;
            overflow: hidden;
        }

        .loading-bar div {
            height: 100%;
            width: 0;
            background-color: #1b6e55;
            animation: load 3s forwards;
        }


        @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1); /* Aumenta um pouco */
        }
        100% {
            transform: scale(1);
        }
    }


        @keyframes load {
            to {
                width: 100%;
            }
        }

        .container {
            display: none; /* Esconde o conteúdo até que a splash screen desapareça */
            height: 100vh;
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

       

.card-grid {
    display: flex;
    justify-content: space-between;
}

.card-item {
    background-color: #fff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    flex: 1;
    margin: 10px;
    text-align: center;
}

.card-item h3 {
    font-size: 18px;
    margin-bottom: 10px;
}

.card-item p {
    font-size: 24px;
    font-weight: bold;
}


.chart-container {
            position: relative;
            width: 100%;
            height: 300px; 
        }

        .card-donuts {
    background-color: #fff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
    width: 50%; /* Definindo a largura para 50% */
   
}

    </style>
    <snk:load/>
</head>
<body>

    <!-- Splash Screen -->
    <div id="splash-screen">
        <img src="${BASE_FOLDER}/img/satis.png" alt="Logo TI"> <!-- Substitua 'logo-ti.png' pelo caminho da sua imagem -->
        <div class="loading-bar">
            <div></div>
        </div>
    </div>

    <div class="container">
        <div class="sidebar">
            <h2>Menu</h2>

            <div class="menu-item" onclick="goToPage('${BASE_FOLDER}/principal.jsp')">
                <i class="fas fa-chart-bar"></i> Principal
              </div>
           
            <div class="menu-item" onclick="goToPage('${BASE_FOLDER}/chamados.jsp')">
                <i class="fas fa-chart-bar"></i> Chamados
              </div>
        
              
        </div>
        <snk:query var="status">
            SELECT
            ERP.STATUS,
            F_DESCROPC('AD_SOLIERP', 'STATUS', ERP.STATUS) AS DESC_STATUS, 
            COUNT(*) AS Quantidade
            FROM AD_SOLIERP ERP
   
             
            GROUP BY ERP.STATUS,F_DESCROPC('AD_SOLIERP', 'STATUS', ERP.STATUS)
            ORDER BY ERP.STATUS
        </snk:query>
    


        <div class="content">
            <div class="card">
                <div class="card-header">Chamados da TI</div>
                <div class="card-content card-grid">
                    <div class="card-item">
                        <h3>Total de Chamados</h3>
                        <p>4,786</p>
                    </div>
                    <div class="card-item">
                        <h3>Em andamento</h3>
                        <p>1,245</p>
                    </div>
                    <div class="card-item">
                        <h3>Aguardando Execução</h3>
                        <p>567</p>
                    </div>
                </div>
            </div>
     

             <!-- Gráfico de Donuts -->
          
             <div class="card-donuts" >
                <h5>Chamados por Status</h5>
                <div class="chart-container" >
                    <canvas id="statusChart"  ></canvas>
                </div>
            </div>
        </div>
       

<script>
        function updateActiveMenuItem(selectedItem) {
            let menuItens = document.querySelectorAll('.menu-item');
            menuItens.forEach(item => item.classList.remove('active'));
            selectedItem.classList.add('active');
    }

    function HandleMenuClique(selectedItem, page) {
  updateActiveMenuItem(selectedItem);
  
  // Verifica se já está na página destino
  if (window.location.href.indexOf(page) === -1) {
    // Pequeno delay para garantir que o usuário veja a mudança visual
    setTimeout(() => {
      window.location.href = page;
    }, 100); // Delay de 100ms para o usuário ver a mudança de classe
  }
}



function goToPage(page) {
    window.location.href = page;
}
    </script>


</script>    

<script>
        // Simulando carregamento e escondendo splash screen
        window.addEventListener('load', function() {
            setTimeout(function() {
                document.getElementById('splash-screen').style.display = 'none';
                document.querySelector('.container').style.display = 'flex';
            }, 3000); // Tempo de carregamento simulado de 3 segundos
        });

        </script>
        
    <script>
// Configuração do gráfico de Status




var ctx = document.getElementById('statusChart').getContext('2d');

var statusLabels = [
    <c:forEach items="${status.rows}" var="row">
        "${row.STATUS}-${row.DESC_STATUS}",
    </c:forEach>              
];

var statusDataValues = [
    <c:forEach items="${status.rows}" var="row">
        ${row.Quantidade},
    </c:forEach>        
];

// Defina as cores específicas para cada STATUS
var statusColors = {
    "1": "#046e94",   // Aberto
    "2": "#d7dc23",   // Em andamento
    "3": "#008a70",   
    "4": "#ffb914"
    
};


// Mapeia as cores para os labels
var statusBackgroundColors = statusLabels.map(function(label) {
    var status = label.split('-')[0];  // Extrai o código do STATUS
    return statusColors[status];  // Se não houver cor definida, usa uma cor padrão
});

// Configuração do gráfico de Status
const statusData = {
    labels: statusLabels,
    datasets: [{
        label: 'Chamados por Status',
        data: statusDataValues,
        backgroundColor: statusBackgroundColors  // Usa as cores mapeadas
    }]
};

const statusConfig = {
    type: 'doughnut',
    data: statusData,
    options: {
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        const label = statusData.labels[tooltipItem.dataIndex] || '';
                        const value = statusData.datasets[0].data[tooltipItem.dataIndex];
                        return label + ': ' + value;
                    }
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        onClick: function(evt, activeElements) {
            if (activeElements.length > 0) {
                const index = activeElements[0].index;
                const STATUS = statusLabels[index].split('-')[0];
                abrirChamados(STATUS);
            }
        }
    }
};

  


        
    </script>

    
<script>// Renderizar o gráfico de Status
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, statusConfig);
    </script>

</body>
</html>
