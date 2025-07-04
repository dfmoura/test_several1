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

<button id="insertDataBtn" class="bg-blue-500 text-white px-4 py-2 rounded">Inserir Registro</button>

<script>

async function getNextId() {
  try {
    const resultado = await JX.consultar({
      alias: "AD_TESTEPRECOLIMP",
      campos: ["ID"],
      ordenacao: [{ campo: "ID", ordem: "desc" }],
      qtdRegistros: 1
    });

    const maxId = resultado?.[0]?.ID || 0;
    return parseInt(maxId, 10) + 1;

  } catch (error) {
    console.error("Erro na consulta do ID:", error);
    return null;
  }
}


  async function inserirRegistro() {
    const novoId = await getNextId();
    if (!novoId) {
      alert("Erro ao gerar novo ID.");
      return;
    }

    try {
      await JX.salvar({
        alias: "AD_TESTEPRECOLIMP",
        salvar: [{
          ID: novoId,
          FLAG: "VALOR_TESTE"
        }]
      });

      alert("Registro inserido com sucesso! ID: " + novoId);
    } catch (error) {
      console.error("Erro ao inserir registro:", error);
      alert("Erro ao inserir registro.");
    }
  }

  document.getElementById("insertDataBtn").addEventListener("click", inserirRegistro);
</script>


</body>
</html>
