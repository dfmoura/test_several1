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
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        document.getElementById('ip').textContent = data.ip;
        saveToDatabase({ ip: data.ip });
    } catch (error) {
        console.error('Erro ao obter IP:', error);
        document.getElementById('ip').textContent = 'Não foi possível obter o IP';
    }
}

// Função para obter o nome do dispositivo
function getDeviceInfo() {
    const deviceInfo = navigator.userAgent;
    const device = deviceInfo.includes("Windows") ? "Windows" :
                   deviceInfo.includes("Mac") ? "Mac" :
                   deviceInfo.includes("Linux") ? "Linux" :
                   "Dispositivo desconhecido";
    document.getElementById('device').textContent = device;
    return device;
}

// Função para gerar ou recuperar o código único
function getUniqueCode() {
    let uniqueCode = localStorage.getItem('uniqueCode');
    
    if (!uniqueCode) {
        uniqueCode = 'device-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('uniqueCode', uniqueCode);
    }
    
    document.getElementById('uniqueCode').textContent = uniqueCode;
    return uniqueCode;
}

// Função para salvar os dados no Firebase
function saveToDatabase(data) {
    const userData = {
        ip: data.ip || null,
        device: data.device || null,
        uniqueCode: data.uniqueCode || null,
        timestamp: new Date().toISOString(),
    };
    
    firebase.database().ref('user_data').push(userData)
        .then(() => {
            console.log('Dados salvos com sucesso no Firebase:', userData);
        })
        .catch(error => {
            console.error('Erro ao salvar dados no Firebase:', error);
        });
}

// Executa as funções quando a página é carregada
window.onload = function() {
    getIP();
    const device = getDeviceInfo();
    const uniqueCode = getUniqueCode();
    saveToDatabase({ device, uniqueCode });
};