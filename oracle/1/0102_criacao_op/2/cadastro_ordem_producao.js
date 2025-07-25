/**
 * Sistema de Cadastro de Ordem de Produção
 * Funcionalidades avançadas e validações
 */

class OrdemProducaoController {
    constructor() {
        this.opData = {
            numero: '',
            tipo: '',
            produtoAcabado: '',
            quantidade: 0,
            status: 'R', // R = Não Iniciada
            dataCriacao: new Date(),
            criadoPor: '',
            prioridade: 3,
            processo: '',
            planta: '',
            parceiro: '',
            versao: '',
            dataInicio: null,
            dataFim: null,
            tempoTotalPrevisto: 0,
            tempoTotalRealizado: 0,
            produtos: [],
            atividades: [],
            materiais: []
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupValidation();
        this.setupAutoSave();
        this.setupResponsiveHandlers();
    }

    setupEventListeners() {
        // Event listeners para campos principais
        document.getElementById('tipo-op').addEventListener('change', (e) => {
            this.opData.tipo = e.target.value;
            this.updateTipoDependentFields();
        });

        document.getElementById('qtd-produzir').addEventListener('input', (e) => {
            this.opData.quantidade = parseFloat(e.target.value) || 0;
            this.updateSaldoOP();
        });

        document.getElementById('prioridade').addEventListener('change', (e) => {
            this.opData.prioridade = parseInt(e.target.value);
        });

        // Event listeners para botões de ação
        document.getElementById('btn-iniciar').addEventListener('click', () => this.iniciarOP());
        document.getElementById('btn-suspender').addEventListener('click', () => this.suspenderOP());
        document.getElementById('btn-cancelar').addEventListener('click', () => this.cancelarOP());
        document.getElementById('btn-salvar').addEventListener('click', () => this.salvarOP());
        document.getElementById('btn-limpar').addEventListener('click', () => this.limparFormulario());

        // Event listeners para modais
        this.setupModalEventListeners();

        // Event listeners para tabs
        this.setupTabEventListeners();
    }

    setupModalEventListeners() {
        // Modal de Produto
        document.getElementById('modal-codigo-produto').addEventListener('input', (e) => {
            this.buscarProduto(e.target.value);
        });

        document.getElementById('btn-confirmar-produto').addEventListener('click', () => {
            this.confirmarProduto();
        });

        // Modal de Atividade
        document.getElementById('btn-confirmar-atividade').addEventListener('click', () => {
            this.confirmarAtividade();
        });

        // Modal de Material
        document.getElementById('modal-codigo-material').addEventListener('input', (e) => {
            this.buscarMaterial(e.target.value);
        });

        document.getElementById('btn-confirmar-material').addEventListener('click', () => {
            this.confirmarMaterial();
        });
    }

    setupTabEventListeners() {
        const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.atualizarTabelas();
            });
        });
    }

    setupResponsiveHandlers() {
        // Handler para redimensionamento da janela
        window.addEventListener('resize', () => {
            this.adjustLayoutForScreenSize();
        });

        // Handler para orientação do dispositivo
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustLayoutForScreenSize();
            }, 100);
        });
    }

    adjustLayoutForScreenSize() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;

        // Ajustar layout para mobile
        if (isMobile) {
            document.querySelectorAll('.card-body').forEach(card => {
                card.style.padding = '1rem';
            });
            
            document.querySelectorAll('.btn').forEach(btn => {
                btn.style.fontSize = '0.85rem';
                btn.style.padding = '0.5rem 1rem';
            });
        }

        // Ajustar layout para tablet
        if (isTablet) {
            document.querySelectorAll('.card-body').forEach(card => {
                card.style.padding = '1.5rem';
            });
        }

        // Ajustar layout para desktop
        if (window.innerWidth > 1024) {
            document.querySelectorAll('.card-body').forEach(card => {
                card.style.padding = '2rem';
            });
        }
    }

    loadInitialData() {
        // Gerar número da OP
        this.opData.numero = this.gerarNumeroOP();
        document.getElementById('numero-op').value = this.opData.numero;

        // Definir data de criação
        const dataCriacao = new Date();
        document.getElementById('creation-date').textContent = dataCriacao.toLocaleDateString('pt-BR');
        this.opData.dataCriacao = dataCriacao;

        // Definir usuário de criação (simulado)
        document.getElementById('creation-user').textContent = 'USUÁRIO_ATUAL';
        this.opData.criadoPor = 'USUÁRIO_ATUAL';

        // Carregar dados de exemplo
        this.carregarDadosExemplo();

        // Atualizar interface
        this.updateUI();
    }

    gerarNumeroOP() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `OP${timestamp}${random}`;
    }

    carregarDadosExemplo() {
        // Dados de exemplo para demonstração
        this.opData.produtos = [
            { id: 1, codigo: 'PROD001', descricao: 'Produto Acabado A', quantidade: 100, controle: 'LOTE001' },
            { id: 2, codigo: 'PROD002', descricao: 'Produto Acabado B', quantidade: 50, controle: 'LOTE002' }
        ];

        this.opData.atividades = [
            { id: 1, sequencia: 1, descricao: 'Montagem Inicial', centroTrabalho: 'CT001', tempoPrevisto: 120, status: 'P' },
            { id: 2, sequencia: 2, descricao: 'Teste de Qualidade', centroTrabalho: 'CT002', tempoPrevisto: 60, status: 'P' }
        ];

        this.opData.materiais = [
            { id: 1, codigo: 'MAT001', descricao: 'Material A', qtdNecessaria: 200, qtdConsumida: 0, controle: 'CONT001' },
            { id: 2, codigo: 'MAT002', descricao: 'Material B', qtdNecessaria: 150, qtdConsumida: 0, controle: 'CONT002' }
        ];

        this.atualizarTabelas();
    }

    setupValidation() {
        // Validação em tempo real para campos obrigatórios
        const requiredFields = ['tipo-op', 'produto-acabado', 'qtd-produzir'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => {
                    this.validateField(field);
                });
                
                field.addEventListener('input', () => {
                    this.clearFieldError(field);
                });
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        
        if (isRequired && !value) {
            this.showFieldError(field, 'Este campo é obrigatório');
            return false;
        }
        
        // Validações específicas
        if (field.id === 'qtd-produzir') {
            const qtd = parseFloat(value);
            if (isNaN(qtd) || qtd <= 0) {
                this.showFieldError(field, 'Quantidade deve ser maior que zero');
                return false;
            }
        }
        
        this.clearFieldError(field);
        return true;
    }

    showFieldError(field, message) {
        // Remover erro anterior
        this.clearFieldError(field);
        
        // Adicionar classe de erro
        field.classList.add('is-invalid');
        
        // Criar mensagem de erro
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    setupAutoSave() {
        // Auto-save a cada 30 segundos
        setInterval(() => {
            if (this.hasChanges()) {
                this.autoSave();
            }
        }, 30000);
    }

    autoSave() {
        this.saveToLocalStorage();
        this.showNotification('Dados salvos automaticamente', 'success');
    }

    hasChanges() {
        // Verificar se houve mudanças nos dados
        return true; // Simplificado para demonstração
    }

    saveToLocalStorage() {
        localStorage.setItem('opData', JSON.stringify(this.opData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('opData');
        if (saved) {
            this.opData = { ...this.opData, ...JSON.parse(saved) };
            this.updateUI();
        }
    }

    updateTipoDependentFields() {
        const tipo = this.opData.tipo;
        
        // Mostrar/ocultar campos baseado no tipo
        const parceiroField = document.getElementById('parceiro').parentNode;
        const plantaField = document.getElementById('planta').parentNode;
        
        if (tipo === 'PT' || tipo === 'TE') {
            parceiroField.style.display = 'block';
        } else {
            parceiroField.style.display = 'none';
        }
        
        if (tipo === 'P' || tipo === 'PC') {
            plantaField.style.display = 'block';
        } else {
            plantaField.style.display = 'none';
        }
    }

    updateSaldoOP() {
        const qtdProduzir = this.opData.quantidade;
        const qtdConsumida = this.opData.produtos.reduce((total, prod) => total + prod.quantidade, 0);
        const saldo = qtdProduzir - qtdConsumida;
        
        document.getElementById('saldo-op').value = saldo.toFixed(2);
        
        // Atualizar progresso
        const progresso = qtdProduzir > 0 ? (qtdConsumida / qtdProduzir) * 100 : 0;
        this.atualizarProgresso(progresso);
    }

    buscarProduto(codigo) {
        // Simulação de busca de produto
        const produtos = [
            { codigo: 'PROD001', descricao: 'Produto Acabado A', controle: 'LOTE001' },
            { codigo: 'PROD002', descricao: 'Produto Acabado B', controle: 'LOTE002' },
            { codigo: 'PROD003', descricao: 'Produto Acabado C', controle: 'LOTE003' }
        ];
        
        const produto = produtos.find(p => p.codigo.toLowerCase().includes(codigo.toLowerCase()));
        
        if (produto) {
            document.getElementById('modal-descricao-produto').value = produto.descricao;
            document.getElementById('modal-controle-produto').value = produto.controle;
        } else {
            document.getElementById('modal-descricao-produto').value = '';
            document.getElementById('modal-controle-produto').value = '';
        }
    }

    buscarMaterial(codigo) {
        // Simulação de busca de material
        const materiais = [
            { codigo: 'MAT001', descricao: 'Material A', controle: 'CONT001' },
            { codigo: 'MAT002', descricao: 'Material B', controle: 'CONT002' },
            { codigo: 'MAT003', descricao: 'Material C', controle: 'CONT003' }
        ];
        
        const material = materiais.find(m => m.codigo.toLowerCase().includes(codigo.toLowerCase()));
        
        if (material) {
            document.getElementById('modal-descricao-material').value = material.descricao;
        } else {
            document.getElementById('modal-descricao-material').value = '';
        }
    }

    confirmarProduto() {
        const codigo = document.getElementById('modal-codigo-produto').value;
        const descricao = document.getElementById('modal-descricao-produto').value;
        const controle = document.getElementById('modal-controle-produto').value;
        const quantidade = parseFloat(document.getElementById('qtd-produzir').value) || 0;
        
        if (!codigo || !descricao) {
            this.showNotification('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        const novoProduto = {
            id: Date.now(),
            codigo: codigo,
            descricao: descricao,
            quantidade: quantidade,
            controle: controle
        };
        
        this.opData.produtos.push(novoProduto);
        this.atualizarTabelaProdutos();
        this.fecharModal('modal-produto');
        this.showNotification('Produto adicionado com sucesso', 'success');
    }

    confirmarAtividade() {
        const sequencia = parseInt(document.getElementById('modal-sequencia-atividade').value);
        const descricao = document.getElementById('modal-descricao-atividade').value;
        const centroTrabalho = document.getElementById('modal-centro-trabalho').value;
        const tempoPrevisto = parseInt(document.getElementById('modal-tempo-previsto').value);
        const status = document.getElementById('modal-status-atividade').value;
        
        if (!sequencia || !descricao || !centroTrabalho) {
            this.showNotification('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        const novaAtividade = {
            id: Date.now(),
            sequencia: sequencia,
            descricao: descricao,
            centroTrabalho: centroTrabalho,
            tempoPrevisto: tempoPrevisto,
            status: status
        };
        
        this.opData.atividades.push(novaAtividade);
        this.atualizarTabelaAtividades();
        this.fecharModal('modal-atividade');
        this.showNotification('Atividade adicionada com sucesso', 'success');
    }

    confirmarMaterial() {
        const codigo = document.getElementById('modal-codigo-material').value;
        const descricao = document.getElementById('modal-descricao-material').value;
        const qtdNecessaria = parseFloat(document.getElementById('modal-qtd-necessaria').value) || 0;
        const controle = document.getElementById('modal-controle-material').value;
        
        if (!codigo || !descricao || qtdNecessaria <= 0) {
            this.showNotification('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        const novoMaterial = {
            id: Date.now(),
            codigo: codigo,
            descricao: descricao,
            qtdNecessaria: qtdNecessaria,
            qtdConsumida: 0,
            controle: controle
        };
        
        this.opData.materiais.push(novoMaterial);
        this.atualizarTabelaMateriais();
        this.fecharModal('modal-material');
        this.showNotification('Material adicionado com sucesso', 'success');
    }

    fecharModal(modalId) {
        const modal = document.getElementById(modalId);
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        }
        
        // Limpar campos do modal
        const inputs = modal.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type !== 'button') {
                input.value = '';
            }
        });
    }

    atualizarTabelaProdutos() {
        const tbody = document.querySelector('#tabela-produtos tbody');
        tbody.innerHTML = '';
        
        this.opData.produtos.forEach(produto => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${produto.codigo}</td>
                <td>${produto.descricao}</td>
                <td>${produto.quantidade}</td>
                <td>${produto.controle}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="opController.removerProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    atualizarTabelaAtividades() {
        const tbody = document.querySelector('#tabela-atividades tbody');
        tbody.innerHTML = '';
        
        this.opData.atividades.forEach(atividade => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${atividade.sequencia}</td>
                <td>${atividade.descricao}</td>
                <td>${atividade.centroTrabalho}</td>
                <td>${this.formatarTempo(atividade.tempoPrevisto)}</td>
                <td><span class="badge status-${this.getStatusClass(atividade.status)}">${this.getStatusText(atividade.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="opController.removerAtividade(${atividade.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    atualizarTabelaMateriais() {
        const tbody = document.querySelector('#tabela-materiais tbody');
        tbody.innerHTML = '';
        
        this.opData.materiais.forEach(material => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${material.codigo}</td>
                <td>${material.descricao}</td>
                <td>${material.qtdNecessaria}</td>
                <td>${material.qtdConsumida}</td>
                <td>${material.controle}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="opController.removerMaterial(${material.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    atualizarTabelas() {
        this.atualizarTabelaProdutos();
        this.atualizarTabelaAtividades();
        this.atualizarTabelaMateriais();
    }

    removerProduto(id) {
        this.opData.produtos = this.opData.produtos.filter(p => p.id !== id);
        this.atualizarTabelaProdutos();
        this.showNotification('Produto removido com sucesso', 'success');
    }

    removerAtividade(id) {
        this.opData.atividades = this.opData.atividades.filter(a => a.id !== id);
        this.atualizarTabelaAtividades();
        this.showNotification('Atividade removida com sucesso', 'success');
    }

    removerMaterial(id) {
        this.opData.materiais = this.opData.materiais.filter(m => m.id !== id);
        this.atualizarTabelaMateriais();
        this.showNotification('Material removido com sucesso', 'success');
    }

    iniciarOP() {
        if (!this.validarCamposObrigatorios()) {
            return;
        }
        
        this.opData.status = 'A'; // A = Em Andamento
        this.opData.dataInicio = new Date();
        
        this.atualizarStatus('Em Andamento', 'status-em-execucao');
        this.showNotification('Ordem de Produção iniciada com sucesso', 'success');
        
        // Atualizar botões
        this.updateActionButtons();
    }

    suspenderOP() {
        if (this.opData.status !== 'A') {
            this.showNotification('Apenas ordens em andamento podem ser suspensas', 'warning');
            return;
        }
        
        this.opData.status = 'S'; // S = Suspensa
        
        this.atualizarStatus('Suspensa', 'status-pendente');
        this.showNotification('Ordem de Produção suspensa', 'warning');
        
        this.updateActionButtons();
    }

    cancelarOP() {
        if (this.opData.status === 'F') {
            this.showNotification('Ordens finalizadas não podem ser canceladas', 'warning');
            return;
        }
        
        if (confirm('Tem certeza que deseja cancelar esta Ordem de Produção?')) {
            this.opData.status = 'C'; // C = Cancelada
            this.opData.dataFim = new Date();
            
            this.atualizarStatus('Cancelada', 'status-cancelada');
            this.showNotification('Ordem de Produção cancelada', 'danger');
            
            this.updateActionButtons();
        }
    }

    salvarOP() {
        if (!this.validarCamposObrigatorios()) {
            return;
        }
        
        // Simular salvamento
        this.saveToLocalStorage();
        this.showNotification('Ordem de Produção salva com sucesso', 'success');
    }

    limparFormulario() {
        if (confirm('Tem certeza que deseja limpar todos os dados?')) {
            this.opData = {
                numero: this.gerarNumeroOP(),
                tipo: '',
                produtoAcabado: '',
                quantidade: 0,
                status: 'R',
                dataCriacao: new Date(),
                criadoPor: 'USUÁRIO_ATUAL',
                prioridade: 3,
                processo: '',
                planta: '',
                parceiro: '',
                versao: '',
                dataInicio: null,
                dataFim: null,
                tempoTotalPrevisto: 0,
                tempoTotalRealizado: 0,
                produtos: [],
                atividades: [],
                materiais: []
            };
            
            this.updateUI();
            this.showNotification('Formulário limpo com sucesso', 'success');
        }
    }

    validarCamposObrigatorios() {
        const requiredFields = ['tipo-op', 'produto-acabado', 'qtd-produzir'];
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            this.showNotification('Preencha todos os campos obrigatórios', 'warning');
        }
        
        return isValid;
    }

    atualizarStatus(texto, classe) {
        const statusBadge = document.getElementById('status-badge');
        statusBadge.textContent = texto;
        statusBadge.className = `status-badge ${classe}`;
    }

    atualizarProgresso(percentual) {
        const progressBar = document.getElementById('progress-bar');
        progressBar.style.width = `${Math.min(percentual, 100)}%`;
    }

    updateActionButtons() {
        const btnIniciar = document.getElementById('btn-iniciar');
        const btnSuspender = document.getElementById('btn-suspender');
        const btnCancelar = document.getElementById('btn-cancelar');
        
        // Resetar todos os botões
        btnIniciar.disabled = false;
        btnSuspender.disabled = false;
        btnCancelar.disabled = false;
        
        // Configurar baseado no status
        switch (this.opData.status) {
            case 'R': // Não Iniciada
                btnIniciar.disabled = false;
                btnSuspender.disabled = true;
                btnCancelar.disabled = false;
                break;
            case 'A': // Em Andamento
                btnIniciar.disabled = true;
                btnSuspender.disabled = false;
                btnCancelar.disabled = false;
                break;
            case 'S': // Suspensa
                btnIniciar.disabled = false;
                btnSuspender.disabled = true;
                btnCancelar.disabled = false;
                break;
            case 'F': // Finalizada
            case 'C': // Cancelada
                btnIniciar.disabled = true;
                btnSuspender.disabled = true;
                btnCancelar.disabled = true;
                break;
        }
    }

    updateUI() {
        // Atualizar campos do formulário
        document.getElementById('numero-op').value = this.opData.numero;
        document.getElementById('tipo-op').value = this.opData.tipo;
        document.getElementById('produto-acabado').value = this.opData.produtoAcabado;
        document.getElementById('qtd-produzir').value = this.opData.quantidade;
        document.getElementById('prioridade').value = this.opData.prioridade;
        document.getElementById('processo').value = this.opData.processo;
        document.getElementById('planta').value = this.opData.planta;
        document.getElementById('parceiro').value = this.opData.parceiro;
        document.getElementById('versao').value = this.opData.versao;
        
        // Atualizar datas
        if (this.opData.dataInicio) {
            document.getElementById('data-inicio').value = this.formatarDataParaInput(this.opData.dataInicio);
        }
        if (this.opData.dataFim) {
            document.getElementById('data-fim').value = this.formatarDataParaInput(this.opData.dataFim);
        }
        
        // Atualizar tempos
        document.getElementById('tempo-previsto').textContent = this.formatarTempo(this.opData.tempoTotalPrevisto);
        document.getElementById('tempo-realizado').textContent = this.formatarTempo(this.opData.tempoTotalRealizado);
        
        // Atualizar status
        const statusMap = {
            'R': { texto: 'Não Iniciada', classe: 'status-pendente' },
            'A': { texto: 'Em Andamento', classe: 'status-em-execucao' },
            'S': { texto: 'Suspensa', classe: 'status-pendente' },
            'F': { texto: 'Finalizada', classe: 'status-finalizada' },
            'C': { texto: 'Cancelada', classe: 'status-cancelada' }
        };
        
        const status = statusMap[this.opData.status];
        if (status) {
            this.atualizarStatus(status.texto, status.classe);
        }
        
        // Atualizar botões
        this.updateActionButtons();
        
        // Atualizar tabelas
        this.atualizarTabelas();
    }

    getStatusClass(status) {
        const statusMap = {
            'P': 'pendente',
            'E': 'em-execucao',
            'F': 'finalizada',
            'C': 'cancelada'
        };
        return statusMap[status] || 'pendente';
    }

    getStatusText(status) {
        const statusMap = {
            'P': 'Pendente',
            'E': 'Em Execução',
            'F': 'Finalizada',
            'C': 'Cancelada'
        };
        return statusMap[status] || 'Pendente';
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    formatarData(data) {
        return new Intl.DateTimeFormat('pt-BR').format(data);
    }

    formatarDataParaInput(data) {
        const d = new Date(data);
        return d.toISOString().slice(0, 16);
    }

    formatarTempo(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}

// Inicializar o controller quando o DOM estiver pronto
let opController;

document.addEventListener('DOMContentLoaded', function() {
    opController = new OrdemProducaoController();
    
    // Adicionar tooltips do Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Adicionar popovers do Bootstrap
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}); 