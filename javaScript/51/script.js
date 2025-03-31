const apiUrl = 'http://localhost:3000/categorias';

// Função para carregar as categorias da API
async function loadCategorias() {
  try {
    const response = await fetch(apiUrl);
    console.log('Resposta da API:', response); // Log da resposta da API
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const categorias = await response.json();
    console.log('Categorias carregadas:', categorias); // Log das categorias carregadas

    const tbody = document.getElementById('categoria-list');
    tbody.innerHTML = ''; // Limpar a lista antes de adicionar as novas categorias
    
    categorias.forEach(categoria => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${categoria.nome}</td>
        <td>${categoria.tipo}</td>
        <td>
          <button class="delete" onclick="deleteCategoria(${categoria.id})">Deletar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

// Função para adicionar uma nova categoria
document.getElementById('categoria-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Evitar o envio normal do formulário
  const nome = document.getElementById('nome').value;
  const tipo = document.getElementById('tipo').value;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome, tipo }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Verifique a resposta da API
    const categoria = await response.json();
    console.log('Categoria adicionada:', categoria);

    loadCategorias(); // Atualizar a tabela após adicionar
    document.getElementById('categoria-form').reset(); // Limpar o formulário
  } catch (error) {
    console.error('Erro ao adicionar categoria:', error);
  }
});

// Função para excluir uma categoria
async function deleteCategoria(id) {
  await fetch(`${apiUrl}/${id}`, {
    method: 'DELETE',
  });
  
  loadCategorias(); // Atualizar a tabela após excluir
}

// Carregar categorias ao iniciar
loadCategorias();
