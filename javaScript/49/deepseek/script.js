// Configurações
const DEEPSEEK_API_KEY = 'colocar aki'; // Substitua pelo seu token
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'; // Verifique a URL atual da API
const KNOWLEDGE_FILE = 'conhecimento.json';

// Estado do chat
let knowledgeData = [];
let chatHistory = [
    { role: "system", content: "Você é um assistente útil que responde perguntas com base nos dados do conhecimento.json. Seja conciso e preciso." }
];

// Elementos da UI
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusElement = document.getElementById('status');

// Carregar conhecimento.json
async function loadKnowledgeData() {
    try {
        setStatus('Carregando base de conhecimento...');
        const response = await fetch(KNOWLEDGE_FILE);
        if (!response.ok) throw new Error('Erro ao carregar o arquivo de conhecimento');
        
        knowledgeData = await response.json();
        setStatus(`Base carregada: ${knowledgeData.length} registros`);
        
        // Adiciona resumo ao contexto do chat
        const summary = `Base de conhecimento carregada com ${knowledgeData.length} registros e ${Object.keys(knowledgeData[0] || {}).length} campos por registro.`;
        chatHistory.push({ role: "system", content: summary });
        
    } catch (error) {
        console.error('Erro ao carregar conhecimento:', error);
        setStatus('Erro ao carregar base de conhecimento', 'error');
        addMessage('bot', 'Desculpe, não consegui carregar a base de conhecimento. Algumas respostas podem ser limitadas.');
    }
}

// Enviar mensagem para a API do DeepSeek
async function sendToDeepSeek(message) {
    setStatus('Pensando...', 'loading');
    
    // Adiciona contexto dos dados relevantes
    const relevantData = findRelevantData(message);
    const contextMessage = relevantData.length > 0 
        ? `Contexto dos dados relevantes: ${JSON.stringify(relevantData.slice(0, 3))}... (${relevantData.length} itens no total)` 
        : "Nenhum dado relevante encontrado no conhecimento.json para esta pergunta.";
    
    const messages = [
        ...chatHistory,
        { role: "user", content: message },
        { role: "system", content: contextMessage }
    ];
    
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // Verifique o modelo correto
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        // Atualiza histórico do chat
        chatHistory.push(
            { role: "user", content: message },
            { role: "assistant", content: reply }
        );
        
        return reply;
        
    } catch (error) {
        console.error('Erro na API DeepSeek:', error);
        return "Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.";
    } finally {
        setStatus('Pronto para conversar');
    }
}

// Encontrar dados relevantes no conhecimento.json
function findRelevantData(query) {
    if (!knowledgeData.length) return [];
    
    // Simplificado: busca por correspondência de termos (pode ser melhorado)
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return knowledgeData.filter(item => {
        // Converte o item em string para busca
        const itemStr = JSON.stringify(item).toLowerCase();
        return queryTerms.some(term => itemStr.includes(term));
    });
}

// Adicionar mensagem ao chat
function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Atualizar status
function setStatus(text, state = '') {
    statusElement.textContent = text;
    statusElement.className = 'status';
    if (state === 'loading') {
        const loadingElement = document.createElement('span');
        loadingElement.classList.add('loading');
        statusElement.prepend(loadingElement);
    } else if (state === 'error') {
        statusElement.style.color = '#d32f2f';
    }
}

// Enviar mensagem do usuário
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    addMessage('user', message);
    userInput.value = '';
    
    const reply = await sendToDeepSeek(message);
    addMessage('bot', reply);
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Inicialização
loadKnowledgeData();    