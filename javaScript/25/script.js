/* nosso código = comecar*/

const matrixElement = document.getElementById('matrix');
const columns = Math.floor(window.innerWidth / 20); //largura automática do tamanho da tela div. pelo tamanho fixo de cada coluna
const rows = Math.floor(window.innerHeight / 20); //altura automática do tamanho da tela div. pelo tamanho fixo de cada coluna

const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+-=[]{}|;:',.<>?/";

// Função para gerar as gotas de caracteres
function createMatrix() {
    matrixElement.innerHTML = '';
    for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
            let charElement = document.createElement('span');
            charElement.textContent = characters[Math.floor(Math.random() * characters.length)];
            charElement.style.position = 'absolute';
            charElement.style.left = `${i * 20}px`;
            charElement.style.top = `${j * 20}px`;
            charElement.style.color = '#0f0';
            charElement.classList.add('drop');
            charElement.style.setProperty('--i', Math.random() * 10);

            matrixElement.appendChild(charElement);
        }
    }
}

createMatrix();
