document.getElementById('monthButton').addEventListener('click', function() {
    const monthNumber = prompt('Digite o número do mês (1-12):');
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const monthIndex = parseInt(monthNumber) - 1; // Ajuste para o índice do array

    if (monthIndex >= 0 && monthIndex < months.length) {
        document.getElementById('result').textContent = `${monthNumber.padStart(2, '0')} - ${months[monthIndex]}`;
    } else {
        document.getElementById('result').textContent = 'Número do mês inválido. Por favor, digite um número entre 1 e 12.';
    }
});
