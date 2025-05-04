const bancos = [
    {
      id: "bb",
      nome: "Banco do Brasil",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/dbad911c5f2ff4b4dee9a474fe190761609d938a/logos_bancos/bb.svg",
      saldoCorrente: 1_200_000.50,
      saldoInvestimento: 800_000.00,
      garantiaPercentual: 35,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "caixa",
      nome: "Caixa",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/caixa.svg",
      saldoCorrente: 4_500_000.75,
      saldoInvestimento: 1_500_000.25,
      garantiaPercentual: 20,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "itau",
      nome: "Itaú",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/logos_bancos/itau.svg",
      saldoCorrente: 9_050_000.00,
      saldoInvestimento: 5_600_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "santander",
      nome: "santander",
      logo: "https://abrasuaconta.santander.com.br/contacartao/assets/img/logo/logo-santander-red.svg",
      saldoCorrente: 3_200_000.00,
      saldoInvestimento: 3_200_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "daycoval",
      nome: "daycoval",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/main/logos_bancos/daycoval.svg",
      saldoCorrente: 1_300_000.00,
      saldoInvestimento: 900_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    },
    {
      id: "sicoob",
      nome: "sicoob",
      logo: "https://raw.githubusercontent.com/dfmoura/test_several1/main/logos_bancos/sicoob.svg",
      saldoCorrente: 100_000.00,
      saldoInvestimento: 1_000_000.00,
      garantiaPercentual: 60,
      conciliadoAte: "04/05/2025"
    }
  ];
  
  // Gerar movimentações automáticas
  function gerarExtrato(bancoId) {
    const banco = bancos.find(b => b.id === bancoId);
    const extrato = [];
    let saldo = 0;
  
    for (let i = 29; i >= 0; i--) {
      const valor = (Math.random() * 100000 - 50000).toFixed(2); // valores entre -50k e +50k
      saldo += parseFloat(valor);
      extrato.push({
        data: new Date(Date.now() - i * 86400000).toLocaleDateString("pt-BR"),
        descricao: valor >= 0 ? "Crédito" : "Débito",
        valor: parseFloat(valor),
        saldoParcial: saldo
      });
    }
  
    // Ajustar para que o saldo final bata com o saldoCorrente do banco
    const ajuste = banco.saldoCorrente - saldo;
    extrato[extrato.length - 1].valor += ajuste;
    extrato[extrato.length - 1].saldoParcial += ajuste;
  
    return extrato;
  }
  