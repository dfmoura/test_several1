async function registerDevice() {
    const response = await fetch('https://api64.ipify.org?format=json');
    const { ip } = await response.json();
  
    await fetch('/.netlify/functions/registerDevice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
  }
  
  async function updateOnlineDevices() {
    const response = await fetch('/.netlify/functions/getOnlineDevices');
    const devices = await response.json();
  
    const devicesList = document.getElementById('devices-list');
    devicesList.innerHTML = devices
      .map((device) => `<li>${device.ip} - ${new Date(device.timestamp).toLocaleTimeString()}</li>`)
      .join('');
  }
  
  (async function init() {
    await registerDevice();
    setInterval(updateOnlineDevices, 5000);
  })();
  