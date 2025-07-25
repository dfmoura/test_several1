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

        // Event listeners para modais
        this.setupModalEventListeners();
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

    loadInitialData() {
        // Gerar número da OP
        this.opData.numero = this.gerarNumeroOP();
        document.getElementById('op-number').textContent = this.opData.numero;

        // Definir data de criação
        const dataCriacao = new Date();
        document.getElementById('creation-date').textContent = dataCriacao.toLocaleDateString('pt-BR');
        this.opData.dataCriacao = dataCriacao;

        // Definir usuário criador (simulado)
        document.getElementById('created-by').textContent = 'João Silva';
        this.opData.criadoPor = 'João Silva';

        // Carregar dados de exemplo
        this.carregarDadosExemplo();
    }

    gerarNumeroOP() {
        const ano = new Date().getFullYear();
        const numero = Math.floor(Math.random() * 1000) + 1;
        return `OP-${ano}-${numero.toString().padStart(3, '0')}`;
    }

    carregarDadosExemplo() {
        // Produtos de exemplo
        this.opData.produtos = [
            { id: 1, codigo: 'PROD001', descricao: 'Produto A', quantidade: 100, controle: 'LOTE001' },
            { id: 2, codigo: 'PROD002', descricao: 'Produto B', quantidade: 50, controle: 'LOTE002' }
        ];

        // Atividades de exemplo
        this.opData.atividades = [
            { id: 1, sequencia: 1, atividade: 'Corte', centroTrabalho: 'CT-001 - Corte', tempoPrevisto: 120, status: 'Pendente' },
            { id: 2, sequencia: 2, atividade: 'Solda', centroTrabalho: 'CT-002 - Solda', tempoPrevisto: 180, status: 'Pendente' }
        ];

        // Materiais de exemplo
        this.opData.materiais = [
            { id: 1, codigo: 'MAT001', descricao: 'Material A', quantidadeNecessaria: 200, quantidadeConsumida: 0, controle: 'CONT001' },
            { id: 2, codigo: 'MAT002', descricao: 'Material B', quantidadeNecessaria: 150, quantidadeConsumida: 0, controle: 'CONT002' }
        ];

        this.atualizarTabelas();
    }

    setupValidation() {
        // Validação de campos obrigatórios
        const requiredFields = ['tipo-op', 'produto-acabado', 'qtd-produzir'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
        });

        // Validação de quantidade
        document.getElementById('qtd-produzir').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value <= 0) {
                this.showFieldError(e.target, 'Quantidade deve ser maior que zero');
            } else {
                this.clearFieldError(e.target);
            }
        });
    }

    validateField(field) {
        if (field.hasAttribute('required') && !field.value.trim()) {
            this.showFieldError(field, 'Campo obrigatório');
            return false;
        }
        this.clearFieldError(field);
        return true;
    }

    showFieldError(field, message) {
        field.classList.add('is-invalid');
        
        // Remover mensagem de erro existente
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }

        // Adicionar nova mensagem de erro
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
            this.autoSave();
        }, 30000);
    }

    autoSave() {
        if (this.hasChanges()) {
            this.saveToLocalStorage();
            console.log('Auto-save realizado');
        }
    }

    hasChanges() {
        // Implementar lógica para detectar mudanças
        return true;
    }

    saveToLocalStorage() {
        localStorage.setItem('opData', JSON.stringify(this.opData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('opData');
        if (saved) {
            this.opData = JSON.parse(saved);
            this.updateUI();
        }
    }

    updateTipoDependentFields() {
        const tipo = this.opData.tipo;
        
        // Mostrar/ocultar campos baseado no tipo
        const parceiroField = document.getElementById('parceiro').parentNode.parentNode;
        if (tipo === 'PT' || tipo === 'TE') {
            parceiroField.style.display = 'block';
        } else {
            parceiroField.style.display = 'none';
        }
    }

    updateSaldoOP() {
        const qtdProduzir = this.opData.quantidade;
        const saldoOP = qtdProduzir; // Lógica simplificada
        document.getElementById('saldo-op').value = saldoOP.toFixed(2);
    }

    buscarProduto(codigo) {
        // Simulação de busca de produto
        setTimeout(() => {
            const descricao = `Produto ${codigo} - Descrição detalhada`;
            document.getElementById('modal-descricao-produto').value = descricao;
        }, 500);
    }

    buscarMaterial(codigo) {
        // Simulação de busca de material
        setTimeout(() => {
            const descricao = `Material ${codigo} - Descrição detalhada`;
            document.getElementById('modal-descricao-material').value = descricao;
        }, 500);
    }

    confirmarProduto() {
        const codigo = document.getElementById('modal-codigo-produto').value;
        const descricao = document.getElementById('modal-descricao-produto').value;
        const quantidade = parseFloat(document.getElementById('modal-quantidade').value);
        const controle = document.getElementById('modal-controle').value;

        if (!codigo || !quantidade) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        const produto = {
            id: Date.now(),
            codigo: codigo,
            descricao: descricao,
            quantidade: quantidade,
            controle: controle
        };

        this.opData.produtos.push(produto);
        this.atualizarTabelaProdutos();
        this.fecharModal('modalProduto');
    }

    confirmarAtividade() {
        const sequencia = parseInt(document.getElementById('modal-sequencia').value);
        const atividade = document.getElementById('modal-atividade').value;
        const centroTrabalho = document.getElementById('modal-centro-trabalho').value;
        const tempoPrevisto = parseFloat(document.getElementById('modal-tempo-previsto').value);

        if (!sequencia || !atividade) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        const atividadeText = document.getElementById('modal-atividade').options[document.getElementById('modal-atividade').selectedIndex].text;
        const centroTrabalhoText = centroTrabalho ? document.getElementById('modal-centro-trabalho').options[document.getElementById('modal-centro-trabalho').selectedIndex].text : '';

        const atividadeObj = {
            id: Date.now(),
            sequencia: sequencia,
            atividade: atividadeText,
            centroTrabalho: centroTrabalhoText,
            tempoPrevisto: tempoPrevisto,
            status: 'Pendente'
        };

        this.opData.atividades.push(atividadeObj);
        this.atualizarTabelaAtividades();
        this.fecharModal('modalAtividade');
    }

    confirmarMaterial() {
        const codigo = document.getElementById('modal-codigo-material').value;
        const descricao = document.getElementById('modal-descricao-material').value;
        const quantidadeNecessaria = parseFloat(document.getElementById('modal-qtd-necessaria').value);
        const controle = document.getElementById('modal-controle-material').value;

        if (!codigo || !quantidadeNecessaria) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        const material = {
            id: Date.now(),
            codigo: codigo,
            descricao: descricao,
            quantidadeNecessaria: quantidadeNecessaria,
            quantidadeConsumida: 0,
            controle: controle
        };

        this.opData.materiais.push(material);
        this.atualizarTabelaMateriais();
        this.fecharModal('modalMaterial');
    }

    fecharModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        modal.hide();
        
        // Limpar campos do modal
        const modalElement = document.getElementById(modalId);
        const inputs = modalElement.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.value = '';
        });
    }

    atualizarTabelaProdutos() {
        const tbody = document.getElementById('produtos-table');
        tbody.innerHTML = '';
        
        this.opData.produtos.forEach(produto => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${produto.codigo}</td>
                <td>${produto.descricao}</td>
                <td>${produto.quantidade}</td>
                <td>${produto.controle || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="opController.removerProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    atualizarTabelaAtividades() {
        const tbody = document.getElementById('atividades-table');
        tbody.innerHTML = '';
        
        this.opData.atividades.forEach(atividade => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${atividade.sequencia}</td>
                <td>${atividade.atividade}</td>
                <td>${atividade.centroTrabalho || '-'}</td>
                <td>${atividade.tempoPrevisto || '-'}</td>
                <td><span class="badge bg-warning">${atividade.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="opController.removerAtividade(${atividade.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    atualizarTabelaMateriais() {
        const tbody = document.getElementById('materiais-table');
        tbody.innerHTML = '';
        
        this.opData.materiais.forEach(material => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${material.codigo}</td>
                <td>${material.descricao}</td>
                <td>${material.quantidadeNecessaria}</td>
                <td>${material.quantidadeConsumida}</td>
                <td>${material.controle || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="opController.removerMaterial(${material.id})">
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
    }

    removerAtividade(id) {
        this.opData.atividades = this.opData.atividades.filter(a => a.id !== id);
        this.atualizarTabelaAtividades();
    }

    removerMaterial(id) {
        this.opData.materiais = this.opData.materiais.filter(m => m.id !== id);
        this.atualizarTabelaMateriais();
    }

    iniciarOP() {
        if (this.validarCamposObrigatorios()) {
            if (confirm('Deseja realmente iniciar esta Ordem de Produção?')) {
                this.opData.status = 'A'; // A = Em Andamento
                this.atualizarStatus('Em Andamento', 'status-em-andamento');
                this.atualizarProgresso(25);
                this.opData.dataInicio = new Date();
                
                // Atualizar status das atividades
                this.opData.atividades.forEach(atividade => {
                    if (atividade.sequencia === 1) {
                        atividade.status = 'Em Andamento';
                    }
                });
                this.atualizarTabelaAtividades();
                
                alert('Ordem de Produção iniciada com sucesso!');
            }
        }
    }

    suspenderOP() {
        if (this.opData.status === 'A') {
            if (confirm('Deseja realmente suspender esta Ordem de Produção?')) {
                this.opData.status = 'S'; // S = Suspensa
                this.atualizarStatus('Suspensa', 'status-suspensa');
                alert('Ordem de Produção suspensa!');
            }
        } else {
            alert('Apenas Ordens de Produção em andamento podem ser suspensas.');
        }
    }

    cancelarOP() {
        if (confirm('Deseja realmente cancelar esta Ordem de Produção?')) {
            this.opData.status = 'C'; // C = Cancelada
            this.atualizarStatus('Cancelada', 'status-cancelada');
            alert('Ordem de Produção cancelada!');
        }
    }

    salvarOP() {
        if (this.validarCamposObrigatorios()) {
            // Simular salvamento
            this.saveToLocalStorage();
            alert('Ordem de Produção salva com sucesso!');
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
            alert('Preencha todos os campos obrigatórios');
        }

        return isValid;
    }

    atualizarStatus(texto, classe) {
        const statusBadge = document.getElementById('status-badge');
        statusBadge.textContent = texto;
        statusBadge.className = `status-badge ${classe}`;
    }

    atualizarProgresso(percentual) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressFill.style.width = `${percentual}%`;
        progressText.textContent = `${percentual}% concluído`;
    }

    updateUI() {
        // Atualizar campos do formulário com dados carregados
        if (this.opData.tipo) {
            document.getElementById('tipo-op').value = this.opData.tipo;
        }
        if (this.opData.quantidade) {
            document.getElementById('qtd-produzir').value = this.opData.quantidade;
        }
        if (this.opData.prioridade) {
            document.getElementById('prioridade').value = this.opData.prioridade;
        }

        this.atualizarTabelas();
    }

    // Métodos utilitários
    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    formatarData(data) {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    formatarTempo(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}

// Inicializar o controller quando o DOM estiver carregado
let opController;

document.addEventListener('DOMContentLoaded', function() {
    opController = new OrdemProducaoController();
});

// Exportar para uso global
window.opController = opController; 