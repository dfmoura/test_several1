// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database(app);

// Função para obter o IP público
function getIP() {
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('ip').textContent = data.ip;
            saveToDatabase(data.ip);
        })
        .catch(error => {
            console.error('Erro ao obter IP:', error);
            document.getElementById('ip').textContent = 'Não foi possível obter o IP';
        });
}

// Função para obter o nome do dispositivo
function getDeviceInfo() {
    const deviceInfo = navigator.userAgent;
    const device = deviceInfo.includes("Windows") ? "Windows" :
                   deviceInfo.includes("Mac") ? "Mac" :
                   deviceInfo.includes("Linux") ? "Linux" :
                   "Dispositivo desconhecido";
    document.getElementById('device').textContent = device;
}

// Função para gerar ou recuperar o código único
function getUniqueCode() {
    let uniqueCode = localStorage.getItem('uniqueCode');
    
    if (!uniqueCode) {
        // Se não existe um código, cria um novo
        uniqueCode = 'device-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('uniqueCode', uniqueCode);
    }
    
    document.getElementById('uniqueCode').textContent = uniqueCode;
    saveToDatabase(uniqueCode, true);
}

// Função para salvar dados no banco de dados Firebase
function saveToDatabase(data, isUniqueCode = false) {
    const userData = {
        ip: data,
        timestamp: new Date().toISOString(),
        uniqueCode: isUniqueCode ? data : null
    };
    
    // Envia os dados para o Firebase (cada registro terá um ID único gerado pelo Firebase)
    firebase.database().ref('user_data').push(userData)
        .then(() => {
            console.log('Dados salvos com sucesso no Firebase');
        })
        .catch(error => {
            console.error('Erro ao salvar dados no Firebase:', error);
        });
}

// Chama as funções quando a página é carregada
window.onload = function() {
    getIP();
    getDeviceInfo();
    getUniqueCode();
};
