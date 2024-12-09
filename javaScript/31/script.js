
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Configuração do Firebase
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
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  
  // Referência para os dados
  const dbRef = ref(database, 'cadastros');
  
  // Formulário e elementos HTML
  const form = document.getElementById('data-form');
  const dataList = document.getElementById('data-list');
  
  // Função para enviar dados ao Firebase
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value;
    const email = form.email.value;
  
    // Enviar para o Firebase
    push(dbRef, { name, email });
  
    // Limpa o formulário
    form.reset();
  });
  
  // Função para listar os dados do Firebase
  onValue(dbRef, (snapshot) => {
    dataList.innerHTML = '';
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const li = document.createElement('li');
      li.textContent = `${data.name} (${data.email})`;
      dataList.appendChild(li);
    });
  });
  