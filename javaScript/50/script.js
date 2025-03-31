// Função para atribuir o endereço IP
function assignIp() {
    const ipType = document.getElementById('ipType').value;
    const manualIpSection = document.getElementById('manualIpSection');
    const manualIp = document.getElementById('manualIp').value;
    const assignedIpDisplay = document.getElementById('assignedIp');

    // Atualiza a rede de computadores com os IPs
    const computer1IpDisplay = document.getElementById('ip1');
    const computer2IpDisplay = document.getElementById('ip2');

    if (ipType === 'manual') {
        // Se for manual, verifica se o IP foi inserido corretamente
        if (manualIp) {
            computer1IpDisplay.textContent = `IP: ${manualIp}`;
            computer2IpDisplay.textContent = `IP: ${manualIp}`;
            assignedIpDisplay.textContent = `IP Atribuído: ${manualIp}`;
        } else {
            assignedIpDisplay.textContent = 'Por favor, insira um endereço IP válido!';
        }
    } else if (ipType === 'automatic') {
        // Se for automático, gera um IP dinâmico
        const randomIp1 = generateRandomIp();
        const randomIp2 = generateRandomIp();

        computer1IpDisplay.textContent = `IP: ${randomIp1}`;
        computer2IpDisplay.textContent = `IP: ${randomIp2}`;
        assignedIpDisplay.textContent = `IP Atribuído: ${randomIp1} e ${randomIp2}`;
    }
}

// Função para gerar um IP dinâmico aleatório
function generateRandomIp() {
    const randomIp = `192.168.1.${Math.floor(Math.random() * 100) + 1}`;
    return randomIp;
}

// Mostrar ou esconder a seção de IP manual dependendo da escolha
document.getElementById('ipType').addEventListener('change', function() {
    const ipType = this.value;
    const manualIpSection = document.getElementById('manualIpSection');
    
    if (ipType === 'manual') {
        manualIpSection.style.display = 'block';
    } else {
        manualIpSection.style.display = 'none';
    }
});
