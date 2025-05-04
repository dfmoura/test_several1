function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  
  const params = new URLSearchParams(window.location.search);
  const bancoId = params.get("banco");
  const banco = bancos.find(b => b.id === bancoId);
  const extrato = gerarExtrato(bancoId);
  
  document.getElementById("bank-title").textContent = `Extrato de ${banco.nome}`;
  const container = document.getElementById("extrato");
  
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Valor</th>
        <th>Saldo Parcial</th>
      </tr>
    </thead>
    <tbody>
      ${extrato.map(m => `
        <tr>
          <td>${m.data}</td>
          <td>${m.descricao}</td>
          <td>${formatCurrency(m.valor)}</td>
          <td>${formatCurrency(m.saldoParcial)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  container.appendChild(table);
  