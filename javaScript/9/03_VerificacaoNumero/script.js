function solicitarNumero() {
    let numero;

    // Solicita um número ao usuário
    do {
        numero = parseInt(prompt("Digite um número (não pode ser menor que 0):"));
        // Verifica se o número é menor que 0
        if (numero < 0) {
            alert("Por favor, digite um número maior ou igual a 0.");
        }
    } while (numero < 0);

    // Mostra os resultados
    mostrarResultados(numero);
}

function mostrarResultados(numero) {
    let pares = [];
    let soma = 0;

    // Encontra números pares
    for (let i = 2; i <= numero; i += 2) {
        pares.push(i);
        soma += i;
    }

    // Exibe os resultados
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <p>Você digitou o número <strong>${numero}</strong>.</p>
        <p>Números pares: <strong>${pares.join(', ')}</strong>.</p>
        <p>Quantidade de pares: <strong>${pares.length} números.</strong></p>
        <p>Soma dos pares: <strong>${soma}.</strong></p>
    `;
}

// Chama a função ao carregar o script
solicitarNumero();
