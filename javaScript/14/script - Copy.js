// script.js

// Função de login
document.getElementById('loginForm')?.addEventListener('submit', function (event) {
    event.preventDefault(); // Previne o comportamento padrão do formulário

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Defina um usuário e senha padrão
    const validUsername = 'usuario';
    const validPassword = 'senha123';

    if (username === validUsername && password === validPassword) {
        // Armazena estado de login no localStorage
        localStorage.setItem('authenticated', 'true');
        // Redireciona para o dashboard
        window.location.href = 'index.html';
    } else {
        // Mostra uma mensagem de erro
        document.getElementById('error-message').textContent = 'Usuário ou senha inválidos!';
    }
});

// Verifica se o usuário está autenticado
if (!localStorage.getItem('authenticated')) {
    window.location.href = 'login.html'; // Redireciona para login se não estiver autenticado
}

// Função para criar um card
function createCard(title, value, description, isError = false) {
    const cardsContainer = document.getElementById('cardsContainer');
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');

    if (isError) {
        cardElement.innerHTML = `<h2>${title}</h2><p class="error">${value}</p><small>${description}</small>`;
    } else {
        cardElement.innerHTML = `<h2>${title}</h2><p>${value}</p><small>${description}</small>`;
    }

    cardsContainer.appendChild(cardElement);
}

// Função para buscar dados
async function fetchData() {
    // API para cotações do café (substitua pela URL correta)
    try {
        const coffeeResponse = await fetch('https://api.exemplo.com/cotacoes-cafe');
        if (!coffeeResponse.ok) throw new Error('Erro ao carregar a cotação do café');
        const coffeeData = await coffeeResponse.json();
        const coffeePrice = coffeeData.price || "N/A";
        createCard('Cotação do Café', `R$ ${coffeePrice}`, 'Cotação atual do café');
    } catch (error) {
        createCard('Cotação do Café', error.message, 'Não foi possível carregar a cotação do café', true);
    }

    // API para câmbio
    try {
        const exchangeResponse = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        if (!exchangeResponse.ok) throw new Error('Erro ao carregar a cotação do câmbio');
        const exchangeData = await exchangeResponse.json();
        const exchangeRate = exchangeData.USDBRL.ask || "N/A";
        createCard('Câmbio (USD/BRL)', `R$ ${exchangeRate}`, 'Taxa de câmbio atual');
    } catch (error) {
        createCard('Câmbio (USD/BRL)', error.message, 'Não foi possível carregar a cotação do câmbio', true);
    }

    // API para clima (substitua pela URL correta)
    try {
        const weatherResponse = await fetch('https://api.exemplo.com/clima');
        if (!weatherResponse.ok) throw new Error('Erro ao carregar dados climáticos');
        const weatherData = await weatherResponse.json();
        const rainfall = weatherData.rainfall || "N/A";
        createCard('Milímetros de Chuva', `${rainfall} mm`, 'Precipitação atual');
    } catch (error) {
        createCard('Milímetros de Chuva', error.message, 'Não foi possível carregar dados climáticos', true);
    }
}

// Chama a função para buscar os dados se estiver no index
if (document.getElementById('cardsContainer')) {
    fetchData();
}

// Logout
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('authenticated'); // Remove o estado de autenticação
        window.location.href = 'login.html'; // Redireciona para a página de login
    });
}
