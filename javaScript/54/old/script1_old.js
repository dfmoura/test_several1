document.getElementById('loginBtn').addEventListener('click', () => {
    fetch('http://localhost:3000/login', {
      method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('consultaForm').style.display = 'block';
        alert('Login realizado com sucesso!');
      } else {
        alert('Erro no login!');
      }
    })
    .catch(err => console.error('Erro:', err));
  });
  
  function consultarCliente() {
    const codparc = document.getElementById('codparc').value;
  
    fetch('http://localhost:3000/cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codparc })
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById('resultado').textContent = JSON.stringify(data, null, 2);
    })
    .catch(err => console.error('Erro:', err));
  }
  