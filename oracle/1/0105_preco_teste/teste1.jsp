<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <style>

  </style>
  <snk:load/>
</head>
<body>

<script>
// Carregar o usuário atual usando SankhyaJX
async function carregarUsuarioAtual() {
    try {
        // Consulta SQL para obter o usuário logado
        const sql = "SELECT (STP_GET_CODUSULOGADO) AS CODUSU FROM DUAL";
        
        // Usar JX.consultar para executar a consulta
        const resultado = await JX.consultar(sql);
        
        if (resultado && resultado.length > 0) {
            const codigoUsuario = resultado[0].CODUSU;
            console.log('Usuário atual:', codigoUsuario);
            
            // Aqui você pode usar o código do usuário conforme necessário
            // Por exemplo, armazenar em uma variável global ou usar em outras funções
            window.usuarioAtual = codigoUsuario;
            
            // Exibir o usuário na página (opcional)
            document.getElementById('usuario-info').innerHTML = `Usuário logado: ${codigoUsuario}`;
            
            return codigoUsuario;
        } else {
            console.error('Não foi possível obter o usuário atual');
            return null;
        }
    } catch (erro) {
        console.error('Erro ao carregar usuário atual:', erro);
        return null;
    }
}

// Executar a função quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    carregarUsuarioAtual();
});
</script>

<div id="usuario-info" class="p-4 bg-blue-100 text-blue-800 rounded-lg m-4">
    Carregando usuário...
</div>

</body>
</html>