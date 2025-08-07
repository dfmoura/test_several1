// Configuração do banco de dados PostgreSQL
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'sistema_solicitacoes',
    user: 'postgres',
    password: 'postgres'
};

// Estado global da aplicação
let currentUser = null;
let empresas = [];
let usuarios = [];
let solicitacoes = [];

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadEmpresas();
});

// Inicialização da aplicação
function initializeApp() {
    // Verificar se há usuário logado
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showScreen('dashboard-screen');
        updateUserInfo();
        loadSolicitacoes();
    } else {
        showScreen('login-screen');
    }
}

// Configuração dos event listeners
function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-cadastro-empresa').addEventListener('click', () => showScreen('cadastro-empresa-screen'));
    document.getElementById('btn-cadastro-usuario').addEventListener('click', () => showScreen('cadastro-usuario-screen'));
    
    // Cadastros
    document.getElementById('empresa-form').addEventListener('submit', handleCadastroEmpresa);
    document.getElementById('usuario-form').addEventListener('submit', handleCadastroUsuario);
    document.getElementById('btn-voltar-empresa').addEventListener('click', () => showScreen('login-screen'));
    document.getElementById('btn-voltar-usuario').addEventListener('click', () => showScreen('login-screen'));
    
    // Dashboard
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-solicitacoes').addEventListener('click', () => showContentArea('solicitacoes-area'));
    document.getElementById('btn-nova-solicitacao').addEventListener('click', () => showContentArea('nova-solicitacao-area'));
    document.getElementById('btn-execucao').addEventListener('click', () => showContentArea('execucao-area'));
    
    // Nova solicitação
    document.getElementById('solicitacao-form').addEventListener('submit', handleNovaSolicitacao);
    document.getElementById('btn-cancelar-solicitacao').addEventListener('click', () => showContentArea('solicitacoes-area'));
    
    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-solicitacao');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Funções de navegação
function showScreen(screenId) {
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar a tela solicitada
    document.getElementById(screenId).classList.add('active');
    
    // Carregar dados específicos da tela
    if (screenId === 'dashboard-screen') {
        loadSolicitacoes();
        updateUserInfo();
    } else if (screenId === 'cadastro-usuario-screen') {
        loadEmpresasForSelect();
    }
}

function showContentArea(areaId) {
    // Desativar todos os botões de navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Ativar o botão correspondente
    const btnId = areaId.replace('-area', '');
    const btn = document.getElementById(`btn-${btnId}`);
    if (btn) btn.classList.add('active');
    
    // Esconder todas as áreas de conteúdo
    document.querySelectorAll('.content-area').forEach(area => {
        area.classList.remove('active');
    });
    
    // Mostrar a área solicitada
    document.getElementById(areaId).classList.add('active');
    
    // Carregar dados específicos
    if (areaId === 'execucao-area') {
        loadSolicitacoesExecucao();
    }
}

// Funções de autenticação
async function handleLogin(event) {
    event.preventDefault();
    
    const empresa = document.getElementById('empresa').value;
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    
    try {
        const user = await authenticateUser(empresa, usuario, senha);
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            showScreen('dashboard-screen');
            loadSolicitacoes();
            updateUserInfo();
        } else {
            alert('Usuário ou senha inválidos!');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login. Tente novamente.');
    }
}

async function authenticateUser(empresa, usuario, senha) {
    // Simulação de autenticação - em produção, isso seria uma chamada para o backend
    const user = usuarios.find(u => 
        u.empresa === empresa && 
        u.login === usuario && 
        u.senha === senha
    );
    
    if (user) {
        return {
            id: user.id,
            nome: user.nome,
            email: user.email,
            tipo: user.tipo,
            empresa: user.empresa
        };
    }
    
    return null;
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showScreen('login-screen');
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.nome;
    }
}

