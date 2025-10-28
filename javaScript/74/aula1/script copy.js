// Elementos do DOM
const botaoPlayPause = document.getElementById("play-pause");
const audio = document.getElementById("audio-capitulo");
const botaoProximo = document.getElementById("proximo");
const botaoAnterior = document.getElementById("anterior");
const iconePlay = document.getElementById("play");
const iconePause = document.getElementById("pause");
const tituloCapitulo = document.getElementById("capitulo");

// Configuração dinâmica da playlist
let playlist = [];
let faixaAtual = 0;

// Função para detectar automaticamente arquivos MP3
async function detectarArquivosMP3() {
    // Configuração dos arquivos MP3 disponíveis
    // Para adicionar novos arquivos, simplesmente adicione-os a esta lista
    const arquivosMP3 = [
        { nome: "1.mp3", titulo: "Capítulo 1" },
        { nome: "2.mp3", titulo: "Capítulo 2" }
        // Para adicionar mais arquivos, descomente e adicione:
        // { nome: "3.mp3", titulo: "Capítulo 3" },
        // { nome: "4.mp3", titulo: "Capítulo 4" },
    ];
    
    // Gerar playlist dinamicamente
    playlist = arquivosMP3.map((arquivo, index) => ({
        arquivo: `./audios/${arquivo.nome}`,
        titulo: arquivo.titulo,
        autor: "Machado de Assis",
        indice: index
    }));
    
    console.log(`🎵 Detectados ${playlist.length} arquivos de áudio:`, playlist);
    console.log(`📁 Arquivos encontrados:`, playlist.map(f => f.arquivo));
    return playlist;
}

// Função para verificar se um arquivo existe (simulação)
async function verificarArquivoExiste(caminho) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('canplaythrough', () => resolve(true));
        audio.addEventListener('error', () => resolve(false));
        audio.src = caminho;
        audio.load();
    });
}

// Função para detectar automaticamente TODOS os arquivos MP3 (versão avançada)
async function detectarArquivosMP3Automatico() {
    const arquivosPossiveis = [];
    const maxArquivos = 20; // Limite máximo para evitar muitas requisições
    
    console.log("🔍 Procurando arquivos MP3 automaticamente...");
    
    // Tentar detectar arquivos numerados (1.mp3, 2.mp3, etc.)
    for (let i = 1; i <= maxArquivos; i++) {
        const caminho = `./audios/${i}.mp3`;
        const existe = await verificarArquivoExiste(caminho);
        
        if (existe) {
            arquivosPossiveis.push({
                nome: `${i}.mp3`,
                titulo: `Capítulo ${i}`,
                caminho: caminho
            });
        } else {
            // Se não encontrar o arquivo i, provavelmente não há mais arquivos numerados
            if (i > 5) break; // Só para se não encontrarmos nenhum arquivo após 5 tentativas
        }
    }
    
    if (arquivosPossiveis.length === 0) {
        console.log("⚠️ Nenhum arquivo MP3 detectado automaticamente, usando lista padrão");
        return await detectarArquivosMP3(); // Fallback para lista conhecida
    }
    
    playlist = arquivosPossiveis.map((arquivo, index) => ({
        arquivo: arquivo.caminho,
        titulo: arquivo.titulo,
        autor: "Machado de Assis",
        indice: index
    }));
    
    console.log(`✅ Detectados automaticamente ${playlist.length} arquivos:`, playlist);
    return playlist;
}

// Função para carregar uma faixa específica
function carregarFaixa(indice) {
    if (indice >= 0 && indice < playlist.length) {
        faixaAtual = indice;
        const faixa = playlist[faixaAtual];
        
        // Atualizar fonte do áudio
        audio.src = faixa.arquivo;
        
        // Atualizar informações da faixa
        tituloCapitulo.textContent = faixa.titulo;
        
        // Resetar controles de play/pause
        iconePlay.style.display = "block";
        iconePause.style.display = "none";
        
        // Pausar áudio atual se estiver tocando
        audio.pause();
        
        // Atualizar estado dos botões de navegação
        atualizarBotoesNavegacao();
        
        console.log(`🎵 Carregando: ${faixa.titulo} (${faixaAtual + 1}/${playlist.length})`);
        
        // Mostrar notificação visual (opcional)
        mostrarNotificacao(`${faixa.titulo} carregado`);
    }
}

