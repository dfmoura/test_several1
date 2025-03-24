// Array inicial para busca
let array = [10, 20, 30, 40, 50];
let searchValue = null; // Valor a ser buscado
let currentIndex = 0; // Índice atual da busca
let found = false; // Indica se o valor foi encontrado
let currentStep = 0; // Controla o passo atual do algoritmo

// Função para exibir o array na tela
function displayArray() {
    const arrayDisplay = document.getElementById('array-display');
    arrayDisplay.textContent = `Array: [${array.join(', ')}]`;
}

// Função para exibir o código executado na etapa atual
function displayCode(code) {
    const codeDisplay = document.getElementById('code-display');
    codeDisplay.textContent = code;
}

// Função para reiniciar a busca
function reset() {
    searchValue = null;
    currentIndex = 0;
    found = false;
    currentStep = 0;
    displayArray();
    displayCode("// Clique em 'Próximo Passo' para começar.");
    document.getElementById('next-step').disabled = false;
    document.getElementById('step-info').textContent = "";
    document.getElementById('search-value').value = "";
}

// Função para executar um passo da busca sequencial
function nextStep() {
    const stepInfo = document.getElementById('step-info');
    const searchInput = document.getElementById('search-value');

    // Verifica se o valor de busca foi definido
    if (!searchValue) {
        const value = parseInt(searchInput.value);
        if (isNaN(value)) {
            stepInfo.textContent = "Por favor, insira um valor válido para buscar.";
            return;
        }
        searchValue = value;
    }

    if (currentIndex < array.length) {
        // Exibe o código executado nesta etapa
        displayCode(`if (array[${currentIndex}] === ${searchValue}) {\n    return ${currentIndex}; // Valor encontrado\n}`);

        if (array[currentIndex] === searchValue) {
            stepInfo.textContent = `Passo ${currentStep + 1}: Valor ${searchValue} encontrado no índice ${currentIndex}.`;
            found = true;
            document.getElementById('next-step').disabled = true;
        } else {
            stepInfo.textContent = `Passo ${currentStep + 1}: Valor ${searchValue} não encontrado no índice ${currentIndex}.`;
            currentIndex++;
            currentStep++;
        }
    } else {
        if (!found) {
            stepInfo.textContent = `Passo ${currentStep + 1}: Valor ${searchValue} não encontrado no array.`;
            document.getElementById('next-step').disabled = true;
        }
    }

    displayArray();
}

// Inicializa a exibição do array e código
reset();

// Adiciona o evento de clique ao botão "Próximo Passo"
document.getElementById('next-step').addEventListener('click', nextStep);

// Adiciona o evento de clique ao botão "Reiniciar"
document.getElementById('reset').addEventListener('click', reset);