// Funções de cadastro
async function handleCadastroEmpresa(event) {
    event.preventDefault();
    
    const empresa = {
        nome: document.getElementById('nome-empresa').value,
        cnpj: document.getElementById('cnpj-empresa').value,
        email: document.getElementById('email-empresa').value,
        telefone: document.getElementById('telefone-empresa').value
    };
    
    try {
        await saveEmpresa(empresa);
        alert('Empresa cadastrada com sucesso!');
        showScreen('login-screen');
        loadEmpresas();
    } catch (error) {
        console.error('Erro ao cadastrar empresa:', error);
        alert('Erro ao cadastrar empresa. Tente novamente.');
    }
}

async function handleCadastroUsuario(event) {
    event.preventDefault();
    
    const usuario = {
        empresa: document.getElementById('empresa-usuario').value,
        nome: document.getElementById('nome-usuario').value,
        email: document.getElementById('email-usuario').value,
        login: document.getElementById('login-usuario').value,
        senha: document.getElementById('senha-usuario').value,
        tipo: document.getElementById('tipo-usuario').value
    };
    
    try {
        await saveUsuario(usuario);
        alert('Usuário cadastrado com sucesso!');
        showScreen('login-screen');
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        alert('Erro ao cadastrar usuário. Tente novamente.');
    }
}

// Funções de dados
async function loadEmpresas() {
    try {
        // Em produção, isso seria uma chamada para o backend
        empresas = JSON.parse(localStorage.getItem('empresas') || '[]');
        updateEmpresasSelect();
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

function loadEmpresasForSelect() {
    const select = document.getElementById('empresa-usuario');
    select.innerHTML = '<option value="">Selecione uma empresa</option>';
    
    empresas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.nome;
        option.textContent = empresa.nome;
        select.appendChild(option);
    });
}

function updateEmpresasSelect() {
    const select = document.getElementById('empresa');
    select.innerHTML = '<option value="">Selecione uma empresa</option>';
    
    empresas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.nome;
        option.textContent = empresa.nome;
        select.appendChild(option);
    });
}

async function saveEmpresa(empresa) {
    // Em produção, isso seria uma chamada para o backend
    empresa.id = Date.now();
    empresas.push(empresa);
    localStorage.setItem('empresas', JSON.stringify(empresas));
}

