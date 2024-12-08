const apiUrl = '/.netlify/functions/accesses';

async function getAccesses() {
  const response = await fetch(apiUrl);
  const accesses = await response.json();
  const list = document.getElementById('access-list');
  list.innerHTML = '';
  accesses.forEach(({ ip, device }) => {
    const li = document.createElement('li');
    li.textContent = `IP: ${ip}, Device: ${device}`;
    list.appendChild(li);
  });
}

// Detectar IP e aparelho
function getDevice() {
  const userAgent = navigator.userAgent;
  if (/mobile/i.test(userAgent)) return 'Mobile';
  if (/tablet/i.test(userAgent)) return 'Tablet';
  return 'Desktop';
}

async function registerAccess() {
  const ipResponse = await fetch('https://api.ipify.org?format=json');
  const { ip } = await ipResponse.json();
  const device = getDevice();

  await fetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({ ip, device }),
    headers: { 'Content-Type': 'application/json' },
  });

  getAccesses();
}

// Remover acesso ao sair da página
window.addEventListener('beforeunload', async () => {
  const ipResponse = await fetch('https://api.ipify.org?format=json');
  const { ip } = await ipResponse.json();
  await fetch(apiUrl, {
    method: 'DELETE',
    body: JSON.stringify({ ip }),
    headers: { 'Content-Type': 'application/json' },
  });
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  registerAccess();
  getAccesses();
});
