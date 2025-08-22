// Sistema de Controle de Operações de Produção
// Baseado nas especificações do test.txt

// Dados iniciais das OP's (baseados no exemplo fornecido)
let operacoes = [
  {
    id: 1,
    codigo: 4,
    produto: "PI - FULLAND",
    tamanhoLote: "5.040,00",
    numeroLote: "040422-0001",
    unidadeLote: "LT",
    status: "finalizada",
    dataCriacao: "2024-01-01",
    qtdProduzir: 5040,
    qtdApontada: 5040,
    qtdPerda: 0,
    qtdBaixada: 5040
  },
  {
    id: 2,
    codigo: 7,
    produto: "PI - MAXWELL",
    tamanhoLote: "12.500,00",
    numeroLote: "040422-0002",
    unidadeLote: "LT",
    status: "iniciada",
    dataCriacao: "2024-01-02",
    qtdProduzir: 12500,
    qtdApontada: 8000,
    qtdPerda: 200,
    qtdBaixada: 7800
  },
  {
    id: 3,
    codigo: 9,
    produto: "PI - BIOFLEX",
    tamanhoLote: "8.750,00",
    numeroLote: "040422-0003",
    unidadeLote: "LT",
    status: "aguardando",
    dataCriacao: "2024-01-03",
    qtdProduzir: 8750,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0
  },
  {
    id: 4,
    codigo: 5,
    produto: "PI - FULLAND",
    tamanhoLote: "6.200,00",
    numeroLote: "040422-0004",
    unidadeLote: "LT",
    status: "finalizada",
    dataCriacao: "2024-01-04",
    qtdProduzir: 6200,
    qtdApontada: 6200,
    qtdPerda: 0,
    qtdBaixada: 6200
  },
  {
    id: 5,
    codigo: 11,
    produto: "PI - SOLARE",
    tamanhoLote: "15.000,00",
    numeroLote: "040422-0005",
    unidadeLote: "LT",
    status: "cancelada",
    dataCriacao: "2024-01-05",
    qtdProduzir: 15000,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0
  },
  {
    id: 6,
    codigo: 8,
    produto: "PI - BIOFLEX",
    tamanhoLote: "4.300,00",
    numeroLote: "040422-0006",
    unidadeLote: "LT",
    status: "finalizada",
    dataCriacao: "2024-01-06",
    qtdProduzir: 4300,
    qtdApontada: 4300,
    qtdPerda: 0,
    qtdBaixada: 4300
  },
  {
    id: 7,
    codigo: 13,
    produto: "PI - MAXWELL",
    tamanhoLote: "9.980,00",
    numeroLote: "040422-0007",
    unidadeLote: "LT",
    status: "iniciada",
    dataCriacao: "2024-01-07",
    qtdProduzir: 9980,
    qtdApontada: 5000,
    qtdPerda: 100,
    qtdBaixada: 4900
  },
  {
    id: 8,
    codigo: 6,
    produto: "PI - SOLARE",
    tamanhoLote: "7.250,00",
    numeroLote: "040422-0008",
    unidadeLote: "LT",
    status: "finalizada",
    dataCriacao: "2024-01-08",
    qtdProduzir: 7250,
    qtdApontada: 7250,
    qtdPerda: 0,
    qtdBaixada: 7250
  },
  {
    id: 9,
    codigo: 14,
    produto: "PI - FULLAND",
    tamanhoLote: "10.600,00",
    numeroLote: "040422-0009",
    unidadeLote: "LT",
    status: "aguardando",
    dataCriacao: "2024-01-09",
    qtdProduzir: 10600,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0
  },
  {
    id: 10,
    codigo: 10,
    produto: "PI - MAXWELL",
    tamanhoLote: "5.500,00",
    numeroLote: "040422-0010",
    unidadeLote: "LT",
    status: "finalizada",
    dataCriacao: "2024-01-10",
    qtdProduzir: 5500,
    qtdApontada: 5500,
    qtdPerda: 0,
    qtdBaixada: 5500
  },
  {
    id: 11,
    codigo: 127,
    produto: "VITAKELP",
    tamanhoLote: "1.000,00",
    numeroLote: "040422-0011",
    unidadeLote: "LT",
    status: "iniciada",
    dataCriacao: "2024-01-11",
    qtdProduzir: 1000,
    qtdApontada: 600,
    qtdPerda: 50,
    qtdBaixada: 550
  }
];

