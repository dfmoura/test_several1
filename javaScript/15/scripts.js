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
