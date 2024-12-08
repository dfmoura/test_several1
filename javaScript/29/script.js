const ipListElement = document.getElementById('ipList');

// Função para obter o IP do visitante
async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Erro ao obter IP:', error);
    return null;
  }
}

// Função para adicionar o IP à lista
function addIPToList(ip) {
  const li = document.createElement('li');
  li.classList.add('ip-item');
  li.textContent = ip;
  ipListElement.appendChild(li);
}

// Função para remover o IP da lista
function removeIPFromList(ip) {
  const items = ipListElement.getElementsByClassName('ip-item');
  for (const item of items) {
    if (item.textContent === ip) {
      ipListElement.removeChild(item);
      break;
    }
  }
}

// Função para gerenciar a entrada e saída de IPs
(async function manageIPs() {
  const userIP = await getUserIP();
  if (userIP) {
    addIPToList(userIP);

    // Ao sair da página, remove o IP (usando o evento 'beforeunload')
    window.addEventListener('beforeunload', () => {
      removeIPFromList(userIP);
    });
  }
})();
