const bancos = [
    {
      nome: "Banco do Brasil",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/dbad911c5f2ff4b4dee9a474fe190761609d938a/logos_bancos/bb.svg",
      saldoCorrente: 1_200_000.50,
      saldoInvestimento: 800_000.00,
      garantiaPercentual: 35,
      conciliadoAte: "04/05/2025",
      codigo: "bb"
    },
    {
      nome: "Caixa",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/caixa.svg",
      saldoCorrente: 4_500_000.75,
      saldoInvestimento: 1_500_000.25,
      garantiaPercentual: 20,
      conciliadoAte: "04/05/2025",
      codigo: "caixa"
    },
    {
      nome: "Itaú",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/itau.svg",
      saldoCorrente: 9_050_000.00,
      saldoInvestimento: 5_600_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025",
      codigo: "itau"
    },
    {
      nome: "Daycoval",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/daycoval.svg",
      saldoCorrente: 2_300_000.00,
      saldoInvestimento: 1_700_000.00,
      garantiaPercentual: 15,
      conciliadoAte: "04/05/2025",
      codigo: "daycoval"
    },
    {
      nome: "Sicoob",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/sicoob.svg",
      saldoCorrente: 3_500_000.00,
      saldoInvestimento: 4_000_000.00,
      garantiaPercentual: 50,
      conciliadoAte: "04/05/2025",
      codigo: "sicoob"
    },
    {
      nome: "Santander",
      logo: "https://abrasuaconta.santander.com.br/contacartao/assets/img/logo/logo-santander-red.svg",
      saldoCorrente: 3_500_000.00,
      saldoInvestimento: 4_000_000.00,
      garantiaPercentual: 50,
      conciliadoAte: "04/05/2025",
      codigo: "santander"
    }
  ];
  
  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  
  function renderBanks() {
    const container = document.getElementById("banks");
    bancos.forEach(banco => {
      const total = banco.saldoCorrente + banco.saldoInvestimento;
      const garantia = banco.garantiaPercentual;
      const card = document.createElement("div");
      card.className = "bank-card";
      card.innerHTML = `
        <div class="bank-header">
          <img src="${banco.logo}" alt="${banco.nome}" class="bank-logo" />
          <span class="bank-name">${banco.nome}</span>
        </div>
        <div class="saldo-info">
          <p><strong>Saldo Bancário:</strong> ${formatCurrency(total)}</p>
          <p>Conta Corrente: <a href="extrato.html?banco=${banco.codigo}">${formatCurrency(banco.saldoCorrente)}</a></p>
          <p>Conta Investimento: ${formatCurrency(banco.saldoInvestimento)}</p>
          <p class="garantia">${garantia}% do investimento está em garantia</p>
        </div>
        <div class="conciliado">Conciliado até: <strong>${banco.conciliadoAte}</strong></div>
      `;
      container.appendChild(card);
    });
  }
  
  renderBanks();
  