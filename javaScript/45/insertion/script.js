// Array inicial para ordenação
let array = [5, 3, 4, 1, 2,99, 88, 77, 66, 55, 44, 33, 22, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
let currentStep = 0; // Controla o passo atual do algoritmo
let i = 1; // Índice para percorrer o array

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

// Função para reiniciar o algoritmo
function reset() {
    array = [5, 3, 4, 1, 2,99, 88, 77, 66, 55, 44, 33, 22, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    currentStep = 0;
    i = 1;
    displayArray();
    displayCode("// Clique em 'Próximo Passo' para começar.");
    document.getElementById('next-step').disabled = false;
    document.getElementById('step-info').textContent = "";
}

// Função para executar um passo do Insertion Sort
function nextStep() {
    const stepInfo = document.getElementById('step-info');

    if (i < array.length) {
        let key = array[i];
        let j = i - 1;

        // Exibe o código executado nesta etapa
        displayCode(`let key = array[${i}]; // key = ${key}\nlet j = ${i} - 1; // j = ${j}\n\nwhile (j >= 0 && array[j] > key) {\n    array[j + 1] = array[j];\n    j--;\n}\narray[j + 1] = key;`);

        // Move os elementos maiores que a chave para a direita
        while (j >= 0 && array[j] > key) {
            array[j + 1] = array[j];
            j--;
        }
        array[j + 1] = key;

        stepInfo.textContent = `Passo ${currentStep + 1}: Inserindo ${key} na posição correta.`;
        currentStep++;
        i++;
    } else {
        stepInfo.textContent = "Ordenação concluída!";
        document.getElementById('next-step').disabled = true;
    }

    displayArray();
}

// Inicializa a exibição do array e código
reset();

// Adiciona o evento de clique ao botão "Próximo Passo"
document.getElementById('next-step').addEventListener('click', nextStep);

// Adiciona o evento de clique ao botão "Reiniciar"
document.getElementById('reset').addEventListener('click', reset);