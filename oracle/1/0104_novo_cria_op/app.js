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
    status: "aguardando",
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
    status: "parada",
    dataCriacao: "2024-01-03",
    qtdProduzir: 8750,
    qtdApontada: 5000,
    qtdPerda: 100,
    qtdBaixada: 4900,
    execucoes: [
      { dhinicio: "2024-01-03 08:00", dhfinal: "2024-01-03 12:00", tipo: "normal", codusu: "usu001", motivo: "" },
      { dhinicio: "2024-01-03 12:00", dhfinal: "", tipo: "parada", codusu: "usu001", motivo: "Manutenção preventiva" }
    ]
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
    codigo: 12,
    produto: "PI - MAXWELL",
    tamanhoLote: "9.800,00",
    numeroLote: "040422-0007",
    unidadeLote: "LT",
    status: "aguardando",
    dataCriacao: "2024-01-07",
    qtdProduzir: 9800,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0,
    execucoes: []
  },
  {
    id: 8,
    codigo: 13,
    produto: "PI - FULLAND",
    tamanhoLote: "7.600,00",
    numeroLote: "040422-0008",
    unidadeLote: "LT",
    status: "iniciada",
    dataCriacao: "2024-01-08",
    qtdProduzir: 7600,
    qtdApontada: 3800,
    qtdPerda: 50,
    qtdBaixada: 3750,
    execucoes: [
      { dhinicio: "2024-01-08 08:00", dhfinal: "", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
  },
  {
    id: 9,
    codigo: 14,
    produto: "PI - BIOFLEX",
    tamanhoLote: "11.200,00",
    numeroLote: "040422-0009",
    unidadeLote: "LT",
    status: "aguardando",
    dataCriacao: "2024-01-09",
    qtdProduzir: 11200,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0,
    execucoes: []
  },
  {
    id: 10,
    codigo: 15,
    produto: "PI - SOLARE",
    tamanhoLote: "18.500,00",
    numeroLote: "040422-0010",
    unidadeLote: "LT",
    status: "finalizada",
    dataCriacao: "2024-01-10",
    qtdProduzir: 18500,
    qtdApontada: 18500,
    qtdPerda: 200,
    qtdBaixada: 18300,
    execucoes: [
      { dhinicio: "2024-01-10 08:00", dhfinal: "2024-01-10 18:00", tipo: "normal", codusu: "usu001", motivo: "" }
    ]
  },
  {
    id: 11,
    codigo: 16,
    produto: "VITAKELP",
    tamanhoLote: "2.500,00",
    numeroLote: "040422-0011",
    unidadeLote: "KG",
    status: "aguardando",
    dataCriacao: "2024-01-11",
    qtdProduzir: 2500,
    qtdApontada: 0,
    qtdPerda: 0,
    qtdBaixada: 0,
    execucoes: [],
    insumos: []
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
  try {
    localStorage.setItem('operacoes', JSON.stringify(operacoes));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
    alert('Erro ao salvar dados. Tente novamente.');
  }
}

// Função para carregar dados do localStorage
function carregarDados() {
  try {
    const dados = localStorage.getItem('operacoes');
    if (dados) {
      operacoes = JSON.parse(dados);
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    // Se houver erro, usa os dados padrão
    operacoes = [
      {
        id: 11,
        codigo: 'OP001',
        produto: 'VITAKELP',
        tamanhoLote: '1000.00',
        numeroLote: 'LOTE-001',
        unidadeLote: 'KG',
        status: 'aguardando',
        dataCriacao: '2024-01-04',
        qtdProduzir: 1000,
        qtdApontada: 0,
        qtdPerda: 0,
        qtdBaixada: 0,
        execucoes: [],
        insumos: []
      }
    ];
  }
}

// Função para obter o texto do status
function getStatusText(status) {
  try {
    const statusMap = {
      'aguardando': 'Aguardando Aceite',
      'iniciada': 'Em Produção',
      'parada': 'Parada',
      'finalizada': 'Finalizada',
      'cancelada': 'Cancelada'
    };
    return statusMap[status] || status || 'Desconhecido';
  } catch (e) {
    console.error('Erro ao obter texto do status:', e);
    return 'Desconhecido';
  }
}

// Função para obter a classe CSS do status
function getStatusClass(status) {
  try {
    return `status-${status || 'desconhecido'}`;
  } catch (e) {
    console.error('Erro ao obter classe do status:', e);
    return 'status-desconhecido';
  }
}

// Função para renderizar as OP's
function renderizarOPs() {
  try {
    const opList = document.getElementById('opList');
    const semOps = document.getElementById('semOps');
    
    if (!opList || !semOps) {
      console.error('Elementos da lista de OP não encontrados');
      return;
    }
    
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
          <div class="op-numero">OP ${op.id || 'N/A'}</div>
          <div class="op-status ${getStatusClass(op.status)}">
            ${getStatusText(op.status)}
          </div>
        </div>
        
        <div class="op-info">
          <div class="op-info-item">
            <div class="op-info-label">Produto</div>
            <div class="op-info-value">${op.produto || 'N/A'}</div>
          </div>
          <div class="op-info-item">
            <div class="op-info-label">Lote</div>
            <div class="op-info-value">${op.numeroLote || 'N/A'}</div>
          </div>
          <div class="op-info-item">
            <div class="op-info-label">Qtd. Produzir</div>
            <div class="op-info-value">${op.tamanhoLote || 0} ${op.unidadeLote || ''}</div>
          </div>
          <div class="op-info-item">
            <div class="op-info-label">Progresso</div>
            <div class="op-info-value">${op.qtdApontada || 0}/${op.qtdProduzir || 0}</div>
          </div>
        </div>
        
        <div class="op-actions">
          ${renderizarBotoesAcao(op)}
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Erro ao renderizar OP\'s:', e);
    const opList = document.getElementById('opList');
    if (opList) {
      opList.innerHTML = '<div class="erro-renderizacao">Erro ao renderizar OP\'s</div>';
    }
  }
}

// Função para renderizar botões de ação baseado no status
function renderizarBotoesAcao(op) {
  try {
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
  } catch (e) {
    console.error('Erro ao renderizar botões de ação:', e);
    return '';
  }
}

// Função para abrir detalhes da OP
function abrirDetalhesOP(opId) {
  try {
    opSelecionada = operacoes.find(op => op.id === opId);
    if (!opSelecionada) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayBody = document.getElementById('overlayBody');
    const overlay = document.getElementById('overlay');
    
    if (!overlayTitle || !overlayBody || !overlay) {
      console.error('Elementos do overlay não encontrados');
      return;
    }
    
    overlayTitle.textContent = `OP ${opSelecionada.id} - ${opSelecionada.produto || 'N/A'}`;
    overlayBody.innerHTML = renderizarDetalhesOP(opSelecionada);
    overlay.style.display = 'flex';
  } catch (e) {
    console.error('Erro ao abrir detalhes da OP:', e);
    alert('Erro ao abrir detalhes da OP. Tente novamente.');
  }
}

// Função para renderizar detalhes da OP
function renderizarDetalhesOP(op) {
  try {
    let html = `
      <div class="op-detalhes">
        <div class="op-resumo">
          <h3>Resumo da Operação</h3>
          <div class="op-resumo-grid">
            <div class="resumo-item">
              <label>Código:</label>
              <span>${op.codigo || '-'}</span>
            </div>
            <div class="resumo-item">
              <label>Produto:</label>
              <span>${op.produto || '-'}</span>
            </div>
            <div class="resumo-item">
              <label>Lote:</label>
              <span>${op.numeroLote || '-'}</span>
            </div>
            <div class="resumo-item">
              <label>Qtd. Produzir:</label>
              <span>${op.tamanhoLote || 0} ${op.unidadeLote || ''}</span>
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
          <div class="op-insumos">
            <h3>Insumos da OP</h3>
            <div class="insumos-tabela">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd. Apont.</th>
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
        </div>
        
        <!-- Conteúdo da aba Tempos de Produção -->
        <div class="aba-conteudo" id="aba-tempos">
          <div class="op-tempos">
            <h3>Tempos de Produção</h3>
            ${renderizarTempos(op)}
          </div>
        </div>
      </div>
    `;
    
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
    
    return html;
  } catch (e) {
    console.error('Erro ao renderizar detalhes da OP:', e);
    return '<div class="erro-renderizacao">Erro ao renderizar detalhes da OP</div>';
  }
}

// Função para renderizar insumos
function renderizarInsumos(op) {
  try {
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
          { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: (op.qtdProduzir || 0) * 0.5, qtdPesada: 0, memoriaCalculo: [] },
          { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: (op.qtdProduzir || 0) * 0.3, qtdPesada: 0, memoriaCalculo: [] },
          { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: (op.qtdProduzir || 0) * 0.2, qtdPesada: 0, memoriaCalculo: [] }
        ];
        // Salva os insumos na OP para uso futuro
        op.insumos = insumos;
      }
    }
    
    return insumos.map(insumo => `
      <tr>
        <td class="produto-info">
          <div class="produto-codigo">${insumo.codigo || '-'}</div>
          <div class="produto-descricao">${insumo.descricao || '-'}</div>
        </td>
        <td class="qtd-apontada">${(insumo.qtdApontada || 0).toFixed(4)}</td>
        <td class="qtd-pesada">${(insumo.qtdPesada || 0).toFixed(4)}</td>
        <td class="acoes-insumo">
          <div class="acoes-buttons">
            <button class="btn-memoria" onclick="mostrarMemoriaCalculo(${op.id}, '${insumo.codigo}')" title="Ver memória de cálculo">
              📊
            </button>
            ${op.status !== 'finalizada' ? `
              <button class="btn-pesar" onclick="abrirModalPesagem(${op.id}, '${insumo.codigo}')" title="Pesar insumo">
                ⚖️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao renderizar insumos:', e);
    return '<tr><td colspan="4" class="erro-insumos">Erro ao renderizar insumos</td></tr>';
  }
}

