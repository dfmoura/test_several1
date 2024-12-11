const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');
const dataTable = document.getElementById('dataTable').querySelector('tbody');

const apiBaseURL = 'https://nome-do-app.herokuapp.com/api/users';

async function fetchData() {
    const response = await fetch(apiBaseURL);
    const data = await response.json();
    renderTable(data);
}

function renderTable(data) {
    dataTable.innerHTML = '';
    data.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.fullName}</td>
            <td>${user.email}</td>
            <td class="actions">
                <button onclick="editUser(${user.id})">Editar</button>
                <button onclick="deleteUser(${user.id})">Excluir</button>
            </td>
        `;
        dataTable.appendChild(row);
    });
}

addBtn.addEventListener('click', async () => {
    const fullName = fullNameInput.value;
    const email = emailInput.value;
    if (!fullName || !email) {
        alert('Preencha todos os campos!');
        return;
    }

    await fetch(apiBaseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email })
    });

    fetchData();
    fullNameInput.value = '';
    emailInput.value = '';
});

cancelBtn.addEventListener('click', () => {
    fullNameInput.value = '';
    emailInput.value = '';
});

async function deleteUser(id) {
    await fetch(`${apiBaseURL}/${id}`, { method: 'DELETE' });
    fetchData();
}

async function editUser(id) {
    const newName = prompt('Novo nome completo:');
    const newEmail = prompt('Novo email:');
    if (!newName || !newEmail) {
        alert('Dados inválidos!');
        return;
    }

    await fetch(`${apiBaseURL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newName, email: newEmail })
    });

    fetchData();
}

fetchData();
