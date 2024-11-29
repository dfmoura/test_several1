document.getElementById('reportForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Obter valores do formulário
    const nome = document.getElementById('nome').value;
    const data = document.getElementById('data').value;
    const relatorio = document.getElementById('relatorio').value;

    // Inserir valores no relatório gerado
    document.getElementById('reportNome').innerText = nome;
    document.getElementById('reportData').innerText = new Date(data).toLocaleDateString();
    document.getElementById('reportContent').innerText = relatorio;

    // Mostrar o relatório gerado
    document.getElementById('generatedReport').classList.remove('hidden');
});

document.getElementById('imprimir').addEventListener('click', function() {
    window.print(); // Função para imprimir o relatório
});
