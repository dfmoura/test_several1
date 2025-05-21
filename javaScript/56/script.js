document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const yearSpan = document.getElementById('year');
    yearSpan.textContent = new Date().getFullYear();
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
  
      const username = form.username.value.trim();
      const password = form.password.value;
  
      // ⚠️ Simulação de login (NÃO usar em produção)
      const userAuth = {
        username: 'admin',
        password: 'senha123'
      };
  
      if (username === userAuth.username && password === userAuth.password) {
        alert('Login autorizado. Bem-vindo à plataforma Trigger.');
        localStorage.setItem('triggerUser', JSON.stringify({ username }));
        // window.location.href = "/dashboard.html"; // exemplo de redirecionamento
      } else {
        alert('Credenciais inválidas. Tente novamente.');
      }
    });
  });
  