// Função para renderizar controles
function renderizarControles(op) {
  try {
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
  } catch (e) {
    console.error('Erro ao renderizar controles:', e);
    return '';
  }
}

// Função para renderizar tempos de produção
function renderizarTempos(op) {
  try {
    if (!op.execucoes || op.execucoes.length === 0) {
      return '<tr><td colspan="6" class="sem-tempos">Nenhum tempo registrado</td></tr>';
    }
    
    return op.execucoes.map(exec => {
      try {
        const duracao = calcularDuracao(exec.dhinicio, exec.dhfinal);
        const tipoClass = exec.tipo === 'parada' ? 'tipo-parada' : exec.tipo === 'finalizado' ? 'tipo-finalizado' : 'tipo-normal';
        
        return `
          <tr class="${tipoClass}">
            <td>${exec.dhinicio || '-'}</td>
            <td>${exec.dhfinal || '-'}</td>
            <td><span class="tipo-badge ${tipoClass}">${getTipoText(exec.tipo)}</span></td>
            <td>${exec.codusu || '-'}</td>
            <td>${exec.motivo || '-'}</td>
            <td>${duracao}</td>
          </tr>
        `;
      } catch (e) {
        console.error('Erro ao renderizar execução:', e);
        return '<tr><td colspan="6" class="erro-tempo">Erro ao renderizar tempo</td></tr>';
      }
    }).join('');
  } catch (e) {
    console.error('Erro ao renderizar tempos:', e);
    return '<tr><td colspan="6" class="erro-tempo">Erro ao renderizar tempos</td></tr>';
  }
}

