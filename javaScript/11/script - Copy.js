// Classe Usuario
class Usuario {
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    // Método para validar o usuário (simulação)
    autenticar() {
        // Simulação de validação
        if (this.username === "admin" && this.password === "1234") {
            return true;
        } else {
            return false;
        }
    }
}

// Classe responsável pela interface de login
class LoginUI {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.messageElement = document.getElementById('message');
        this.init();
    }

    // Método para inicializar o evento de envio do formulário
    init() {
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();  // Impede o envio do formulário
            this.login();
        });
    }

    // Método para lidar com o processo de login
    login() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        const usuario = new Usuario(username, password);

        if (usuario.autenticar()) {
            this.mostrarMensagem(`Bem-vindo, ${username}!`);
        } else {
            this.mostrarMensagem('Usuário ou senha incorretos.', true);
        }
    }

    // Método para exibir mensagens ao usuário
    mostrarMensagem(mensagem, erro = false) {
        this.messageElement.textContent = mensagem;
        this.messageElement.style.color = erro ? 'red' : 'green';
        this.messageElement.classList.remove('hidden');
    }
}

// Inicializa a interface de login quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new LoginUI();
});
