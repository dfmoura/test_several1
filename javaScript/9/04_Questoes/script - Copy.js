document.getElementById('inputButton').addEventListener('click', function() {
    const quantidade = parseInt(prompt("Informe a quantidade de nomes que deseja inserir:"));
    const nomes = [];

    for (let i = 0; i < quantidade; i++) {
        const nome = prompt(`Digite o ${i + 1}º nome:`);
        if (nome) {
            nomes.push(nome);
        }
    }

    // Exibir resultados
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = `
        <h2>Resultados:</h2>
        <p>A quantidade de nomes digitados: <strong>${nomes.length}</strong></p>
        <p>Nomes na ordem em que foram digitados: <strong>${nomes.join(', ')}</strong></p>
        <p>Nomes na ordem alfabética: <strong>${nomes.slice().sort().join(', ')}</strong></p>
        <p>Nomes em Maiúsculo: <strong>${nomes.map(nome => nome.toUpperCase()).join(', ')}</strong></p>
    `;
});