// Função para obter texto do tipo de execução
function getTipoText(tipo) {
  try {
    const tipoMap = {
      'normal': 'Produção',
      'parada': 'Parada',
      'finalizado': 'Finalizado'
    };
    return tipoMap[tipo] || tipo || 'Desconhecido';
  } catch (e) {
    console.error('Erro ao obter texto do tipo:', e);
    return 'Desconhecido';
  }
}

// Função para calcular duração entre dois horários
function calcularDuracao(inicio, fim) {
  try {
    if (!inicio || !fim) return '-';
    
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
    console.error('Erro ao calcular duração:', e);
    return '-';
  }
}

// Função para calcular tempo total de produção
function calcularTempoTotal(op) {
  try {
    if (!op.execucoes || op.execucoes.length === 0) return '0h 0min';
    
    let totalMs = 0;
    
    op.execucoes.forEach(exec => {
      try {
        if (exec.dhinicio && exec.dhfinal) {
          const inicio = new Date(exec.dhinicio);
          const fim = new Date(exec.dhfinal);
          const diffMs = fim - inicio;
          if (diffMs > 0) {
            totalMs += diffMs;
          }
        }
      } catch (e) {
        console.error('Erro ao calcular duração de execução:', e);
        // Ignora erros de data
      }
    });
    
    if (totalMs <= 0) return '0h 0min';
    
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${totalHours}h ${totalMinutes}min`;
  } catch (e) {
    console.error('Erro ao calcular tempo total:', e);
    return '0h 0min';
  }
}

// Função para obter data e hora atual formatada
function dataHoraAtual() {
  try {
    const d = new Date();
    return d.toISOString().slice(0, 16).replace('T', ' ');
  } catch (e) {
    console.error('Erro ao obter data e hora atual:', e);
    return new Date().toLocaleString();
  }
}

// Função para abrir modal de motivo
function abrirModalMotivo(titulo, onConfirm) {
  try {
    const overlay = document.getElementById('overlay');
    const overlayBody = document.getElementById('overlayBody');
    
    if (!overlay || !overlayBody) {
      console.error('Elementos do overlay não encontrados');
      return;
    }
    
    // Remove função global anterior se existir
    if (window.confirmarMotivo) {
      delete window.confirmarMotivo;
    }
    
    // Cria uma função local para confirmar
    const confirmarMotivoLocal = function() {
      try {
        const motivo = document.getElementById('motivoInput').value.trim();
        if (!motivo) {
          alert('Informe o motivo da parada.');
          return;
        }
        
        console.log('Motivo confirmado:', motivo);
        
        // Fecha o overlay primeiro
        fecharOverlay();
        
        // Chama o callback com o motivo
        if (typeof onConfirm === 'function') {
          console.log('Chamando callback onConfirm');
          onConfirm(motivo);
        } else {
          console.error('onConfirm não é uma função:', onConfirm);
        }
      } catch (e) {
        console.error('Erro ao confirmar motivo:', e);
        alert('Erro ao confirmar motivo. Tente novamente.');
      }
    };
    
    // Define a função global
    window.confirmarMotivo = confirmarMotivoLocal;
    
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
    
    // Mostra o overlay
    overlay.style.display = 'flex';
    
    // Foca no input
    setTimeout(() => {
      const input = document.getElementById('motivoInput');
      if (input) input.focus();
    }, 100);
    
    console.log('Modal de motivo aberto com sucesso');
  } catch (e) {
    console.error('Erro ao abrir modal de motivo:', e);
    alert('Erro ao abrir modal. Tente novamente.');
  }
}

// Funções de controle de tempo das OP's
function iniciarOP(opId) {
  try {
    console.log('Tentando iniciar OP:', opId);
    
    const op = operacoes.find(op => op.id === opId);
    if (!op) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
    console.log('Status atual da OP:', op.status);
    console.log('Execuções da OP:', op.execucoes);
    
    if (op.status === 'aguardando') {
      console.log('OP pode ser iniciada, processando...');
      
      op.status = 'iniciada';
      console.log('Status da OP alterado para iniciada');
      
      // Adiciona execução inicial
      if (!op.execucoes) op.execucoes = [];
      
      const novaExecucao = {
        dhinicio: dataHoraAtual(),
        dhfinal: '',
        tipo: 'normal',
        codusu: 'usu001',
        motivo: ''
      };
      
      op.execucoes.push(novaExecucao);
      console.log('Nova execução inicial criada:', novaExecucao);
      
      salvarDados();
      console.log('Dados salvos');
      
      renderizarOPs();
      console.log('OPs re-renderizadas');
      
      fecharOverlay();
      console.log('Overlay fechado');
      
      console.log('OP iniciada com sucesso');
    } else {
      console.log('OP não pode ser iniciada no status atual:', op.status);
      alert('Só é possível iniciar uma OP que esteja aguardando aceite.');
    }
  } catch (e) {
    console.error('Erro ao iniciar OP:', e);
    alert('Erro ao iniciar OP. Tente novamente.');
  }
}

function pararOP(opId) {
  try {
    console.log('Tentando parar OP:', opId);
    
    const op = operacoes.find(op => op.id === opId);
    if (!op) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
    console.log('Status atual da OP:', op.status);
    
    if (op.status === 'iniciada') {
      console.log('OP pode ser parada, abrindo modal...');
      
      // Define o callback antes de abrir o modal
      const callbackParada = function(motivo) {
        try {
          console.log('Processando parada para OP:', opId, 'com motivo:', motivo);
          
          // Fecha execução anterior
          const exec = op.execucoes.find(e => !e.dhfinal);
          if (exec) {
            exec.dhfinal = dataHoraAtual();
            console.log('Execução anterior fechada:', exec);
          }
          
          // Nova linha tipo parada
          const novaExecucao = {
            dhinicio: dataHoraAtual(),
            dhfinal: '',
            tipo: 'parada',
            codusu: 'usu001',
            motivo: motivo
          };
          
          op.execucoes.push(novaExecucao);
          console.log('Nova execução de parada criada:', novaExecucao);
          
          op.status = 'parada';
          console.log('Status da OP alterado para parada');
          
          salvarDados();
          console.log('Dados salvos');
          
          renderizarOPs();
          console.log('OPs re-renderizadas');
          
          console.log('Parada processada com sucesso');
        } catch (e) {
          console.error('Erro ao processar parada:', e);
          alert('Erro ao processar parada. Tente novamente.');
        }
      };
      
      // Abre o modal com o callback
      abrirModalMotivo('Motivo da Parada', callbackParada);
    } else {
      console.log('OP não pode ser parada no status atual:', op.status);
      alert('Só é possível parar uma OP que esteja em produção.');
    }
  } catch (e) {
    console.error('Erro ao parar OP:', e);
    alert('Erro ao parar OP. Tente novamente.');
  }
}

function continuarOP(opId) {
  try {
    console.log('Tentando continuar OP:', opId);
    
    const op = operacoes.find(op => op.id === opId);
    if (!op) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
    console.log('Status atual da OP:', op.status);
    console.log('Execuções da OP:', op.execucoes);
    
    if (op.status === 'parada') {
      console.log('OP pode ser continuada, processando...');
      
      // Fecha linha parada
      const exec = op.execucoes.find(e => !e.dhfinal && e.tipo === 'parada');
      if (exec) {
        exec.dhfinal = dataHoraAtual();
        console.log('Execução de parada fechada:', exec);
      } else {
        console.log('Nenhuma execução de parada em andamento encontrada');
        // Cria uma execução de parada fechada se não existir
        op.execucoes.push({
          dhinicio: dataHoraAtual(),
          dhfinal: dataHoraAtual(),
          tipo: 'parada',
          codusu: 'usu001',
          motivo: 'Parada automática'
        });
        console.log('Execução de parada automática criada');
      }
      
      // Nova linha normal
      const novaExecucao = {
        dhinicio: dataHoraAtual(),
        dhfinal: '',
        tipo: 'normal',
        codusu: 'usu001',
        motivo: ''
      };
      
      op.execucoes.push(novaExecucao);
      console.log('Nova execução normal criada:', novaExecucao);
      
      op.status = 'iniciada';
      console.log('Status da OP alterado para iniciada');
      
      salvarDados();
      console.log('Dados salvos');
      
      renderizarOPs();
      console.log('OPs re-renderizadas');
      
      fecharOverlay();
      console.log('Overlay fechado');
      
      console.log('OP continuada com sucesso');
    } else {
      console.log('OP não pode ser continuada no status atual:', op.status);
      alert('Só é possível continuar uma OP que esteja parada.');
    }
  } catch (e) {
    console.error('Erro ao continuar OP:', e);
    alert('Erro ao continuar OP. Tente novamente.');
  }
}

function finalizarOP(opId) {
  try {
    console.log('Tentando finalizar OP:', opId);
    
    const op = operacoes.find(op => op.id === opId);
    if (!op) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
    console.log('Status atual da OP:', op.status);
    console.log('Execuções da OP:', op.execucoes);
    
    // Só permite finalizar se estiver em execução (não parado)
    if (op.status === 'iniciada') {
      console.log('OP pode ser finalizada, processando...');
      
      // Fecha execução atual
      const exec = op.execucoes.find(e => !e.dhfinal);
      if (exec) {
        exec.dhfinal = dataHoraAtual();
        exec.tipo = 'finalizado';
        console.log('Execução atual finalizada:', exec);
      } else {
        console.log('Nenhuma execução em andamento encontrada');
        // Cria uma execução finalizada se não existir
        op.execucoes.push({
          dhinicio: dataHoraAtual(),
          dhfinal: dataHoraAtual(),
          tipo: 'finalizado',
          codusu: 'usu001',
          motivo: 'Finalização direta'
        });
        console.log('Execução de finalização criada');
      }
      
      op.status = 'finalizada';
      op.dataFinalizacao = new Date().toISOString().split('T')[0];
      console.log('Status da OP alterado para finalizada');
      
      salvarDados();
      console.log('Dados salvos');
      
      renderizarOPs();
      console.log('OPs re-renderizadas');
      
      fecharOverlay();
      console.log('Overlay fechado');
      
      console.log('OP finalizada com sucesso');
    } else {
      console.log('OP não pode ser finalizada no status atual:', op.status);
      alert('Só é possível finalizar uma OP que esteja em produção.');
    }
  } catch (e) {
    console.error('Erro ao finalizar OP:', e);
    alert('Erro ao finalizar OP. Tente novamente.');
  }
}

// Função para atualizar quantidade pesada
function atualizarQtdPesada(opId, codigoInsumo, valor) {
  try {
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
            { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: (op.qtdProduzir || 0) * 0.5, qtdPesada: 0, memoriaCalculo: [] },
            { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: (op.qtdProduzir || 0) * 0.3, qtdPesada: 0, memoriaCalculo: [] },
            { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: (op.qtdProduzir || 0) * 0.2, qtdPesada: 0, memoriaCalculo: [] }
          ];
        }
        const insumo = op.insumos.find(i => i.codigo === codigoInsumo);
        if (insumo) {
          insumo.qtdPesada = parseFloat(valor) || 0;
        }
      }
      salvarDados();
    }
  } catch (e) {
    console.error('Erro ao atualizar quantidade pesada:', e);
    alert('Erro ao atualizar quantidade pesada. Tente novamente.');
  }
}

// Função para abrir modal de pesagem
function abrirModalPesagem(opId, codigoInsumo) {
  try {
    const op = operacoes.find(op => op.id === opId);
    if (!op) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
    let insumo = null;
    
    // Para a OP 11 (VITAKELP), usa os dados específicos
    if (op.id === 11) {
      insumo = insumosVitakelp.find(i => i.codigo.toString() === codigoInsumo);
    } else {
      // Para outras OP's, gera dados simulados se não existirem
      if (!op.insumos) {
        op.insumos = [
          { codigo: 'MP001', descricao: 'Matéria Prima A', qtdApontada: (op.qtdProduzir || 0) * 0.5, qtdPesada: 0, memoriaCalculo: [] },
          { codigo: 'MP002', descricao: 'Matéria Prima B', qtdApontada: (op.qtdProduzir || 0) * 0.3, qtdPesada: 0, memoriaCalculo: [] },
          { codigo: 'MP003', descricao: 'Matéria Prima C', qtdApontada: (op.qtdProduzir || 0) * 0.2, qtdPesada: 0, memoriaCalculo: [] }
        ];
      }
      insumo = op.insumos.find(i => i.codigo === codigoInsumo);
    }
    
    if (insumo) {
      const pesagem = prompt(`Pesagem para ${insumo.descricao || 'Insumo'}:\nDigite a quantidade pesada (positiva ou negativa):`);
      if (pesagem !== null) {
        try {
          const valor = parseFloat(pesagem) || 0;
          
          // Registra na memória de cálculo
          if (!insumo.memoriaCalculo) insumo.memoriaCalculo = [];
          insumo.memoriaCalculo.push({
            timestamp: dataHoraAtual(),
            valor: valor,
            qtdAnterior: insumo.qtdPesada || 0,
            qtdNova: (insumo.qtdPesada || 0) + valor,
            usuario: 'usu001'
          });
          
          // Atualiza quantidade pesada
          insumo.qtdPesada = (insumo.qtdPesada || 0) + valor;
          
          salvarDados();
          renderizarOPs();
          if (document.getElementById('overlay').style.display === 'flex') {
            abrirDetalhesOP(opId);
          }
        } catch (e) {
          console.error('Erro ao processar pesagem:', e);
          alert('Erro ao processar pesagem. Tente novamente.');
        }
      }
    }
  } catch (e) {
    console.error('Erro ao abrir modal de pesagem:', e);
    alert('Erro ao abrir modal de pesagem. Tente novamente.');
  }
}

// Função para fechar overlay
function fecharOverlay() {
  try {
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    opSelecionada = null;
  } catch (e) {
    console.error('Erro ao fechar overlay:', e);
  }
}

// Função para atualizar dados
function atualizarDados() {
  try {
    // Simula atualização dos dados
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.style.transform = 'rotate(360deg)';
      refreshBtn.style.transition = 'transform 0.5s ease';
      
      setTimeout(() => {
        refreshBtn.style.transform = 'rotate(0deg)';
        renderizarOPs();
      }, 500);
    }
  } catch (e) {
    console.error('Erro ao atualizar dados:', e);
  }
}

// Função para alternar filtros
function alternarFiltro(status) {
  try {
    filtroAtual = status;
    
    // Atualiza botões de filtro
    document.querySelectorAll('.filtro-btn').forEach(btn => {
      btn.classList.remove('ativo');
    });
    
    const filtroBtn = document.querySelector(`[data-status="${status}"]`);
    if (filtroBtn) {
      filtroBtn.classList.add('ativo');
    }
    
    renderizarOPs();
  } catch (e) {
    console.error('Erro ao alternar filtro:', e);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Carrega dados salvos
    carregarDados();
    
    // Renderiza OP's iniciais
    renderizarOPs();
    
    // Adiciona listeners para filtros
    document.querySelectorAll('.filtro-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        try {
          const status = this.getAttribute('data-status');
          alternarFiltro(status);
        } catch (e) {
          console.error('Erro ao alternar filtro:', e);
        }
      });
    });
    
    // Fecha overlay ao clicar fora
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        try {
          if (e.target === this) {
            fecharOverlay();
          }
        } catch (e) {
          console.error('Erro ao fechar overlay:', e);
        }
      });
    }
    
    // Adiciona listener para abas (delegado de eventos)
    document.addEventListener('click', function(e) {
      try {
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
      } catch (e) {
        console.error('Erro ao alternar aba:', e);
      }
    });
  } catch (e) {
    console.error('Erro ao inicializar aplicação:', e);
    alert('Erro ao inicializar aplicação. Recarregue a página.');
  }
});

// Função para adicionar nova OP (para demonstração)
function adicionarNovaOP() {
  try {
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
      qtdBaixada: 0,
      execucoes: [],
      insumos: []
    };
    
    operacoes.push(novaOP);
    salvarDados();
    renderizarOPs();
  } catch (e) {
    console.error('Erro ao adicionar nova OP:', e);
    alert('Erro ao adicionar nova OP. Tente novamente.');
  }
}

// Função para mostrar memória de cálculo
function mostrarMemoriaCalculo(opId, codigoInsumo) {
  try {
    const op = operacoes.find(op => op.id === opId);
    if (!op) {
      console.error('OP não encontrada:', opId);
      return;
    }
    
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
      
      if (!overlay || !overlayBody) {
        console.error('Elementos do overlay não encontrados');
        return;
      }
      
      overlayBody.innerHTML = `
        <div class="memoria-calculo">
          <h3>Memória de Cálculo - ${insumo.descricao || 'N/A'}</h3>
          
          <div class="memoria-simples">
            <div class="peso-total">
              <span class="peso-label">Total Pesado:</span>
              <span class="peso-valor">${(insumo.qtdPesada || 0).toFixed(4)}</span>
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
  } catch (e) {
    console.error('Erro ao mostrar memória de cálculo:', e);
    alert('Erro ao mostrar memória de cálculo. Tente novamente.');
  }
}

