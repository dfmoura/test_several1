<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CRUD Conteúdo HTML5</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <style>
    .modal { display: none; position: fixed; z-index: 50; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background: rgba(0,0,0,0.4); }
    .modal-content { background: #fff; margin: 10% auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; }
    .show { display: block; }
  </style>
  <snk:load/>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="container mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6 text-center">CRUD Conteúdo HTML5</h1>
    <div class="flex justify-end mb-4">
      <button id="btnAdd" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><i class="fas fa-plus"></i> Novo Registro</button>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded shadow">
        <thead>
          <tr class="bg-gray-200 text-gray-700">
            <th class="py-2 px-4 text-center">ID</th>
            <th class="py-2 px-4 text-left">Nome</th>
            <th class="py-2 px-4 text-center">Valor</th>
            <th class="py-2 px-4 text-center">Data</th>
            <th class="py-2 px-4 text-center">Ações</th>
          </tr>
        </thead>
        <tbody id="tbodyDados">
          <!-- Dados dinâmicos -->
        </tbody>
      </table>
    </div>
    <div id="msg" class="mt-4 text-center"></div>
  </div>

  <!-- Modal Cadastro/Edição -->
  <div id="modalForm" class="modal">
    <div class="modal-content">
      <h2 id="modalTitle" class="text-xl font-semibold mb-4">Novo Registro</h2>
      <form id="formCrud" class="space-y-4">
        <input type="hidden" id="inputId">
        <div>
          <label class="block text-gray-700">Nome</label>
          <input type="text" id="inputNome" class="w-full border rounded px-3 py-2" required maxlength="100">
        </div>
        <div>
          <label class="block text-gray-700">Valor</label>
          <input type="number" id="inputValor" class="w-full border rounded px-3 py-2" required step="any">
        </div>
        <div>
          <label class="block text-gray-700">Data</label>
          <input type="date" id="inputData" class="w-full border rounded px-3 py-2" required>
        </div>
        <div class="flex justify-end space-x-2 mt-4">
          <button type="button" id="btnCancel" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancelar</button>
          <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal Confirmação Exclusão -->
  <div id="modalDelete" class="modal">
    <div class="modal-content">
      <h2 class="text-xl font-semibold mb-4">Confirmar Exclusão</h2>
      <p>Deseja realmente excluir este registro?</p>
      <div class="flex justify-end space-x-2 mt-4">
        <button type="button" id="btnCancelDelete" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancelar</button>
        <button type="button" id="btnConfirmDelete" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Excluir</button>
      </div>
    </div>
  </div>

  <script>
    let editId = null;
    let deleteId = null;

    function showMsg(msg, success = true) {
      const el = document.getElementById('msg');
      el.textContent = msg;
      el.className = success ? 'text-green-600' : 'text-red-600';
      setTimeout(() => { el.textContent = ''; }, 4000);
    }

    function openModal(edit = false, data = {}) {
      document.getElementById('modalForm').classList.add('show');
      document.getElementById('modalTitle').textContent = edit ? 'Editar Registro' : 'Novo Registro';
      document.getElementById('inputId').value = data.ID || '';
      document.getElementById('inputNome').value = data.NOME || '';
      document.getElementById('inputValor').value = data.VALOR || '';
      document.getElementById('inputData').value = data.DATA ? data.DATA.split('T')[0] : '';
      editId = edit ? data.ID : null;
    }

    function closeModal() {
      document.getElementById('modalForm').classList.remove('show');
      document.getElementById('formCrud').reset();
      editId = null;
    }

    function openDeleteModal(id) {
      deleteId = id;
      document.getElementById('modalDelete').classList.add('show');
    }
    function closeDeleteModal() {
      deleteId = null;
      document.getElementById('modalDelete').classList.remove('show');
    }



    function formatDataColuna(dataStr) {
      // Espera formato: 'DDMMYYYY HH:MM:SS'
      if (!dataStr) return '';
      const match = dataStr.match(/(\d{2})(\d{2})(\d{4})/);
      if (!match) return dataStr;
      return `${match[1]}/${match[2]}/${match[3]}`;
    }


    function formatDateToBR(dateStr) {
      if (!dateStr) return '';
      const [yyyy, mm, dd] = dateStr.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }        


    
    // Listar registros
    function listarDados() {
      JX.consultar('SELECT * FROM AD_CONTEUDOHTML5 ORDER BY ID').then(res => {
        const dados = res || [];
        const tbody = document.getElementById('tbodyDados');
        tbody.innerHTML = '';
        dados.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="py-2 px-4 text-center">${row.ID}</td>
            <td class="py-2 px-4 text-left">${row.NOME}</td>
            <td class="py-2 px-4 text-center">${row.VALOR}</td>
            <td class="py-2 px-4 text-center">${formatDataColuna(row.DATA)}</td>
            <td class="py-2 px-4 text-center">
              <button class="text-blue-600 mr-2" onclick="openModal(true, ${JSON.stringify(row).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
              <button class="text-red-600" onclick="openDeleteModal(${row.ID})"><i class="fas fa-trash"></i></button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }).catch(() => showMsg('Erro ao listar dados', false));
    }

    // Buscar próximo ID disponível
    function getNextId() {
      return JX.consultar('SELECT NVL(MAX(ID),0)+1 AS NEXT_ID FROM AD_CONTEUDOHTML5').then(res => res[0].NEXT_ID);
    }

    // Salvar (criar ou editar)
    document.getElementById('formCrud').onsubmit = async function(e) {
      e.preventDefault();
      const id = document.getElementById('inputId').value;
      const nome = document.getElementById('inputNome').value.trim();
      const valor = parseFloat(document.getElementById('inputValor').value);
      const data = document.getElementById('inputData').value;
      const dataFormatada = formatDateToBR(data);
      if (!nome || isNaN(valor) || !dataFormatada) {
        showMsg('Preencha todos os campos corretamente', false);
        return;
      }
      let dados = { NOME: nome, VALOR: valor, DATA: dataFormatada };
      let pk = {};
      if (editId) {
        dados.ID = parseInt(id);
        pk = { ID: parseInt(id) };
        JX.salvar(dados, 'AD_CONTEUDOHTML5', pk).then(() => {
          showMsg('Registro salvo com sucesso!');
          closeModal();
          listarDados();
        }).catch((err) => {
          console.error('Erro ao salvar:', err);
          showMsg('Erro ao salvar registro', false);
        });
      } else {
        // Não envie o ID, deixe o banco gerar!
        JX.salvar(dados, 'AD_CONTEUDOHTML5').then(() => {
          showMsg('Registro salvo com sucesso!');
          closeModal();
          listarDados();
        }).catch((err) => {
          console.error('Erro ao salvar:', err);
          showMsg('Erro ao salvar registro', false);
        });
      }
    };

    // Excluir
    document.getElementById('btnConfirmDelete').onclick = function() {
      if (!deleteId) return;
      JX.deletar('AD_CONTEUDOHTML5', [{ ID: deleteId }]).then(() => {
        showMsg('Registro excluído com sucesso!');
        closeDeleteModal();
        listarDados();
      }).catch(() => showMsg('Erro ao excluir registro', false));
    };

    // Eventos dos botões
    document.getElementById('btnAdd').onclick = function() { openModal(false); };
    document.getElementById('btnCancel').onclick = closeModal;
    document.getElementById('btnCancelDelete').onclick = closeDeleteModal;

    // Fechar modal ao clicar fora do conteúdo
    window.onclick = function(event) {
      if (event.target === document.getElementById('modalForm')) closeModal();
      if (event.target === document.getElementById('modalDelete')) closeDeleteModal();
    };

    // Inicialização
    listarDados();
  </script>
</body>
</html> 