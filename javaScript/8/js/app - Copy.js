// Função para buscar dados da API de Cotação de Café
async function fetchCafePrice() {
    try {
        const response = await fetch('https://api.tradingeconomics.com/commodity/coffee?c=YOUR_API_KEY');
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da API de café');
        }
        const data = await response.json();
        document.getElementById('cafe-price').textContent = `R$ ${data[0].price.toFixed(2)}`;
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('cafe-price').textContent = 'Erro ao carregar cotação do café';
    }
}

// Função para buscar cotação do dólar em relação ao real (BRL) usando a API AwesomeAPI
async function fetchExchangeRate() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da API');
        }
        const data = await response.json();
        const brlRate = data.USDBRL.ask; // Obtém a taxa de câmbio BRL
        document.getElementById('usd-brl').textContent = `R$ ${parseFloat(brlRate).toFixed(2)}`;
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('usd-brl').textContent = 'Erro ao carregar cotação do dólar';
    }
}

// Função para buscar clima atual
async function fetchWeather() {
    const apiKey = 'YOUR_WEATHER_API_KEY'; // Substitua pela sua chave de API
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Monte%20Carmelo,br&appid=${apiKey}&units=metric&lang=pt`);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do clima');
        }
        const data = await response.json();
        document.getElementById('weather').textContent = `${data.weather[0].description}, ${data.main.temp}°C`;
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('weather').textContent = 'Erro ao carregar dados do clima';
    }
}

// Função para buscar precipitação acumulada
async function fetchRainData() {
    const apiKey = 'YOUR_WEATHER_API_KEY'; // Substitua pela sua chave de API
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=-18.7228&lon=-47.4914&appid=${apiKey}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados de precipitação');
        }
        const data = await response.json();
        document.getElementById('rain').textContent = `${data.daily[0].rain || 0} mm`;
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('rain').textContent = 'Erro ao carregar dados de precipitação';
    }
}

// Chamar as funções ao carregar a página
window.onload = function() {
    fetchCafePrice();
    fetchExchangeRate();
    fetchWeather();
    fetchRainData();
};
