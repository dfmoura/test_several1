// Configurações da API DeepSeek
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = "colocar aki"; // Substitua pela sua chave real

// Carrega o conhecimento do arquivo JSON
let conhecimento = {};

async function carregarConhecimento() {
    try {
        const response = await fetch('conhecimento.json');
        conhecimento = await response.json();
        adicionarMensagemBot("Olá! Sou um assistente virtual integrado com o DeepSeek. Como posso te ajudar hoje?");
    } catch (error) {
        console.error("Erro ao carregar o conhecimento:", error);
        adicionarMensagemBot("Desculpe, houve um problema ao carregar meu conhecimento.");
    }
}

// Função para enviar mensagem para a API do DeepSeek
async function enviarParaDeepSeek(mensagem, contexto) {
    try {
        const prompt = `Com base no seguinte contexto JSON: ${JSON.stringify(contexto)}, responda: ${mensagem}`;
        
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "Você é um assistente útil que responde perguntas com base no contexto JSON fornecido."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Erro ao chamar a API DeepSeek:", error);
        return "Desculpe, estou tendo problemas para me conectar ao serviço. Por favor, tente novamente mais tarde.";
    }
}

// Funções para adicionar mensagens (mantidas iguais)
function adicionarMensagemUsuario(mensagem) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message');
    messageElement.textContent = mensagem;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function adicionarMensagemBot(mensagem) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'bot-message');
    messageElement.textContent = mensagem;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Processa a pergunta - agora integrado com DeepSeek
async function processarPergunta(pergunta) {
    // Primeiro tenta encontrar no conhecimento local
    const perguntaLower = pergunta.toLowerCase();
    
    for (const topico in conhecimento) {
        for (const perguntaConhecimento in conhecimento[topico]) {
            if (perguntaLower.includes(perguntaConhecimento.toLowerCase())) {
                return conhecimento[topico][perguntaConhecimento];
            }
        }
    }
    
    // Se não encontrar localmente, consulta o DeepSeek
    try {
        adicionarMensagemBot("Consultando minha base de conhecimento...");
        const resposta = await enviarParaDeepSeek(pergunta, conhecimento);
        return resposta;
    } catch (error) {
        console.error("Erro ao processar pergunta:", error);
        return "Desculpe, não consegui encontrar uma resposta adequada. Poderia reformular sua pergunta?";
    }
}

// Configuração dos eventos (mantida igual)
document.addEventListener('DOMContentLoaded', () => {
    carregarConhecimento();
    
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    sendButton.addEventListener('click', async () => {
        const mensagem = userInput.value.trim();
        if (mensagem) {
            adicionarMensagemUsuario(mensagem);
            userInput.value = '';
            const resposta = await processarPergunta(mensagem);
            adicionarMensagemBot(resposta);
        }
    });
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });
});