// Função para renderizar pesos de forma simples
function renderizarPesosSimples(insumo) {
  try {
    if (!insumo.memoriaCalculo || insumo.memoriaCalculo.length === 0) {
      return '<p class="sem-pesagens">Nenhuma pesagem registrada</p>';
    }
    
    let html = '<div class="pesos-grid">';
    
    // Mostra as pesagens em ordem cronológica reversa (mais recente primeiro)
    insumo.memoriaCalculo.slice().reverse().forEach((pesagem, index) => {
      try {
        const valorClass = (pesagem.valor || 0) >= 0 ? 'peso-positivo' : 'peso-negativo';
        const sinal = (pesagem.valor || 0) >= 0 ? '+' : '';
        
        html += `
          <div class="peso-item">
            <div class="peso-numero">${index + 1}</div>
            <div class="peso-valor ${valorClass}">${sinal}${(pesagem.valor || 0).toFixed(4)}</div>
            <div class="peso-hora">${(pesagem.timestamp || '').split(' ')[1] || '-'}</div>
          </div>
        `;
      } catch (e) {
        console.error('Erro ao renderizar pesagem:', e);
        html += `
          <div class="peso-item erro">
            <div class="peso-numero">${index + 1}</div>
            <div class="peso-valor">Erro</div>
            <div class="peso-hora">-</div>
          </div>
        `;
      }
    });
    
    html += '</div>';
    return html;
  } catch (e) {
    console.error('Erro ao renderizar pesos simples:', e);
    return '<p class="erro-pesos">Erro ao renderizar pesos</p>';
  }
}