async function saveUsuario(usuario) {
    // Em produção, isso seria uma chamada para o backend
    usuario.id = Date.now();
    usuarios.push(usuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

// Funções de solicitações
async function loadSolicitacoes() {
    try {
        // Em produção, isso seria uma chamada para o backend
        solicitacoes = JSON.parse(localStorage.getItem('solicitacoes') || '[]');
        
        if (currentUser.tipo === 'solicitante') {
            displaySolicitacoes(solicitacoes.filter(s => s.solicitante === currentUser.id));
        } else {
            displaySolicitacoes(solicitacoes);
        }
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
    }
}

async function loadSolicitacoesExecucao() {
    try {
        const solicitacoesExecucao = solicitacoes.filter(s => 
            s.status === 'aprovada' || s.status === 'em-execucao'
        );
        displaySolicitacoesExecucao(solicitacoesExecucao);
    } catch (error) {
        console.error('Erro ao carregar solicitações de execução:', error);
    }
}

function displaySolicitacoes(solicitacoesList) {
    const container = document.getElementById('solicitacoes-list');
    container.innerHTML = '';
    
    if (solicitacoesList.length === 0) {
        container.innerHTML = '<p>Nenhuma solicitação encontrada.</p>';
        return;
    }
    
    solicitacoesList.forEach(solicitacao => {
        const card = createSolicitacaoCard(solicitacao);
        container.appendChild(card);
    });
}

function displaySolicitacoesExecucao(solicitacoesList) {
    const container = document.getElementById('execucao-list');
    container.innerHTML = '';
    
    if (solicitacoesList.length === 0) {
        container.innerHTML = '<p>Nenhuma solicitação para execução.</p>';
        return;
    }
    
    solicitacoesList.forEach(solicitacao => {
        const card = createSolicitacaoExecucaoCard(solicitacao);
        container.appendChild(card);
    });
}

function createSolicitacaoCard(solicitacao) {
    const card = document.createElement('div');
    card.className = 'solicitacao-card';
    
    const statusClass = `status-${solicitacao.status.replace(' ', '-')}`;
    const prioridadeClass = `prioridade-${solicitacao.prioridade}`;
    
    card.innerHTML = `
        <h3>${solicitacao.titulo}</h3>
        <p>${solicitacao.descricao}</p>
        <div class="solicitacao-meta">
            <span class="solicitacao-status ${statusClass}">${solicitacao.status}</span>
            <span class="solicitacao-prioridade ${prioridadeClass}">${solicitacao.prioridade}</span>
        </div>
        <div class="solicitacao-meta">
            <small>Área: ${solicitacao.area}</small>
            <small>Data: ${new Date(solicitacao.data).toLocaleDateString()}</small>
        </div>
        ${solicitacao.custo ? `
        <div class="custo-prazo">
            <h4>Proposta de Custo e Prazo</h4>
            <div class="custo-prazo-item">
                <span>Custo:</span>
                <strong>R$ ${solicitacao.custo.toFixed(2)}</strong>
            </div>
            <div class="custo-prazo-item">
                <span>Prazo:</span>
                <strong>${solicitacao.prazo} dias</strong>
            </div>
        </div>
        ` : ''}
        <div class="solicitacao-actions">
            <button class="btn-small btn-view" onclick="viewSolicitacao(${solicitacao.id})">Ver Detalhes</button>
            ${currentUser.tipo === 'solicitante' ? `
                <button class="btn-small btn-edit" onclick="editSolicitacao(${solicitacao.id})">Editar</button>
                <button class="btn-small btn-delete" onclick="deleteSolicitacao(${solicitacao.id})">Excluir</button>
            ` : ''}
        </div>
    `;
    
    return card;
}

function createSolicitacaoExecucaoCard(solicitacao) {
    const card = document.createElement('div');
    card.className = 'solicitacao-card';
    
    const statusClass = `status-${solicitacao.status.replace(' ', '-')}`;
    const prioridadeClass = `prioridade-${solicitacao.prioridade}`;
    
    card.innerHTML = `
        <h3>${solicitacao.titulo}</h3>
        <p>${solicitacao.descricao}</p>
        <div class="solicitacao-meta">
            <span class="solicitacao-status ${statusClass}">${solicitacao.status}</span>
            <span class="solicitacao-prioridade ${prioridadeClass}">${solicitacao.prioridade}</span>
        </div>
        <div class="solicitacao-meta">
            <small>Área: ${solicitacao.area}</small>
            <small>Data: ${new Date(solicitacao.data).toLocaleDateString()}</small>
        </div>
        ${solicitacao.custo ? `
        <div class="custo-prazo">
            <h4>Proposta de Custo e Prazo</h4>
            <div class="custo-prazo-item">
                <span>Custo:</span>
                <strong>R$ ${solicitacao.custo.toFixed(2)}</strong>
            </div>
            <div class="custo-prazo-item">
                <span>Prazo:</span>
                <strong>${solicitacao.prazo} dias</strong>
            </div>
        </div>
        ` : ''}
        <div class="solicitacao-actions">
            <button class="btn-small btn-view" onclick="viewSolicitacao(${solicitacao.id})">Ver Detalhes</button>
            ${solicitacao.status === 'aprovada' ? `
                <button class="btn-small btn-edit" onclick="iniciarExecucao(${solicitacao.id})">Iniciar Execução</button>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Funções de CRUD de solicitações
async function handleNovaSolicitacao(event) {
    event.preventDefault();
    
    const solicitacao = {
        id: Date.now(),
        titulo: document.getElementById('titulo-solicitacao').value,
        descricao: document.getElementById('descricao-solicitacao').value,
        prioridade: document.getElementById('prioridade-solicitacao').value,
        area: document.getElementById('area-solicitacao').value,
        solicitante: currentUser.id,
        data: new Date().toISOString(),
        status: 'pendente',
        custo: null,
        prazo: null
    };
    
    try {
        await saveSolicitacao(solicitacao);
        alert('Solicitação enviada com sucesso!');
        document.getElementById('solicitacao-form').reset();
        showContentArea('solicitacoes-area');
        loadSolicitacoes();
    } catch (error) {
        console.error('Erro ao enviar solicitação:', error);
        alert('Erro ao enviar solicitação. Tente novamente.');
    }
}

async function saveSolicitacao(solicitacao) {
    // Em produção, isso seria uma chamada para o backend
    solicitacoes.push(solicitacao);
    localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
}

function viewSolicitacao(id) {
    const solicitacao = solicitacoes.find(s => s.id === id);
    if (!solicitacao) return;
    
    const modal = document.getElementById('modal-solicitacao');
    const content = document.getElementById('modal-content');
    
    const statusClass = `status-${solicitacao.status.replace(' ', '-')}`;
    const prioridadeClass = `prioridade-${solicitacao.prioridade}`;
    
    content.innerHTML = `
        <h2>${solicitacao.titulo}</h2>
        <div class="solicitacao-meta">
            <span class="solicitacao-status ${statusClass}">${solicitacao.status}</span>
            <span class="solicitacao-prioridade ${prioridadeClass}">${solicitacao.prioridade}</span>
        </div>
        <p><strong>Descrição:</strong></p>
        <p>${solicitacao.descricao}</p>
        <p><strong>Área:</strong> ${solicitacao.area}</p>
        <p><strong>Data de Criação:</strong> ${new Date(solicitacao.data).toLocaleDateString()}</p>
        
        ${solicitacao.custo ? `
        <div class="custo-prazo">
            <h4>Proposta de Custo e Prazo</h4>
            <div class="custo-prazo-item">
                <span>Custo:</span>
                <strong>R$ ${solicitacao.custo.toFixed(2)}</strong>
            </div>
            <div class="custo-prazo-item">
                <span>Prazo:</span>
                <strong>${solicitacao.prazo} dias</strong>
            </div>
        </div>
        ` : ''}
        
        ${currentUser.tipo === 'solicitante' && solicitacao.status === 'pendente' && solicitacao.custo ? `
        <div class="aprovacao-buttons">
            <button class="btn-aprovar" onclick="aprovarSolicitacao(${solicitacao.id})">Aprovar</button>
            <button class="btn-rejeitar" onclick="rejeitarSolicitacao(${solicitacao.id})">Rejeitar</button>
        </div>
        ` : ''}
        
        ${currentUser.tipo === 'executante' && solicitacao.status === 'pendente' ? `
        <div class="custo-prazo">
            <h4>Definir Custo e Prazo</h4>
            <div class="form-group">
                <label for="custo-proposta">Custo (R$):</label>
                <input type="number" id="custo-proposta" step="0.01" required>
            </div>
            <div class="form-group">
                <label for="prazo-proposta">Prazo (dias):</label>
                <input type="number" id="prazo-proposta" required>
            </div>
            <button class="btn-primary" onclick="definirCustoPrazo(${solicitacao.id})">Definir Proposta</button>
        </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal-solicitacao').style.display = 'none';
}

function editSolicitacao(id) {
    const solicitacao = solicitacoes.find(s => s.id === id);
    if (!solicitacao || solicitacao.status !== 'pendente') {
        alert('Só é possível editar solicitações pendentes.');
        return;
    }
    
    // Preencher o formulário com os dados da solicitação
    document.getElementById('titulo-solicitacao').value = solicitacao.titulo;
    document.getElementById('descricao-solicitacao').value = solicitacao.descricao;
    document.getElementById('prioridade-solicitacao').value = solicitacao.prioridade;
    document.getElementById('area-solicitacao').value = solicitacao.area;
    
    // Mudar para a tela de nova solicitação
    showContentArea('nova-solicitacao-area');
    
    // Atualizar o formulário para modo de edição
    const form = document.getElementById('solicitacao-form');
    form.dataset.editId = id;
    
    // Mudar o texto do botão
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Atualizar Solicitação';
}

function deleteSolicitacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) {
        return;
    }
    
    const index = solicitacoes.findIndex(s => s.id === id);
    if (index !== -1) {
        solicitacoes.splice(index, 1);
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        loadSolicitacoes();
        alert('Solicitação excluída com sucesso!');
    }
}

function aprovarSolicitacao(id) {
    const solicitacao = solicitacoes.find(s => s.id === id);
    if (solicitacao) {
        solicitacao.status = 'aprovada';
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        closeModal();
        loadSolicitacoes();
        alert('Solicitação aprovada com sucesso!');
    }
}

function rejeitarSolicitacao(id) {
    const solicitacao = solicitacoes.find(s => s.id === id);
    if (solicitacao) {
        solicitacao.status = 'rejeitada';
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        closeModal();
        loadSolicitacoes();
        alert('Solicitação rejeitada.');
    }
}

function definirCustoPrazo(id) {
    const custo = parseFloat(document.getElementById('custo-proposta').value);
    const prazo = parseInt(document.getElementById('prazo-proposta').value);
    
    if (!custo || !prazo) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    
    const solicitacao = solicitacoes.find(s => s.id === id);
    if (solicitacao) {
        solicitacao.custo = custo;
        solicitacao.prazo = prazo;
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        closeModal();
        loadSolicitacoes();
        alert('Custo e prazo definidos com sucesso!');
    }
}

function iniciarExecucao(id) {
    const solicitacao = solicitacoes.find(s => s.id === id);
    if (solicitacao) {
        solicitacao.status = 'em-execucao';
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        loadSolicitacoes();
        loadSolicitacoesExecucao();
        alert('Execução iniciada com sucesso!');
    }
}

// Funções de integração com PostgreSQL (para implementação futura)
async function connectToDatabase() {
    // Implementação da conexão com PostgreSQL
    // Esta função seria implementada com uma biblioteca como 'pg' no Node.js
    console.log('Conectando ao PostgreSQL...');
}

async function executeQuery(query, params = []) {
    // Implementação de execução de queries
    // Esta função seria implementada com uma biblioteca como 'pg' no Node.js
    console.log('Executando query:', query, params);
}

// Inicializar dados de exemplo se não existirem
function initializeSampleData() {
    if (!localStorage.getItem('empresas')) {
        const sampleEmpresas = [
            { id: 1, nome: 'Empresa A', cnpj: '12.345.678/0001-90', email: 'contato@empresaa.com', telefone: '(11) 1234-5678' },
            { id: 2, nome: 'Empresa B', cnpj: '98.765.432/0001-10', email: 'contato@empresab.com', telefone: '(11) 8765-4321' }
        ];
        localStorage.setItem('empresas', JSON.stringify(sampleEmpresas));
    }
    
    if (!localStorage.getItem('usuarios')) {
        const sampleUsuarios = [
            { id: 1, empresa: 'Empresa A', nome: 'João Silva', email: 'joao@empresaa.com', login: 'joao', senha: '123456', tipo: 'solicitante' },
            { id: 2, empresa: 'Empresa A', nome: 'Maria Santos', email: 'maria@empresaa.com', login: 'maria', senha: '123456', tipo: 'executante' },
            { id: 3, empresa: 'Empresa B', nome: 'Pedro Costa', email: 'pedro@empresab.com', login: 'pedro', senha: '123456', tipo: 'solicitante' }
        ];
        localStorage.setItem('usuarios', JSON.stringify(sampleUsuarios));
    }
    
    if (!localStorage.getItem('solicitacoes')) {
        const sampleSolicitacoes = [
            {
                id: 1,
                titulo: 'Sistema de Gestão de Vendas',
                descricao: 'Desenvolvimento de um sistema completo para gestão de vendas com relatórios e dashboards.',
                prioridade: 'alta',
                area: 'Vendas',
                solicitante: 1,
                data: new Date().toISOString(),
                status: 'pendente',
                custo: null,
                prazo: null
            },
            {
                id: 2,
                titulo: 'App Mobile para Clientes',
                descricao: 'Criação de aplicativo mobile para clientes acessarem seus dados e fazerem pedidos.',
                prioridade: 'urgente',
                area: 'TI',
                solicitante: 3,
                data: new Date().toISOString(),
                status: 'aprovada',
                custo: 15000.00,
                prazo: 45
            }
        ];
        localStorage.setItem('solicitacoes', JSON.stringify(sampleSolicitacoes));
    }
}

// Inicializar dados de exemplo
initializeSampleData(); 