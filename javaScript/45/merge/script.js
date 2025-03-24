// Array inicial para ordenação
let array = [5, 3, 4, 1, 2];
let stack = []; // Pilha para simular a recursão do MergeSort
let currentStep = 0; // Controla o passo atual do algoritmo

// Inicializa a pilha com o intervalo inicial (todo o array)
stack.push({ low: 0, high: array.length - 1, type: "split" });

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
    array = [5, 3, 4, 1, 2];
    stack = [{ low: 0, high: array.length - 1, type: "split" }];
    currentStep = 0;
    displayArray();
    displayCode("// Clique em 'Próximo Passo' para começar.");
    document.getElementById('next-step').disabled = false;
    document.getElementById('step-info').textContent = "";
}

// Função para mesclar duas metades ordenadas
function merge(low, mid, high) {
    const left = array.slice(low, mid + 1);
    const right = array.slice(mid + 1, high + 1);
    let i = 0, j = 0, k = low;

    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            array[k] = left[i];
            i++;
        } else {
            array[k] = right[j];
            j++;
        }
        k++;
    }

    while (i < left.length) {
        array[k] = left[i];
        i++;
        k++;
    }

    while (j < right.length) {
        array[k] = right[j];
        j++;
        k++;
    }
}

// Função para executar um passo do MergeSort
function nextStep() {
    const stepInfo = document.getElementById('step-info');

    if (stack.length > 0) {
        const { low, high, type } = stack.pop();

        if (type === "split") {
            if (low < high) {
                const mid = Math.floor((low + high) / 2);

                // Exibe o código executado nesta etapa
                displayCode(`function mergeSort(${low}, ${high}) {\n    if (${low} < ${high}) {\n        const mid = Math.floor((${low} + ${high}) / 2);\n        mergeSort(${low}, ${mid});\n        mergeSort(${mid + 1}, ${high});\n        merge(${low}, ${mid}, ${high});\n    }\n}`);

                stepInfo.textContent = `Passo ${currentStep + 1}: Dividindo o array entre os índices ${low} e ${high}.`;

                // Adiciona os novos intervalos à pilha
                stack.push({ low: low, high: high, type: "merge" });
                stack.push({ low: mid + 1, high: high, type: "split" });
                stack.push({ low: low, high: mid, type: "split" });

                currentStep++;
            } else {
                stepInfo.textContent = `Passo ${currentStep + 1}: Intervalo [${low}, ${high}] já está ordenado.`;
                currentStep++;
            }
        } else if (type === "merge") {
            const mid = Math.floor((low + high) / 2);

            // Exibe o código executado nesta etapa
            displayCode(`function merge(${low}, ${mid}, ${high}) {\n    const left = array.slice(${low}, ${mid} + 1);\n    const right = array.slice(${mid} + 1, ${high} + 1);\n    let i = 0, j = 0, k = ${low};\n\n    while (i < left.length && j < right.length) {\n        if (left[i] <= right[j]) {\n            array[k] = left[i];\n            i++;\n        } else {\n            array[k] = right[j];\n            j++;\n        }\n        k++;\n    }\n\n    while (i < left.length) {\n        array[k] = left[i];\n        i++;\n        k++;\n    }\n\n    while (j < right.length) {\n        array[k] = right[j];\n        j++;\n        k++;\n    }\n}`);

            stepInfo.textContent = `Passo ${currentStep + 1}: Mesclando o array entre os índices ${low} e ${high}.`;

            merge(low, mid, high);
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