// Função para testar as funções de controle
function testarFuncoes() {
  try {
    console.log('=== TESTE DAS FUNÇÕES ===');
    console.log('Operações disponíveis:', operacoes);
    console.log('Filtro atual:', filtroAtual);
    console.log('Insumos VITAKELP:', insumosVitakelp);
    
    // Testa encontrar uma OP
    const op = operacoes.find(op => op.id === 1);
    if (op) {
      console.log('OP encontrada:', op);
      console.log('Status da OP:', op.status);
      console.log('Execuções da OP:', op.execucoes);
    } else {
      console.log('OP não encontrada');
    }
    
    // Testa filtros
    console.log('=== TESTE DOS FILTROS ===');
    const filtros = ['todos', 'aguardando', 'iniciada', 'parada', 'finalizada'];
    filtros.forEach(filtro => {
      const opsFiltradas = operacoes.filter(op => filtro === 'todos' ? true : op.status === filtro);
      console.log(`Filtro "${filtro}": ${opsFiltradas.length} OPs`);
    });
    
    console.log('=== FIM DO TESTE ===');
  } catch (e) {
    console.error('Erro no teste:', e);
  }
}

// Função para limpar dados de teste
function limparDadosTeste() {
  try {
    localStorage.removeItem('operacoes');
    location.reload();
  } catch (e) {
    console.error('Erro ao limpar dados:', e);
  }
}
