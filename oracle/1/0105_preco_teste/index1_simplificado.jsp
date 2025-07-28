<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material - Versão Simplificada</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <snk:load/>
</head>
<body>
  <div class="container mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6 text-center">Resumo Material - Versão Simplificada</h1>
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded shadow">
        <thead>
          <tr class="bg-gray-200 text-gray-700">
            <th class="py-2 px-2 text-center">NUTAB</th>
            <th class="py-2 px-2 text-center">CODTAB</th>
            <th class="py-2 px-2 text-center">NOMETAB</th>
            <th class="py-2 px-2 text-center">CODPROD</th>
            <th class="py-2 px-2 text-center">DESCRPROD</th>
            <th class="py-2 px-2 text-center">MARCA</th>
          </tr>
        </thead>
        <tbody id="tbodyResumoMaterial">
          <!-- Dados dinâmicos -->
        </tbody>
      </table>
    </div>
    <div id="msg" class="mt-4 text-center"></div>
  </div>
  <script>
    function showMsg(msg, success = true) {
      const el = document.getElementById('msg');
      el.textContent = msg;
      el.className = success ? 'text-green-600' : 'text-red-600';
      setTimeout(() => { el.textContent = ''; }, 4000);
    }

    function listarResumoMaterial() {
      // SQL simplificado para teste
      const sql = `
        SELECT 
          NVL(TAB.NUTAB, 0) AS NUTAB,
          NTA.CODTAB,
          SUBSTR(NTA.NOMETAB, 1, 3) AS NOMETAB,
          NVL(PRO.CODPROD, 0) AS CODPROD,
          PRO.DESCRPROD,
          NVL(PRO.MARCA, '0') AS MARCA
        FROM TGFPRO PRO
        INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
        LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
        LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
        LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
        WHERE NTA.ATIVO = 'S'
        AND PRO.CODGRUPOPROD LIKE '1%'
        AND PRO.ATIVO = 'S'
        AND TAB.DTVIGOR <= '01/06/2025'
        AND ROWNUM <= 50
        ORDER BY NTA.CODTAB, PRO.MARCA, PRO.CODPROD DESC
      `;
      
      JX.consultar(sql).then(res => {
        const dados = res || [];
        const tbody = document.getElementById('tbodyResumoMaterial');
        tbody.innerHTML = '';
        
        if (dados.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Nenhum registro encontrado</td></tr>';
          showMsg('Nenhum registro encontrado', false);
          return;
        }
        
        dados.forEach(row => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-gray-50';
          tr.innerHTML = `
            <td class='py-2 px-2 text-center'>${row.NUTAB ?? ''}</td>
            <td class='py-2 px-2 text-center'>${row.CODTAB ?? ''}</td>
            <td class='py-2 px-2 text-center'>${row.NOMETAB ?? ''}</td>
            <td class='py-2 px-2 text-center'>${row.CODPROD ?? ''}</td>
            <td class='py-2 px-2 text-center'>${row.DESCRPROD ?? ''}</td>
            <td class='py-2 px-2 text-center'>${row.MARCA ?? ''}</td>
          `;
          tbody.appendChild(tr);
        });
        
        showMsg(`Encontrados ${dados.length} registros`, true);
      }).catch(err => {
        console.error('Erro na consulta:', err);
        showMsg(`Erro ao listar dados: ${err.message}`, false);
      });
    }
    
    // Inicialização
    listarResumoMaterial();
  </script>
</body>
</html> 