// Dados dos insumos para a OP 11 (VITAKELP)
const insumosVitakelp = [
  {
    codigo: 11,
    descricao: "EXTRATO DE ALGAS MARINHAS",
    controle: "",
    qtdApontada: 520.0000,
    qtdPesada: 0,
    observacao: ""
  },
  {
    codigo: 12,
    descricao: "CLORETO DE POTÁSSIO",
    controle: "",
    qtdApontada: 210.0000,
    qtdPesada: 0,
    observacao: ""
  },
  {
    codigo: 13,
    descricao: "NITRATO DE MAGNÉSIO",
    controle: "",
    qtdApontada: 140.5000,
    qtdPesada: 0,
    observacao: ""
  },
  {
    codigo: 14,
    descricao: "BORO ETANOLAMINA",
    controle: "",
    qtdApontada: 80.0000,
    qtdPesada: 0,
    observacao: ""
  },
  {
    codigo: 15,
    descricao: "MOLIBDATO DE SÓDIO",
    controle: "",
    qtdApontada: 12.3000,
    qtdPesada: 0,
    observacao: ""
  },
  {
    codigo: 16,
    descricao: "ÁGUA DEIONIZADA",
    controle: "",
    qtdApontada: 37.2000,
    qtdPesada: 0,
    observacao: ""
  }
];

// Estado global da aplicação
let filtroAtual = 'todos';
let opSelecionada = null;

// Função para salvar dados no localStorage
function salvarDados() {
  localStorage.setItem('operacoes', JSON.stringify(operacoes));
}

// Função para carregar dados do localStorage
function carregarDados() {
  const dados = localStorage.getItem('operacoes');
  if (dados) {
    operacoes = JSON.parse(dados);
  }
}

// Função para obter o texto do status
function getStatusText(status) {
  const statusMap = {
    'aguardando': 'Aguardando Aceite',
    'iniciada': 'Em Produção',
    'finalizada': 'Finalizada',
    'cancelada': 'Cancelada'
  };
  return statusMap[status] || status;
}

// Função para obter a classe CSS do status
function getStatusClass(status) {
  return `status-${status}`;
}

// Função para renderizar as OP's
function renderizarOPs() {
  const opList = document.getElementById('opList');
  const semOps = document.getElementById('semOps');
  
  // Filtra as OP's baseado no filtro atual
  let opsFiltradas = operacoes;
  if (filtroAtual !== 'todos') {
    opsFiltradas = operacoes.filter(op => op.status === filtroAtual);
  }
  
  if (opsFiltradas.length === 0) {
    opList.innerHTML = '';
    semOps.style.display = 'block';
    return;
  }
  
  semOps.style.display = 'none';
  
  opList.innerHTML = opsFiltradas.map(op => `
    <div class="op-card" onclick="abrirDetalhesOP(${op.id})">
      <div class="op-header">
        <div class="op-numero">OP ${op.id}</div>
        <div class="op-status ${getStatusClass(op.status)}">
          ${getStatusText(op.status)}
        </div>
      </div>
      
      <div class="op-info">
        <div class="op-info-item">
          <div class="op-info-label">Produto</div>
          <div class="op-info-value">${op.produto}</div>
        </div>
        <div class="op-info-item">
          <div class="op-info-label">Lote</div>
          <div class="op-info-value">${op.numeroLote}</div>
        </div>
        <div class="op-info-item">
          <div class="op-info-label">Qtd. Produzir</div>
          <div class="op-info-value">${op.tamanhoLote} ${op.unidadeLote}</div>
        </div>
        <div class="op-info-item">
          <div class="op-info-label">Progresso</div>
          <div class="op-info-value">${op.qtdApontada}/${op.qtdProduzir}</div>
        </div>
      </div>
      
      <div class="op-actions">
        ${renderizarBotoesAcao(op)}
      </div>
    </div>
  `).join('');
}

// Função para renderizar botões de ação baseado no status
function renderizarBotoesAcao(op) {
  switch (op.status) {
    case 'aguardando':
      return `<button class="action-btn btn-iniciar" onclick="event.stopPropagation(); iniciarOP(${op.id})">Iniciar</button>`;
    
    case 'iniciada':
      return `
        <button class="action-btn btn-parar" onclick="event.stopPropagation(); pararOP(${op.id})">Parar</button>
        <button class="action-btn btn-finalizar" onclick="event.stopPropagation(); finalizarOP(${op.id})">Finalizar</button>
      `;
    
    case 'parada':
      return `<button class="action-btn btn-continuar" onclick="event.stopPropagation(); continuarOP(${op.id})">Continuar</button>`;
    
    default:
      return '';
  }
}

