// Função para obter o IP público do usuário usando a API externa
async function fetchUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Erro ao buscar IP:', error);
      return 'Erro ao buscar IP';
    }
  }
  
  // Função para exibir o IP na página
  async function displayIP() {
    const userIP = await fetchUserIP();
    document.getElementById('user-ip').textContent = userIP;
    saveIP(userIP);  // Envia o IP para o FaunaDB
  }
  
  // Função para salvar o IP no FaunaDB e obter os acessos simultâneos
  async function saveIP(ip) {
    const url = 'https://YOUR_NETLIFY_FUNCTION_URL';  // URL da função serverless no Netlify
    const payload = { ip: ip };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  
    const data = await response.json();
    document.getElementById('simultaneous-accesses').textContent = `Acessos simultâneos: ${data.simultaneousAccesses}`;
  }
  
  // Chama a função ao carregar a página
  displayIP();
  