
let names = ["Ana", "Pedro", "Carlos", "Beatriz", "João", "Fernanda", "Marcos"];
let originalArray = [...names];
let delay = 1000;

let currentI = 0;
let currentJ = 0;
let isRunning = false;
let arr = [...names];

function renderArray(arr, highlight = [], swap = []) {
    const container = document.getElementById("arrayContainer");
    container.innerHTML = "";
    arr.forEach((name, index) => {
        let div = document.createElement("div");
        div.classList.add("item");
        div.textContent = name;
        if (highlight.includes(index)) div.classList.add("highlight");
        if (swap.includes(index)) div.classList.add("swap");
        container.appendChild(div);
    });
}

async function bubbleSort() {
    let log = document.getElementById("log");
    log.innerHTML = "Iniciando Bubble Sort...\n";
    
    const scrollToBottom = () => {
        log.scrollTop = log.scrollHeight;
    };
    
    for (let i = 0; i < arr.length - 1; i++) {
        log.innerHTML += `\n--- Iteração Externa ${i + 1} ---\n`;
        log.innerHTML += `<div class="code-snippet">for (let i = ${i}; i < ${arr.length - 1}; i++)</div>\n`;
        
        for (let j = 0; j < arr.length - 1 - i; j++) {
            log.innerHTML += `\n>> Iteração Interna (j = ${j}):\n`;
            log.innerHTML += `<div class="code-snippet">for (let j = ${j}; j < ${arr.length - 1 - i}; j++)</div>\n`;
            
            renderArray(arr, [j, j + 1]);
            log.innerHTML += `Comparando ${arr[j]} e ${arr[j + 1]}\n`;
            log.innerHTML += `<div class="code-snippet">if (${arr[j]} > ${arr[j + 1]})</div>\n`;
            scrollToBottom();
            await new Promise(res => setTimeout(res, delay));

            if (arr[j] > arr[j + 1]) {
                log.innerHTML += `Condição verdadeira: ${arr[j]} > ${arr[j + 1]}\n`;
                log.innerHTML += `<div class="code-snippet">[arr[${j}], arr[${j + 1}]] = [${arr[j + 1]}, ${arr[j]}]</div>\n`;
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                renderArray(arr, [], [j, j + 1]);
                scrollToBottom();
                await new Promise(res => setTimeout(res, delay));
            } else {
                log.innerHTML += `Condição falsa: ${arr[j]} não é maior que ${arr[j + 1]}\n`;
                scrollToBottom();
            }
        }
        log.innerHTML += `\nFim da iteração ${i + 1}\n`;
        log.innerHTML += "----------------------------------------\n";
        scrollToBottom();
    }
    log.innerHTML += "\nBubble Sort concluído!";
    renderArray(arr);
    scrollToBottom();
}

function nextStep() {
    const log = document.getElementById("log");
    
    if (currentI >= arr.length - 1) {
        log.innerHTML += "\nBubble Sort concluído!";
        document.getElementById("nextStepBtn").disabled = true;
        isRunning = false;
        return;
    }

    const scrollToBottom = () => {
        log.scrollTop = log.scrollHeight;
    };

    if (currentJ >= arr.length - 1 - currentI) {
        currentJ = 0;
        currentI++;
        log.innerHTML += `\nFim da iteração ${currentI}\n`;
        log.innerHTML += "----------------------------------------\n";
        
        if (currentI < arr.length - 1) {
            log.innerHTML += `\n--- Iteração Externa ${currentI + 1} ---\n`;
            log.innerHTML += `<div class="code-snippet">for (let i = ${currentI}; i < ${arr.length - 1}; i++)</div>\n`;
        }
        scrollToBottom();
        return;
    }

    log.innerHTML += `\n>> Iteração Interna (j = ${currentJ}):\n`;
    log.innerHTML += `<div class="code-snippet">for (let j = ${currentJ}; j < ${arr.length - 1 - currentI}; j++)</div>\n`;
    
    renderArray(arr, [currentJ, currentJ + 1]);
    log.innerHTML += `Comparando ${arr[currentJ]} e ${arr[currentJ + 1]}\n`;
    log.innerHTML += `<div class="code-snippet">if (${arr[currentJ]} > ${arr[currentJ + 1]})</div>\n`;

    if (arr[currentJ] > arr[currentJ + 1]) {
        log.innerHTML += `Condição verdadeira: ${arr[currentJ]} > ${arr[currentJ + 1]}\n`;
        log.innerHTML += `<div class="code-snippet">[arr[${currentJ}], arr[${currentJ + 1}]] = [${arr[currentJ + 1]}, ${arr[currentJ]}]</div>\n`;
        [arr[currentJ], arr[currentJ + 1]] = [arr[currentJ + 1], arr[currentJ]];
        renderArray(arr, [], [currentJ, currentJ + 1]);
    } else {
        log.innerHTML += `Condição falsa: ${arr[currentJ]} não é maior que ${arr[currentJ + 1]}\n`;
    }
    
    currentJ++;
    scrollToBottom();
}

function startSort() {
    if (!isRunning) {
        names = [...originalArray];
        arr = [...names];
        currentI = 0;
        currentJ = 0;
        isRunning = true;
        document.getElementById("log").innerHTML = "Iniciando Bubble Sort...\n";
        document.getElementById("nextStepBtn").disabled = false;
        renderArray(arr);
    }
}

function reset() {
    names = [...originalArray];
    arr = [...names];
    currentI = 0;
    currentJ = 0;
    isRunning = false;
    document.getElementById("log").innerHTML = "";
    document.getElementById("nextStepBtn").disabled = true;
    renderArray(names);
}

renderArray(names);