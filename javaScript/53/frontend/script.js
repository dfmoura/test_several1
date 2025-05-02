function fazerLogin() {
    fetch('http://localhost:3000/login', {
      method: 'POST'
    })
    .then(response => response.text())
    .then(data => {
      document.getElementById('resposta').textContent = data;
    })
    .catch(error => console.error('Erro:', error));
  }
  