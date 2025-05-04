const urlParams = new URLSearchParams(window.location.search);
const bancoId = urlParams.get("banco") || "desconhecido";

// Copiamos os dados dos bancos para o extrato também
const bancos = {
  bb: 1_200_000.50,
  caixa: 4_500_000.75,
  itau: 9_050_000.00,
  daycoval: 2_300_000.00,
  sicoob: 3_500_000.00
};

const saldoEsperado = bancos[bancoId];

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarExtratoQueBateComSaldo(total) {
  const tipos = ["TED Recebida", "Pix Enviado", "Pagamento", "DOC Recebido", "Transferência", "Compra Cartão", "Depósito"];
  const extrato = [];
  let acumulado = 0;

  for (let i = 0; i < 49; i++) {
    const valor = Math.round(Math.random() * 40000) + 1000;
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    const isCredito = Math.random() > 0.5;
    const valorFinal = isCredito ? valor : -valor;
    acumulado += valorFinal;

    const data = new Date();
    data.setDate(data.getDate() - Math.floor(Math.random() * 30));
    extrato.push({
      data: data.toLocaleDateString("pt-BR"),
      descricao: tipo,
      valor: Math.abs(valor),
      tipo: isCredito ? "credito" : "debito"
    });
  }

  // Ajuste final para bater com o saldo
  const ajuste = Math.round((total - acumulado) * 100) / 100;
  extrato.push({
    data: new Date().toLocaleDateString("pt-BR"),
    descricao: "Ajuste de Saldo",
    valor: Math.abs(ajuste),
    tipo: ajuste >= 0 ? "credito" : "debito"
  });

  return extrato.sort((a, b) => {
    const [d1, m1, y1] = a.data.split("/");
    const [d2, m2, y2] = b.data.split("/");
    return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
  });
}

function renderExtrato() {
  const container = document.getElementById("extrato-container");

  if (!saldoEsperado) {
    container.innerHTML = "<p>Banco não encontrado.</p>";
    return;
  }

  const extrato = gerarExtratoQueBateComSaldo(saldoEsperado);

  extrato.forEach(entry => {
    const linha = document.createElement("div");
    linha.className = "extrato-card";
    linha.innerHTML = `
      <div>
        <div class="extrato-data">${entry.data}</div>
        <div class="extrato-descricao">${entry.descricao}</div>
      </div>
      <div class="extrato-valor ${entry.tipo}">${entry.tipo === "credito" ? "+" : "-"} ${formatCurrency(entry.valor)}</div>
    `;
    container.appendChild(linha);
  });
}

renderExtrato();
