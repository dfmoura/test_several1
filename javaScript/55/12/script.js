const bancos = [
    {
      id: "bb",
      nome: "Banco do Brasil",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/dbad911c5f2ff4b4dee9a474fe190761609d938a/logos_bancos/bb.svg",
      agencia: "1234-5",
      conta: "00123456-7",
      saldoCorrente: 13_000.50,
      saldoInvestimento: 800_000.00,
      garantiaPercentual: 35,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "itau",
      nome: "Itaú",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/itau.svg",
      agencia: "9876-1",
      conta: "00098765-4",
      saldoCorrente: 25_000.00,
      saldoInvestimento: 5_600_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "sicoob",
      nome: "sicoob",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/main/logos_bancos/sicoob.svg",
      agencia: "1414-8",
      conta: "9991541-7",      
      saldoCorrente: 50_000.00,
      saldoInvestimento: 5_600_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "daycoval",
      nome: "daycoval",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/main/logos_bancos/daycoval.svg",
      agencia: "1313-2",
      conta: "474114-8",
      saldoCorrente: 10_000.00,
      saldoInvestimento: 2_000_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "caixa",
      nome: "caixa",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/main/logos_bancos/caixa.svg",
      agencia: "39844-1",
      conta: "12154-2",
      saldoCorrente: 18_000.00,
      saldoInvestimento: 3_500_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "santander",
      nome: "santander",
      logo: "https://abrasuaconta.santander.com.br/contacartao/assets/img/logo/logo-santander-red.svg",
      agencia: "2525-9",
      conta: "0815411423-0",
      saldoCorrente: 30_000.00,
      saldoInvestimento: 7_300_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "jpmorgan",
      nome: "jpmorgan",
      logo: "https://cdn.worldvectorlogo.com/logos/jp-morgan.svg",
      agencia: "8848-1",
      conta: "5001325-9",
      saldoCorrente: 35_000.00,
      saldoInvestimento: 2_600_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "jpmorgan",
      nome: "jpmorgan",
      logo: "https://cdn.worldvectorlogo.com/logos/jp-morgan.svg",
      agencia: "8848-1",
      conta: "5001325-9",
      saldoCorrente: 35_000.00,
      saldoInvestimento: 2_600_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "societe-generale",
      nome: "societe-generale",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/SocieteGenerale.svg",
      agencia: "3199-2",
      conta: "9985251-9",
      saldoCorrente: 12_000.00,
      saldoInvestimento: 700_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    }
  ];
  
  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  
  function renderDashboard() {
    const view = document.getElementById("view-dashboard");
    view.innerHTML = '<div id="banks"></div>';
    const container = document.getElementById("banks");
  
    bancos.forEach(banco => {
      const total = banco.saldoCorrente + banco.saldoInvestimento;
      const card = document.createElement("div");
      card.className = "bank-card";
      card.innerHTML = `
        <div class="bank-header">
          <img src="${banco.logo}" alt="${banco.nome}" class="bank-logo" />
          <div>
            <div class="bank-name">${banco.nome}</div>
            <div class="bank-info">Agência: ${banco.agencia} | Conta: ${banco.conta}</div>
          </div>
        </div>
        <div class="saldo-info">
          <p><strong>Saldo Bancário:</strong> ${formatCurrency(total)}</p>
          <p>Conta Corrente: 
            <span class="saldo-link" onclick="renderExtrato('${banco.id}')">
              ${formatCurrency(banco.saldoCorrente)}
            </span>
          </p>
          <p>Conta Investimento: ${formatCurrency(banco.saldoInvestimento)}</p>
          <p class="garantia">${banco.garantiaPercentual}% do investimento está em garantia</p>
        </div>
        <div class="conciliado">Conciliado até: <strong>${banco.conciliadoAte}</strong></div>
      `;
      container.appendChild(card);
    });
  }
  
  function gerarMovimentacoes(valorFinal) {
    let saldo = 0;
    const tipos = ["Pix", "TED", "DOC", "Transferência", "Boleto", "Depósito", "Pagamento", "Cobrança"];
    const movimentos = [];
  
    for (let i = 29; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      const tipo = Math.random() > 0.4 ? "Crédito" : "Débito";
      const valor = +(Math.random() * 50000).toFixed(2);
      const descricao = tipos[Math.floor(Math.random() * tipos.length)];
      saldo += tipo === "Crédito" ? valor : -valor;
      movimentos.push({
        data: data.toLocaleDateString(),
        tipo,
        descricao,
        valor,
        saldo: saldo
      });
    }
  
    // Ajustar o último movimento para fazer o saldo bater com o final
    const diff = valorFinal - saldo;
    movimentos.push({
      data: new Date().toLocaleDateString(),
      tipo: diff >= 0 ? "Crédito" : "Débito",
      descricao: "Ajuste Final",
      valor: Math.abs(diff),
      saldo: valorFinal
    });
  
    return movimentos;
  }
  
  function renderExtrato(bancoId) {
    const banco = bancos.find(b => b.id === bancoId);
    const view = document.getElementById("view-extrato");
    const dashboard = document.getElementById("view-dashboard");
    dashboard.style.display = "none";
    view.style.display = "block";
  
    const movimentos = gerarMovimentacoes(banco.saldoCorrente);
  
    view.innerHTML = `
      <h1>Extrato: ${banco.nome} - Conta Corrente</h1>
      <p>Agência: ${banco.agencia} | Conta: ${banco.conta}</p>
      <div class="extrato-container">
        <table class="extrato-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Saldo após</th>
            </tr>
          </thead>
          <tbody>
            ${movimentos.map(mov => `
              <tr>
                <td>${mov.data}</td>
                <td class="${mov.tipo.toLowerCase()}">${mov.tipo}</td>
                <td>${mov.descricao}</td>
                <td>${formatCurrency(mov.valor)}</td>
                <td>${formatCurrency(mov.saldo)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="voltar" onclick="voltar()">← Voltar para Dashboard</div>
      </div>
    `;
  }
  
  function voltar() {
    document.getElementById("view-extrato").style.display = "none";
    document.getElementById("view-dashboard").style.display = "block";
  }
  
  renderDashboard();
  