// Função para mostrar notificações visuais
function mostrarNotificacao(mensagem) {
    // Criar elemento de notificação se não existir
    let notificacao = document.getElementById('notificacao');
    if (!notificacao) {
        notificacao = document.createElement('div');
        notificacao.id = 'notificacao';
        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(notificacao);
    }
    
    notificacao.textContent = mensagem;
    notificacao.style.opacity = '1';
    
    // Esconder após 2 segundos
    setTimeout(() => {
        notificacao.style.opacity = '0';
    }, 2000);
}

// Função para atualizar estado dos botões de navegação
function atualizarBotoesNavegacao() {
    // Desabilitar botão anterior se estiver na primeira faixa
    if (faixaAtual === 0) {
        botaoAnterior.style.opacity = "0.5";
        botaoAnterior.style.cursor = "not-allowed";
    } else {
        botaoAnterior.style.opacity = "1";
        botaoAnterior.style.cursor = "pointer";
    }
    
    // Desabilitar botão próximo se estiver na última faixa
    if (faixaAtual === playlist.length - 1) {
        botaoProximo.style.opacity = "0.5";
        botaoProximo.style.cursor = "not-allowed";
    } else {
        botaoProximo.style.opacity = "1";
        botaoProximo.style.cursor = "pointer";
    }
}

// Função para alternar entre play e pause
function tocarOuPausar() {
    if (audio.paused) {
        audio.play().then(() => {
            iconePlay.style.display = "none";
            iconePause.style.display = "block";
        }).catch(error => {
            console.error("Erro ao reproduzir áudio:", error);
        });
    } else {
        audio.pause();
        iconePlay.style.display = "block";
        iconePause.style.display = "none";
    }
}

// Função para próxima faixa
function proximoFaixa() {
    if (faixaAtual < playlist.length - 1) {
        carregarFaixa(faixaAtual + 1);
        // Reproduzir automaticamente a próxima faixa
        setTimeout(() => {
            tocarOuPausar();
        }, 100);
    } else {
        console.log("Já estamos na última faixa");
    }
}

// Função para faixa anterior
function anteriorFaixa() {
    if (faixaAtual > 0) {
        carregarFaixa(faixaAtual - 1);
        // Reproduzir automaticamente a faixa anterior
        setTimeout(() => {
            tocarOuPausar();
        }, 100);
    } else {
        console.log("Já estamos na primeira faixa");
    }
}
// Event listeners
botaoPlayPause.addEventListener("click", tocarOuPausar);
botaoProximo.addEventListener("click", proximoFaixa);
botaoAnterior.addEventListener("click", anteriorFaixa);

// Event listener para quando o áudio terminar
audio.addEventListener("ended", () => {
    console.log("Áudio terminou");
    proximoFaixa();
});

// Função de inicialização
async function inicializar() {
    console.log("🚀 Inicializando player de áudio...");
    
    // Tentar detecção automática primeiro, depois fallback para lista conhecida
    try {
        await detectarArquivosMP3Automatico();
    } catch (error) {
        console.log("⚠️ Detecção automática falhou, usando lista conhecida:", error);
        await detectarArquivosMP3();
    }
    
    // Carregar primeira faixa
    if (playlist.length > 0) {
        carregarFaixa(0);
        console.log(`🎵 Player inicializado com ${playlist.length} faixas disponíveis`);
    } else {
        console.log("❌ Nenhum arquivo de áudio encontrado");
    }
    
    // Inicializar com ícone de play visível e pause escondido
    iconePlay.style.display = "block";
    iconePause.style.display = "none";
}

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", inicializar);