document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const twoFactorSection = document.getElementById('twoFactorSection');
    const verifyButton = document.getElementById('verifyButton');
  
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
  
      // Simular validação de login
      if (username === 'admin' && password === '12345') {
        alert('Login válido. Por favor, insira o código 2FA.');
        loginForm.classList.add('hidden');
        twoFactorSection.classList.remove('hidden');
      } else {
        alert('Usuário ou senha inválidos.');
      }
    });
  
    verifyButton.addEventListener('click', () => {
      const twoFactorCode = document.getElementById('twoFactorCode').value;
  
      // Simular verificação do código 2FA
      if (twoFactorCode === '123456') {
        alert('Autenticação bem-sucedida! Bem-vindo.');
      } else {
        alert('Código 2FA inválido.');
      }
    });
  });
  