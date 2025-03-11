
let names = ["Ana", "Pedro", "Carlos", "Beatriz", "João", "Fernanda", "Marcos"];
let originalArray = [...names];
let delay = 1000;

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
    let arr = [...names];
    let log = document.getElementById("log");
    log.innerHTML = "Iniciando Bubble Sort...\n";
    
    for (let i = 0; i < arr.length - 1; i++) {
        log.innerHTML += `\n--- Iteração Externa ${i + 1} ---\n`;
        log.innerHTML += `<div class="code-snippet">for (let i = ${i}; i < ${arr.length - 1}; i++)</div>\n`;
        
        for (let j = 0; j < arr.length - 1 - i; j++) {
            log.innerHTML += `\n>> Iteração Interna (j = ${j}):\n`;
            log.innerHTML += `<div class="code-snippet">for (let j = ${j}; j < ${arr.length - 1 - i}; j++)</div>\n`;
            
            renderArray(arr, [j, j + 1]);
            log.innerHTML += `Comparando ${arr[j]} e ${arr[j + 1]}\n`;
            log.innerHTML += `<div class="code-snippet">if (${arr[j]} > ${arr[j + 1]})</div>\n`;
            await new Promise(res => setTimeout(res, delay));

            if (arr[j] > arr[j + 1]) {
                log.innerHTML += `Condição verdadeira: ${arr[j]} > ${arr[j + 1]}\n`;
                log.innerHTML += `<div class="code-snippet">[arr[${j}], arr[${j + 1}]] = [${arr[j + 1]}, ${arr[j]}]</div>\n`;
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                renderArray(arr, [], [j, j + 1]);
                await new Promise(res => setTimeout(res, delay));
            } else {
                log.innerHTML += `Condição falsa: ${arr[j]} não é maior que ${arr[j + 1]}\n`;
            }
        }
        log.innerHTML += `\nFim da iteração ${i + 1}\n`;
        log.innerHTML += "----------------------------------------\n";
    }
    log.innerHTML += "\nBubble Sort concluído!";
    renderArray(arr);
}

function startSort() {
    names = [...originalArray];
    renderArray(names);
    bubbleSort();
}

function reset() {
    names = [...originalArray];
    document.getElementById("log").innerHTML = "";
    renderArray(names);
}

renderArray(names);
