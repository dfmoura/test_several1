// Dados de exemplo
const operacoes = [
  { idiproc: 101, dtfab: '2024-06-01', codprodpa: 'P001 - Produto A', qtdproduzir: 1000, nrolote: 'L001', situacao: 'Pendente' },
  { idiproc: 102, dtfab: '2024-06-02', codprodpa: 'P002 - Produto B', qtdproduzir: 500, nrolote: 'L002', situacao: 'Finalizada' },
  { idiproc: 103, dtfab: '2024-06-03', codprodpa: 'P003 - Produto C', qtdproduzir: 750, nrolote: 'L003', situacao: 'Cancelada' },
  { idiproc: 104, dtfab: '2024-06-04', codprodpa: 'P004 - Produto D', qtdproduzir: 1200, nrolote: 'L004', situacao: 'Pendente' },
  { idiproc: 105, dtfab: '2024-06-05', codprodpa: 'P005 - Produto E', qtdproduzir: 900, nrolote: 'L005', situacao: 'Finalizada' },
  { idiproc: 106, dtfab: '2024-06-06', codprodpa: 'P006 - Produto F', qtdproduzir: 600, nrolote: 'L006', situacao: 'Pendente' },
  { idiproc: 107, dtfab: '2024-06-07', codprodpa: 'P007 - Produto G', qtdproduzir: 300, nrolote: 'L007', situacao: 'Cancelada' },
  { idiproc: 108, dtfab: '2024-06-08', codprodpa: 'P008 - Produto H', qtdproduzir: 1100, nrolote: 'L008', situacao: 'Finalizada' },
];

function renderTable(status) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  operacoes.filter(op => op.situacao === status).forEach(op => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${op.idiproc}</td>
      <td>${op.dtfab}</td>
      <td>${op.codprodpa}</td>
      <td>${op.qtdproduzir}</td>
      <td>${op.nrolote}</td>
    `;
    tr.addEventListener('click', () => {
      window.location.href = `detalhe.html?idiproc=${op.idiproc}`;
    });
    tbody.appendChild(tr);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    renderTable(this.dataset.status);
  });
});

// --- Lógica da tela de detalhe ---
if (window.location.pathname.includes('detalhe.html')) {
  // Utilitário para obter parâmetro da URL
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  // Mock: buscar operação pelo idiproc
  const idiproc = parseInt(getParam('idiproc'));
  const operacao = operacoes.find(op => op.idiproc === idiproc) || operacoes[0];

  // Mock: dados de apontamentos
  let apontamentos = [
    { nunota: 2001, codusu: 'USR1', dhapontamento: '2024-06-10 08:00', situacao: 'Pendente' },
    { nunota: 2002, codusu: 'USR2', dhapontamento: '2024-06-10 09:00', situacao: 'Confirmado' },
    { nunota: 2003, codusu: 'USR1', dhapontamento: '2024-06-10 10:00', situacao: 'Pendente' },
  ];

  // Mock: dados de execução
  let execucao = [];

  // Estado dos botões
  let estadoAcao = 'iniciar'; // 'iniciar' | 'parar' | 'continuar'
  let acaoIniciada = false;

  // Render resumo
  function renderResumo() {
    document.getElementById('resumo').innerHTML = `
      <div class="resumo-box">
        <strong>ID:</strong> ${operacao.idiproc} &nbsp;|
        <strong>Data:</strong> ${operacao.dtfab} &nbsp;|
        <strong>Produto:</strong> ${operacao.codprodpa} &nbsp;|
        <strong>Qtd:</strong> ${operacao.qtdproduzir} &nbsp;|
        <strong>Lote:</strong> ${operacao.nrolote}
      </div>
    `;
  }

  // Render apontamentos
  function renderApontamentos() {
    const tbody = document.getElementById('apontamentos-body');
    tbody.innerHTML = '';
    apontamentos.forEach((ap, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ap.nunota}</td>
        <td>${ap.codusu}</td>
        <td>${ap.dhapontamento}</td>
        <td>${ap.situacao}</td>
        <td>
          ${ap.situacao === 'Pendente' ? `<button class="btn-del" data-idx="${idx}">Deletar</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
    // Deleção
    tbody.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.idx);
        apontamentos.splice(idx, 1);
        renderApontamentos();
      });
    });
  }

  // Render execução
  function renderExecucao() {
    const tbody = document.getElementById('execucao-body');
    tbody.innerHTML = '';
    execucao.forEach(log => {
      tbody.innerHTML += `
        <tr>
          <td>${log.dhinicio}</td>
          <td>${log.dhfinal || ''}</td>
          <td>${log.tipo}</td>
          <td>${log.codusu}</td>
          <td>${log.motivo || ''}</td>
        </tr>
      `;
    });
  }

  // Alternância dos botões
  const btnAcao = document.getElementById('btn-acao');
  const btnFinalizar = document.getElementById('btn-finalizar');
  let usuarioAtual = 'USR1';

  function atualizarBotoes() {
    if (estadoAcao === 'iniciar') {
      btnAcao.textContent = 'Iniciar';
      btnFinalizar.disabled = true;
    } else if (estadoAcao === 'parar') {
      btnAcao.textContent = 'Parar';
      btnFinalizar.disabled = false;
    } else if (estadoAcao === 'continuar') {
      btnAcao.textContent = 'Continuar';
      btnFinalizar.disabled = true;
    }
  }

  btnAcao.addEventListener('click', () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    if (estadoAcao === 'iniciar') {
      execucao.push({ dhinicio: now, dhfinal: '', tipo: 'normal', codusu: usuarioAtual, motivo: '' });
      estadoAcao = 'parar';
      acaoIniciada = true;
    } else if (estadoAcao === 'parar') {
      if (execucao.length > 0) execucao[execucao.length - 1].dhfinal = now;
      execucao.push({ dhinicio: now, dhfinal: '', tipo: 'parada', codusu: usuarioAtual, motivo: '' });
      estadoAcao = 'continuar';
    } else if (estadoAcao === 'continuar') {
      if (execucao.length > 0) execucao[execucao.length - 1].dhfinal = now;
      execucao.push({ dhinicio: now, dhfinal: '', tipo: 'normal', codusu: usuarioAtual, motivo: '' });
      estadoAcao = 'parar';
    }
    atualizarBotoes();
    renderExecucao();
  });

  btnFinalizar.addEventListener('click', () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    if (execucao.length > 0) {
      execucao[execucao.length - 1].dhfinal = now;
      execucao[execucao.length - 1].tipo = 'finalizado';
    }
    btnFinalizar.disabled = true;
    btnAcao.disabled = true;
    renderExecucao();
  });

  // Controle de abas
  document.querySelectorAll('.aba-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('aba-apontamentos').style.display = this.dataset.aba === 'apontamentos' ? '' : 'none';
      document.getElementById('aba-execucao').style.display = this.dataset.aba === 'execucao' ? '' : 'none';
    });
  });

  // Inicialização
  renderResumo();
  renderApontamentos();
  renderExecucao();
  atualizarBotoes();
} 