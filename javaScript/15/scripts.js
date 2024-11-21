// Simulação de login
const validUsername = 'usuario';
const validPassword = 'senha123';

document.getElementById('login-form')?.addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === validUsername && password === validPassword) {
        localStorage.setItem('authenticated', 'true');
        window.location.href = 'dashboard.html';
    } else {
        document.getElementById('login-message').classList.remove('hidden');
    }
});

// Protege a rota do dashboard
if (window.location.pathname.includes('dashboard.html')) {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
        window.location.href = 'index.html';
    }

    // Logout
    document.getElementById('logout')?.addEventListener('click', function() {
        localStorage.removeItem('authenticated');
        window.location.href = 'index.html';
    });
}


// Função para buscar a cotação do câmbio
async function fetchExchangeRate() {
    const exchangeRateElement = document.getElementById('exchange-rate');

    try {
        // Substitua pela sua API preferida de câmbio. Este é um exemplo fictício.
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();

        // Supondo que a moeda BRL esteja disponível no retorno da API
        const rate = data.rates.BRL;
        exchangeRateElement.textContent = `R$${rate.toFixed(2)} / USD`;
    } catch (error) {
        console.error('Erro ao buscar a cotação:', error);
        exchangeRateElement.textContent = 'Erro ao carregar a cotação.';
    }
}

// Executa a função ao carregar a página
window.onload = fetchExchangeRate;


    // Função para realizar o scraping
    async function fetchCafeData() {
        const response = await fetch('https://www.cepea.esalq.usp.br/br/indicador/cafe.aspx');
        const html = await response.text();
  
        // Criar um documento DOM temporário para manipulação do HTML
        const doc = new DOMParser().parseFromString(html, 'text/html');
  
        // Usando o XPath fornecido para pegar o valor
        const cafeValue = doc.evaluate('/html/body/div/div[3]/div[2]/div[2]/div[2]/div[1]/div[2]/div[1]/table/tbody/tr[1]/td[2]', doc, null, XPathResult.STRING_TYPE, null).stringValue;
  
        // Exibir o valor na página
        document.getElementById('cafeValor').textContent = cafeValue;
      }
  
      // Chama a função de scraping quando a página carrega
      fetchCafeData();