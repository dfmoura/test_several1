// Array inicial para ordenação
let array = [5, 3, 4, 1, 2,87,35,12,45,67,23,78,90,34,56,78,23,45,67,89];
let stack = []; // Pilha para simular a recursão do QuickSort
let currentStep = 0; // Controla o passo atual do algoritmo

// Inicializa a pilha com o intervalo inicial (todo o array)
stack.push({ low: 0, high: array.length - 1 });

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
    array = [5, 3, 4, 1, 2,14,23,45,67,89,12,34,56,78,90,23,45,67,78,23];
    stack = [{ low: 0, high: array.length - 1 }];
    currentStep = 0;
    displayArray();
    displayCode("// Clique em 'Próximo Passo' para começar.");
    document.getElementById('next-step').disabled = false;
    document.getElementById('step-info').textContent = "";
}

// Função para particionar o array
function partition(low, high) {
    const pivot = array[high]; // Escolhe o último elemento como pivô
    let i = low - 1; // Índice do menor elemento

    for (let j = low; j < high; j++) {
        if (array[j] < pivot) {
            i++;
            [array[i], array[j]] = [array[j], array[i]]; // Troca os elementos
        }
    }
    [array[i + 1], array[high]] = [array[high], array[i + 1]]; // Coloca o pivô na posição correta
    return i + 1; // Retorna o índice do pivô
}

// Função para executar um passo do QuickSort
function nextStep() {
    const stepInfo = document.getElementById('step-info');

    if (stack.length > 0) {
        const { low, high } = stack.pop(); // Pega o intervalo atual da pilha

        if (low < high) {
            const pivotIndex = partition(low, high);

            // Exibe o código executado nesta etapa
            displayCode(`function partition(${low}, ${high}) {\n    const pivot = array[${high}];\n    let i = ${low} - 1;\n\n    for (let j = ${low}; j < ${high}; j++) {\n        if (array[j] < pivot) {\n            i++;\n            [array[i], array[j]] = [array[j], array[i]];\n        }\n    }\n    [array[i + 1], array[${high}]] = [array[${high}], array[i + 1]];\n    return i + 1;\n}`);

            stepInfo.textContent = `Passo ${currentStep + 1}: Particionando o array entre os índices ${low} e ${high}. Pivô = ${array[pivotIndex]}.`;

            // Adiciona os novos intervalos à pilha
            stack.push({ low: pivotIndex + 1, high: high }); // Intervalo à direita do pivô
            stack.push({ low: low, high: pivotIndex - 1 }); // Intervalo à esquerda do pivô

            currentStep++;
        } else {
            stepInfo.textContent = `Passo ${currentStep + 1}: Intervalo [${low}, ${high}] já está ordenado.`;
            currentStep++;
        }
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