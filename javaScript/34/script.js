// Configuração Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-database.js";

// Suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDG4mAk2S9fYtIvimkUS-EhmqPdBP96TAQ",
    authDomain: "dadoscomeco.firebaseapp.com",
    projectId: "dadoscomeco",
    storageBucket: "dadoscomeco.firebasestorage.app",
    messagingSenderId: "561528164301",
    appId: "1:561528164301:web:417ddc66b688ff8ee8fe84",
    databaseURL: "https://dadoscomeco-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Alternar entre Login e Cadastro
document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

// Login
document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            alert('Login realizado com sucesso!');
        })
        .catch(error => {
            alert(`Erro: ${error.message}`);
        });
});

// Cadastro
document.getElementById('register-btn').addEventListener('click', () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            // Salvar informações do usuário no banco de dados
            const user = userCredential.user;
            set(ref(db, 'users/' + user.uid), {
                email: user.email
            });
            alert('Usuário cadastrado com sucesso!');
        })
        .catch(error => {
            alert(`Erro: ${error.message}`);
        });
});
