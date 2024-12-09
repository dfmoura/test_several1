// Importar e configurar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const usersRef = ref(database, "users");

// Captura o formulário e a lista
const form = document.getElementById("userForm");
const userList = document.getElementById("userList");

// Adiciona um usuário ao banco
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  if (name && email) {
    push(usersRef, { name, email });
    form.reset();
  }
});

// Atualiza a lista de usuários ao vivo
onValue(usersRef, (snapshot) => {
  userList.innerHTML = "";
  const data = snapshot.val();
  for (const key in data) {
    const li = document.createElement("li");
    li.textContent = `${data[key].name} - ${data[key].email}`;
    userList.appendChild(li);
  }
});
