function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  
  function renderBanks() {
    const container = document.getElementById("banks");
    bancos.forEach(banco => {
      const total = banco.saldoCorrente + banco.saldoInvestimento;
      const card = document.createElement("div");
      card.className = "bank-card";
      card.innerHTML = `
        <div class="bank-header">
          <img src="${banco.logo}" alt="${banco.nome}" class="bank-logo" />
          <span class="bank-name">${banco.nome}</span>
        </div>
        <div class="saldo-info">
          <p><strong>Saldo Bancário:</strong> ${formatCurrency(total)}</p>
          <p>
            Conta Corrente:
            <a href="extrato.html?banco=${banco.id}">${formatCurrency(banco.saldoCorrente)}</a>
          </p>
          <p>Conta Investimento: ${formatCurrency(banco.saldoInvestimento)}</p>
          <p class="garantia">${banco.garantiaPercentual}% do investimento está em garantia</p>
        </div>
        <div class="conciliado">Conciliado até: <strong>${banco.conciliadoAte}</strong></div>
      `;
      container.appendChild(card);
    });
  }
  
  renderBanks();
  