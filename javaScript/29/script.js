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
  
  // Inicializando o Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database(app);
  
  // Referência para a lista de IPs no Realtime Database
  const ipListRef = database.ref('ips');
  
  // Função para obter o IP do visitante
  async function getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Erro ao obter IP:', error);
      return null;
    }
  }
  
  // Função para adicionar o IP ao Firebase Realtime Database
  function addIPToDatabase(ip) {
    const newIpRef = ipListRef.push(); // Cria um novo item no banco de dados
    newIpRef.set({
      ip: ip,
      timestamp: Date.now()
    });
  }
  
  // Função para remover o IP do Firebase Realtime Database
  function removeIPFromDatabase(ip) {
    ipListRef.once('value', snapshot => {
      snapshot.forEach(childSnapshot => {
        if (childSnapshot.val().ip === ip) {
          childSnapshot.ref.remove();
        }
      });
    });
  }
  
  // Função para renderizar a lista de IPs
  function renderIPList() {
    ipListRef.on('value', snapshot => {
      const ipListElement = document.getElementById('ipList');
      ipListElement.innerHTML = ''; // Limpa a lista antes de atualizar
  
      snapshot.forEach(childSnapshot => {
        const ip = childSnapshot.val().ip;
        const li = document.createElement('li');
        li.classList.add('ip-item');
        li.textContent = ip;
        ipListElement.appendChild(li);
      });
    });
  }
  
  // Gerenciar a entrada e saída de IPs
  (async function manageIPs() {
    const userIP = await getUserIP();
    if (userIP) {
      // Adiciona o IP ao Firebase
      addIPToDatabase(userIP);
  
      // Atualiza a lista de IPs em tempo real
      renderIPList();
  
      // Remover o IP ao sair da página
      window.addEventListener('beforeunload', () => {
        removeIPFromDatabase(userIP);
      });
    }
  })();
  