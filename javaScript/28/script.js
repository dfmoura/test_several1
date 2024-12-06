// Função para obter o IP do usuário
async function getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const ip = data.ip;
      
      document.getElementById('ip-address').textContent = ip;
      
      // Enviar o IP para o backend (FaunaDB)
      await registerIP(ip);
    } catch (error) {
      console.error('Erro ao obter IP:', error);
    }
  }
  
  // Função para registrar o IP no FaunaDB
  async function registerIP(ip) {
    const response = await fetch('/.netlify/functions/registerIP', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip }),
    });
    
    if (!response.ok) {
      console.error('Erro ao registrar IP no FaunaDB');
    }
  }
  
  // Chama a função para obter o IP ao carregar a página
  getUserIP();
  