// Função para abrir detalhes da OP
function abrirDetalhesOP(opId) {
  opSelecionada = operacoes.find(op => op.id === opId);
  if (!opSelecionada) return;
  
  document.getElementById('overlayTitle').textContent = `OP ${opSelecionada.id} - ${opSelecionada.produto}`;
  
  const overlayBody = document.getElementById('overlayBody');
  overlayBody.innerHTML = renderizarDetalhesOP(opSelecionada);
  
  document.getElementById('overlay').style.display = 'flex';
}

// Função para renderizar detalhes da OP
function renderizarDetalhesOP(op) {
  let html = `
    <div class="op-detalhes">
      <div class="op-resumo">
        <h3>Resumo da Operação</h3>
        <div class="op-resumo-grid">
          <div class="resumo-item">
            <label>Código:</label>
            <span>${op.codigo}</span>
          </div>
          <div class="resumo-item">
            <label>Produto:</label>
            <span>${op.produto}</span>
          </div>
          <div class="resumo-item">
            <label>Lote:</label>
            <span>${op.numeroLote}</span>
          </div>
          <div class="resumo-item">
            <label>Qtd. Produzir:</label>
            <span>${op.tamanhoLote} ${op.unidadeLote}</span>
          </div>
          <div class="resumo-item">
            <label>Status:</label>
            <span class="status-badge ${getStatusClass(op.status)}">${getStatusText(op.status)}</span>
          </div>
        </div>
      </div>
  `;
  
  // Se a OP foi iniciada, mostra os insumos
  if (['iniciada', 'parada', 'finalizada'].includes(op.status)) {
    html += `
      <div class="op-insumos">
        <h3>Insumos da OP</h3>
        <div class="insumos-tabela">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Qtd. Apontada</th>
                <th>Qtd. Pesada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${renderizarInsumos(op)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  // Se a OP está em produção, mostra controles
  if (['iniciada', 'parada'].includes(op.status)) {
    html += `
      <div class="op-controles">
        <h3>Controles de Produção</h3>
        <div class="controles-grid">
          ${renderizarControles(op)}
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// Função para renderizar insumos
function renderizarInsumos(op) {
  // Para a OP 11 (VITAKELP), usa os dados específicos
  let insumos = [];
  if (op.id === 11) {
    insumos = insumosVitakelp;
  } else {
    // Para outras OP's, usa os insumos existentes ou gera novos
    if (op.insumos) {
      insumos = op.insumos;
    } else {
      insumos = [
        { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: op.qtdProduzir * 0.5, qtdPesada: 0 },
        { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: op.qtdProduzir * 0.3, qtdPesada: 0 },
        { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: op.qtdProduzir * 0.2, qtdPesada: 0 }
      ];
      // Salva os insumos na OP para uso futuro
      op.insumos = insumos;
    }
  }
  
  return insumos.map(insumo => `
    <tr>
      <td>${insumo.codigo}</td>
      <td>${insumo.descricao}</td>
      <td>${insumo.qtdApontada.toFixed(4)}</td>
      <td>
        <input type="number" 
               class="qtd-pesada-input" 
               value="${insumo.qtdPesada}" 
               step="0.0001" 
               min="0"
               onchange="atualizarQtdPesada(${op.id}, '${insumo.codigo}', this.value)"
               ${op.status === 'finalizada' ? 'disabled' : ''}>
      </td>
      <td>
        ${op.status !== 'finalizada' ? `
          <button class="btn-pesar" onclick="abrirModalPesagem(${op.id}, '${insumo.codigo}')">
            Pesar
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// Função para renderizar controles
function renderizarControles(op) {
  if (op.status === 'iniciada') {
    return `
      <button class="btn-controle btn-parar" onclick="pararOP(${op.id})">
        Parar Produção
      </button>
      <button class="btn-controle btn-finalizar" onclick="finalizarOP(${op.id})">
        Finalizar Produção
      </button>
    `;
  } else if (op.status === 'parada') {
    return `
      <button class="btn-controle btn-continuar" onclick="continuarOP(${op.id})">
        Continuar Produção
      </button>
    `;
  }
  return '';
}

// Funções de controle das OP's
function iniciarOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'aguardando') {
    op.status = 'iniciada';
    salvarDados();
    renderizarOPs();
    fecharOverlay();
  }
}

function pararOP(opId) {
  const motivo = prompt('Motivo da parada:');
  if (motivo) {
    const op = operacoes.find(op => op.id === opId);
    if (op && op.status === 'iniciada') {
      op.status = 'parada';
      op.motivoParada = motivo;
      salvarDados();
      renderizarOPs();
      fecharOverlay();
    }
  }
}

function continuarOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'parada') {
    op.status = 'iniciada';
    delete op.motivoParada;
    salvarDados();
    renderizarOPs();
    fecharOverlay();
  }
}

function finalizarOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'iniciada') {
    op.status = 'finalizada';
    op.dataFinalizacao = new Date().toISOString().split('T')[0];
    salvarDados();
    renderizarOPs();
    fecharOverlay();
  }
}

// Função para atualizar quantidade pesada
function atualizarQtdPesada(opId, codigoInsumo, valor) {
  const op = operacoes.find(op => op.id === opId);
  if (op) {
    // Para a OP 11 (VITAKELP), atualiza os insumos específicos
    if (op.id === 11) {
      const insumo = insumosVitakelp.find(i => i.codigo.toString() === codigoInsumo);
      if (insumo) {
        insumo.qtdPesada = parseFloat(valor) || 0;
      }
    } else {
      // Para outras OP's, atualiza os insumos da própria OP
      if (!op.insumos) {
        op.insumos = [
          { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: op.qtdProduzir * 0.5, qtdPesada: 0 },
          { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: op.qtdProduzir * 0.3, qtdPesada: 0 },
          { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: op.qtdProduzir * 0.2, qtdPesada: 0 }
        ];
      }
      const insumo = op.insumos.find(i => i.codigo === codigoInsumo);
      if (insumo) {
        insumo.qtdPesada = parseFloat(valor) || 0;
      }
    }
    salvarDados();
  }
}

// Função para abrir modal de pesagem
function abrirModalPesagem(opId, codigoInsumo) {
  const op = operacoes.find(op => op.id === opId);
  if (!op) return;
  
  let insumo = null;
  
  // Para a OP 11 (VITAKELP), usa os dados específicos
  if (op.id === 11) {
    insumo = insumosVitakelp.find(i => i.codigo.toString() === codigoInsumo);
  } else {
    // Para outras OP's, gera dados simulados se não existirem
    if (!op.insumos) {
      op.insumos = [
        { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: op.qtdProduzir * 0.5, qtdPesada: 0 },
        { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: op.qtdProduzir * 0.3, qtdPesada: 0 },
        { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: op.qtdProduzir * 0.2, qtdPesada: 0 }
      ];
    }
    insumo = op.insumos.find(i => i.codigo === codigoInsumo);
  }
  
  if (insumo) {
    const pesagem = prompt(`Pesagem para ${insumo.descricao}:\nDigite a quantidade pesada (positiva ou negativa):`);
    if (pesagem !== null) {
      const valor = parseFloat(pesagem) || 0;
      insumo.qtdPesada += valor;
      salvarDados();
      renderizarOPs();
      if (document.getElementById('overlay').style.display === 'flex') {
        abrirDetalhesOP(opId);
      }
    }
  }
}

// Função para fechar overlay
function fecharOverlay() {
  document.getElementById('overlay').style.display = 'none';
  opSelecionada = null;
}

// Função para atualizar dados
function atualizarDados() {
  // Simula atualização dos dados
  const refreshBtn = document.querySelector('.refresh-btn');
  refreshBtn.style.transform = 'rotate(360deg)';
  refreshBtn.style.transition = 'transform 0.5s ease';
  
  setTimeout(() => {
    refreshBtn.style.transform = 'rotate(0deg)';
    renderizarOPs();
  }, 500);
}

// Função para alternar filtros
function alternarFiltro(status) {
  filtroAtual = status;
  
  // Atualiza botões de filtro
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.classList.remove('ativo');
  });
  document.querySelector(`[data-status="${status}"]`).classList.add('ativo');
  
  renderizarOPs();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Carrega dados salvos
  carregarDados();
  
  // Renderiza OP's iniciais
  renderizarOPs();
  
  // Adiciona listeners para filtros
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const status = this.getAttribute('data-status');
      alternarFiltro(status);
    });
  });
  
  // Fecha overlay ao clicar fora
  document.getElementById('overlay').addEventListener('click', function(e) {
    if (e.target === this) {
      fecharOverlay();
    }
  });
});

// Função para adicionar nova OP (para demonstração)
function adicionarNovaOP() {
  const novaOP = {
    id: operacoes.length + 1,
    codigo: Math.floor(Math.random() * 1000) + 1,
    produto: `PRODUTO ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    tamanhoLote: (Math.random() * 10000 + 1000).toFixed(2),
    numeroLote: `LOTE-${Date.now()}`,
    unidadeLote: "UN",
    status: "aguardando",
    dataCriacao: new Date().toISOString().split('T')[0],
    qtdProduzir: Math.floor(Math.random() * 10000) + 1000,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0
  };
  
  operacoes.push(novaOP);
  salvarDados();
  renderizarOPs();
}
