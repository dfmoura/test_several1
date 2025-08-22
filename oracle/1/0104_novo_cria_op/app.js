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
    qtdBaixada: 5040,
    execucoes: [
      { dhinicio: "2024-01-01 08:00", dhfinal: "2024-01-01 17:00", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 7800,
    execucoes: [
      { dhinicio: "2024-01-02 08:00", dhfinal: "", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 0,
    execucoes: []
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
    qtdBaixada: 6200,
    execucoes: [
      { dhinicio: "2024-01-04 08:00", dhfinal: "2024-01-04 16:00", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 0,
    execucoes: []
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
    qtdBaixada: 4300,
    execucoes: [
      { dhinicio: "2024-01-06 08:00", dhfinal: "2024-01-06 14:00", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 4900,
    execucoes: [
      { dhinicio: "2024-01-07 08:00", dhfinal: "", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 7250,
    execucoes: [
      { dhinicio: "2024-01-08 08:00", dhfinal: "2024-01-08 15:00", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 0,
    execucoes: []
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
    qtdBaixada: 5500,
    execucoes: [
      { dhinicio: "2024-01-10 08:00", dhfinal: "2024-01-10 13:00", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    qtdBaixada: 550,
    execucoes: [
      { dhinicio: "2024-01-11 08:00", dhfinal: "", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
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
    observacao: "",
    memoriaCalculo: []
  },
  {
    codigo: 12,
    descricao: "CLORETO DE POTÁSSIO",
    controle: "",
    qtdApontada: 210.0000,
    qtdPesada: 0,
    observacao: "",
    memoriaCalculo: []
  },
  {
    codigo: 13,
    descricao: "NITRATO DE MAGNÉSIO",
    controle: "",
    qtdApontada: 140.5000,
    qtdPesada: 0,
    observacao: "",
    memoriaCalculo: []
  },
  {
    codigo: 14,
    descricao: "BORO ETANOLAMINA",
    controle: "",
    qtdApontada: 80.0000,
    qtdPesada: 0,
    observacao: "",
    memoriaCalculo: []
  },
  {
    codigo: 15,
    descricao: "MOLIBDATO DE SÓDIO",
    controle: "",
    qtdApontada: 12.3000,
    qtdPesada: 0,
    observacao: "",
    memoriaCalculo: []
  },
  {
    codigo: 16,
    descricao: "ÁGUA DEIONIZADA",
    controle: "",
    qtdApontada: 37.2000,
    qtdPesada: 0,
    observacao: "",
    memoriaCalculo: []
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
      
      <!-- Abas de navegação -->
      <div class="op-abas">
        <button class="aba-btn ativa" data-aba="insumos">Insumos</button>
        <button class="aba-btn" data-aba="tempos">Tempos de Produção</button>
      </div>
      
      <!-- Conteúdo da aba Insumos -->
      <div class="aba-conteudo ativa" id="aba-insumos">
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
  
  html += `
      </div>
      
      <!-- Conteúdo da aba Tempos -->
      <div class="aba-conteudo" id="aba-tempos">
        <div class="op-tempos">
          <h3>Tempos de Produção</h3>
          <div class="tempos-tabela">
            <table>
              <thead>
                <tr>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Tipo</th>
                  <th>Usuário</th>
                  <th>Motivo</th>
                  <th>Duração</th>
                </tr>
              </thead>
              <tbody>
                ${renderizarTempos(op)}
              </tbody>
            </table>
          </div>
          <div class="tempos-resumo">
            <div class="tempo-total">
              <label>Tempo Total de Produção:</label>
              <span>${calcularTempoTotal(op)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
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
        { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: op.qtdProduzir * 0.5, qtdPesada: 0, memoriaCalculo: [] },
        { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: op.qtdProduzir * 0.3, qtdPesada: 0, memoriaCalculo: [] },
        { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: op.qtdProduzir * 0.2, qtdPesada: 0, memoriaCalculo: [] }
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
        <div class="qtd-pesada-container">
          <input type="number" 
                 class="qtd-pesada-input" 
                 value="${insumo.qtdPesada}" 
                 step="0.0001" 
                 min="0"
                 onchange="atualizarQtdPesada(${op.id}, '${insumo.codigo}', this.value)"
                 ${op.status === 'finalizada' ? 'disabled' : ''}>
          <button class="btn-memoria" onclick="mostrarMemoriaCalculo(${op.id}, '${insumo.codigo}')" title="Ver memória de cálculo">
            📊
          </button>
        </div>
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

// Função para renderizar tempos de produção
function renderizarTempos(op) {
  if (!op.execucoes || op.execucoes.length === 0) {
    return '<tr><td colspan="6" class="sem-tempos">Nenhum tempo registrado</td></tr>';
  }
  
  return op.execucoes.map(exec => {
    const duracao = calcularDuracao(exec.dhinicio, exec.dhfinal);
    const tipoClass = exec.tipo === 'parada' ? 'tipo-parada' : exec.tipo === 'finalizado' ? 'tipo-finalizado' : 'tipo-normal';
    
    return `
      <tr class="${tipoClass}">
        <td>${exec.dhinicio}</td>
        <td>${exec.dhfinal || '-'}</td>
        <td><span class="tipo-badge ${tipoClass}">${getTipoText(exec.tipo)}</span></td>
        <td>${exec.codusu}</td>
        <td>${exec.motivo || '-'}</td>
        <td>${duracao}</td>
      </tr>
    `;
  }).join('');
}

// Função para obter texto do tipo de execução
function getTipoText(tipo) {
  const tipoMap = {
    'normal': 'Produção',
    'parada': 'Parada',
    'finalizado': 'Finalizado'
  };
  return tipoMap[tipo] || tipo;
}

// Função para calcular duração entre dois horários
function calcularDuracao(inicio, fim) {
  if (!inicio || !fim) return '-';
  
  try {
    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    const diffMs = fimDate - inicioDate;
    
    if (diffMs <= 0) return '-';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    } else {
      return `${diffMinutes}min`;
    }
  } catch (e) {
    return '-';
  }
}

// Função para calcular tempo total de produção
function calcularTempoTotal(op) {
  if (!op.execucoes || op.execucoes.length === 0) return '0h 0min';
  
  let totalMs = 0;
  
  op.execucoes.forEach(exec => {
    if (exec.dhinicio && exec.dhfinal) {
      try {
        const inicio = new Date(exec.dhinicio);
        const fim = new Date(exec.dhfinal);
        const diffMs = fim - inicio;
        if (diffMs > 0) {
          totalMs += diffMs;
        }
      } catch (e) {
        // Ignora erros de data
      }
    }
  });
  
  if (totalMs <= 0) return '0h 0min';
  
  const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${totalHours}h ${totalMinutes}min`;
}

// Função para obter data e hora atual formatada
function dataHoraAtual() {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

// Função para abrir modal de motivo
function abrirModalMotivo(titulo, onConfirm) {
  const overlay = document.getElementById('overlay');
  const overlayBody = document.getElementById('overlayBody');
  
  overlayBody.innerHTML = `
    <div class="modal-motivo">
      <h3>${titulo}</h3>
      <div class="motivo-input">
        <label for="motivoInput">Motivo:</label>
        <textarea id="motivoInput" rows="3" maxlength="120" placeholder="Digite o motivo da parada..."></textarea>
      </div>
      <div class="modal-btns">
        <button class="btn-confirmar" onclick="confirmarMotivo()">Confirmar</button>
        <button class="btn-cancelar" onclick="fecharOverlay()">Cancelar</button>
      </div>
    </div>
  `;
  
  // Foca no input
  setTimeout(() => {
    const input = document.getElementById('motivoInput');
    if (input) input.focus();
  }, 100);
  
  // Função global para confirmar motivo
  window.confirmarMotivo = function() {
    const motivo = document.getElementById('motivoInput').value.trim();
    if (!motivo) {
      alert('Informe o motivo da parada.');
      return;
    }
    onConfirm(motivo);
  };
}

// Funções de controle de tempo das OP's
function iniciarOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'aguardando') {
    op.status = 'iniciada';
    // Adiciona execução inicial
    if (!op.execucoes) op.execucoes = [];
    op.execucoes.push({
      dhinicio: dataHoraAtual(),
      dhfinal: '',
      tipo: 'normal',
      codusu: 'usu001',
      motivo: ''
    });
    salvarDados();
    renderizarOPs();
    fecharOverlay();
  }
}

function pararOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'iniciada') {
    abrirModalMotivo('Motivo da Parada', (motivo) => {
      // Fecha execução anterior
      const exec = op.execucoes.find(e => !e.dhfinal);
      if (exec) exec.dhfinal = dataHoraAtual();
      
      // Nova linha tipo parada
      op.execucoes.push({
        dhinicio: dataHoraAtual(),
        dhfinal: '',
        tipo: 'parada',
        codusu: 'usu001',
        motivo: motivo
      });
      
      op.status = 'parada';
      salvarDados();
      renderizarOPs();
      fecharOverlay();
    });
  }
}

function continuarOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'parada') {
    // Fecha linha parada
    const exec = op.execucoes.find(e => !e.dhfinal && e.tipo === 'parada');
    if (exec) exec.dhfinal = dataHoraAtual();
    
    // Nova linha normal
    op.execucoes.push({
      dhinicio: dataHoraAtual(),
      dhfinal: '',
      tipo: 'normal',
      codusu: 'usu001',
      motivo: ''
    });
    
    op.status = 'iniciada';
    salvarDados();
    renderizarOPs();
    fecharOverlay();
  }
}

function finalizarOP(opId) {
  const op = operacoes.find(op => op.id === opId);
  if (op && op.status === 'iniciada') {
    // Fecha execução atual
    const exec = op.execucoes.find(e => !e.dhfinal);
    if (exec) {
      exec.dhfinal = dataHoraAtual();
      exec.tipo = 'finalizado';
    }
    
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
          { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: op.qtdProduzir * 0.5, qtdPesada: 0, memoriaCalculo: [] },
          { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: op.qtdProduzir * 0.3, qtdPesada: 0, memoriaCalculo: [] },
          { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: op.qtdProduzir * 0.2, qtdPesada: 0, memoriaCalculo: [] }
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
        { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: op.qtdProduzir * 0.5, qtdPesada: 0, memoriaCalculo: [] },
        { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: op.qtdProduzir * 0.3, qtdPesada: 0, memoriaCalculo: [] },
        { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: op.qtdProduzir * 0.2, qtdPesada: 0, memoriaCalculo: [] }
      ];
    }
    insumo = op.insumos.find(i => i.codigo === codigoInsumo);
  }
  
  if (insumo) {
    const pesagem = prompt(`Pesagem para ${insumo.descricao}:\nDigite a quantidade pesada (positiva ou negativa):`);
    if (pesagem !== null) {
      const valor = parseFloat(pesagem) || 0;
      
      // Registra na memória de cálculo
      if (!insumo.memoriaCalculo) insumo.memoriaCalculo = [];
      insumo.memoriaCalculo.push({
        timestamp: dataHoraAtual(),
        valor: valor,
        qtdAnterior: insumo.qtdPesada,
        qtdNova: insumo.qtdPesada + valor,
        usuario: 'usu001'
      });
      
      // Atualiza quantidade pesada
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
  
  // Adiciona listener para abas (delegado de eventos)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('aba-btn')) {
      const aba = e.target.getAttribute('data-aba');
      const overlayBody = document.getElementById('overlayBody');
      
      if (overlayBody) {
        // Remove classe ativa de todas as abas
        overlayBody.querySelectorAll('.aba-btn').forEach(btn => {
          btn.classList.remove('ativa');
        });
        overlayBody.querySelectorAll('.aba-conteudo').forEach(conteudo => {
          conteudo.classList.remove('ativa');
        });
        
        // Adiciona classe ativa na aba clicada
        e.target.classList.add('ativa');
        const conteudoAba = overlayBody.querySelector(`#aba-${aba}`);
        if (conteudoAba) {
          conteudoAba.classList.add('ativa');
        }
      }
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

// Função para mostrar memória de cálculo
function mostrarMemoriaCalculo(opId, codigoInsumo) {
  const op = operacoes.find(op => op.id === opId);
  if (!op) return;
  
  let insumo = null;
  
  // Para a OP 11 (VITAKELP), usa os dados específicos
  if (op.id === 11) {
    insumo = insumosVitakelp.find(i => i.codigo.toString() === codigoInsumo);
  } else {
    // Para outras OP's, usa os insumos da própria OP
    if (op.insumos) {
      insumo = op.insumos.find(i => i.codigo === codigoInsumo);
    }
  }
  
  if (insumo) {
    const overlay = document.getElementById('overlay');
    const overlayBody = document.getElementById('overlayBody');
    
    overlayBody.innerHTML = `
      <div class="memoria-calculo">
        <h3>Memória de Cálculo - ${insumo.descricao}</h3>
        
        <div class="memoria-simples">
          <div class="peso-total">
            <span class="peso-label">Total Pesado:</span>
            <span class="peso-valor">${insumo.qtdPesada.toFixed(4)}</span>
          </div>
          
          <div class="pesos-lista">
            <h4>Pesagens Realizadas:</h4>
            ${renderizarPesosSimples(insumo)}
          </div>
        </div>
        
        <div class="memoria-acoes">
          <button class="btn-voltar-memoria" onclick="abrirDetalhesOP(${opId})">
            Voltar
          </button>
        </div>
      </div>
    `;
  }
}

// Função para renderizar pesos de forma simples
function renderizarPesosSimples(insumo) {
  if (!insumo.memoriaCalculo || insumo.memoriaCalculo.length === 0) {
    return '<p class="sem-pesagens">Nenhuma pesagem registrada</p>';
  }
  
  let html = '<div class="pesos-grid">';
  
  // Mostra as pesagens em ordem cronológica reversa (mais recente primeiro)
  insumo.memoriaCalculo.slice().reverse().forEach((pesagem, index) => {
    const valorClass = pesagem.valor >= 0 ? 'peso-positivo' : 'peso-negativo';
    const sinal = pesagem.valor >= 0 ? '+' : '';
    
    html += `
      <div class="peso-item">
        <div class="peso-numero">${index + 1}</div>
        <div class="peso-valor ${valorClass}">${sinal}${pesagem.valor.toFixed(4)}</div>
        <div class="peso-hora">${pesagem.timestamp.split(' ')[1]}</div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}
