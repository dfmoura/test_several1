// Array inicial para busca (já ordenado)
let array = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
let searchValue = null; // Valor a ser buscado
let low = 0; // Limite inferior da busca
let high = array.length - 1; // Limite superior da busca
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
    low = 0;
    high = array.length - 1;
    found = false;
    currentStep = 0;
    displayArray();
    displayCode("// Clique em 'Próximo Passo' para começar.");
    document.getElementById('next-step').disabled = false;
    document.getElementById('step-info').textContent = "";
    document.getElementById('search-value').value = "";
}

// Função para executar um passo da busca binária
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

    if (low <= high && !found) {
        const mid = Math.floor((low + high) / 2); // Calcula o ponto médio

        // Exibe o código executado nesta etapa
        displayCode(`let mid = Math.floor((${low} + ${high}) / 2); // mid = ${mid}\n\nif (array[mid] === ${searchValue}) {\n    return mid; // Valor encontrado\n} else if (array[mid] < ${searchValue}) {\n    low = mid + 1;\n} else {\n    high = mid - 1;\n}`);

        if (array[mid] === searchValue) {
            stepInfo.textContent = `Passo ${currentStep + 1}: Valor ${searchValue} encontrado no índice ${mid}.`;
            found = true;
            document.getElementById('next-step').disabled = true;
        } else if (array[mid] < searchValue) {
            stepInfo.textContent = `Passo ${currentStep + 1}: Valor ${searchValue} é maior que array[${mid}] = ${array[mid]}. Buscando na metade superior.`;
            low = mid + 1;
        } else {
            stepInfo.textContent = `Passo ${currentStep + 1}: Valor ${searchValue} é menor que array[${mid}] = ${array[mid]}. Buscando na metade inferior.`;
            high = mid - 1;
        }
        currentStep++;
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