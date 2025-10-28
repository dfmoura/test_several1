const botaoPlayPause = document.getElementById("play-pause");
const audio = document.getElementById("audio-capitulo");
const botaoAnterior = document.getElementById("anterior");
const botaoProximo = document.getElementById("proximo");
const iconePlay = document.getElementById("play");
const iconePause = document.getElementById("pause");
const capituloElement = document.getElementById("capitulo");

let taTocando = false;
let capituloAtual = 1;
const totalCapitulos = 3; // Baseado nos arquivos de áudio disponíveis

// Função para alternar entre play e pause
function tocarOuPausar() {
    if (taTocando) {
        audio.pause();
        botaoPlayPause.classList.remove("tocando");
    } else {
        audio.play().catch(error => {
            console.error("Erro ao reproduzir áudio:", error);
            // Se houver erro, remove o estado de tocando
            botaoPlayPause.classList.remove("tocando");
            taTocando = false;
        });
        botaoPlayPause.classList.add("tocando");
    }
    taTocando = !taTocando;
}

// Event listeners
botaoPlayPause.addEventListener("click", tocarOuPausar);

// Função para trocar de capítulo
function trocarCapitulo(novoCapitulo) {
    if (novoCapitulo >= 1 && novoCapitulo <= totalCapitulos) {
        capituloAtual = novoCapitulo;
        audio.src = `./audios/${capituloAtual}.mp3`;
        capituloElement.textContent = `Capítulo ${capituloAtual}`;
        
        // Se estava tocando, continua tocando o novo capítulo
        if (taTocando) {
            audio.load(); // Recarrega o áudio
            audio.play();
        }
    }
}

// Função para o botão anterior
botaoAnterior.addEventListener("click", function() {
    if (capituloAtual > 1) {
        trocarCapitulo(capituloAtual - 1);
    }
});

// Função para o botão próximo
botaoProximo.addEventListener("click", function() {
    if (capituloAtual < totalCapitulos) {
        trocarCapitulo(capituloAtual + 1);
    }
});

// Eventos do áudio para melhorar a experiência
audio.addEventListener("ended", function() {
    // Quando o áudio terminar, volta ao estado de pause
    taTocando = false;
    botaoPlayPause.classList.remove("tocando");
});

audio.addEventListener("error", function(e) {
    console.error("Erro no áudio:", e);
    taTocando = false;
    botaoPlayPause.classList.remove("tocando");
});

// Atualizar estado quando o áudio pausar (por exemplo, se pausado por outro meio)
audio.addEventListener("pause", function() {
    taTocando = false;
    botaoPlayPause.classList.remove("tocando");
});

audio.addEventListener("play", function() {
    taTocando = true;
    botaoPlayPause.classList.add("tocando");
});