const botaoPlayPause = document.getElementById("play-pause");
const botaoProximoCapitulo = document.getElementById("proximo");
const botaocapituloAnterior = document.getElementById("anterior");
const audio = document.getElementById("audio-capitulo");
const textoCapitulo = document.getElementById("capitulo");
const qtdCapitulos = 10;
//console.log(audio);
let taTocando = false;
let capituloAtual = 1;

function tocarFaixa() {
  console.log("clicou!");
  audio.play();
  taTocando = true;
  console.log("Deu play!");
  botaoPlayPause.classList.add("tocando");
}

function pausarFaixa() {
  console.log("clicou!");
  audio.pause();
  taTocando = false;
  console.log("Deu pause!");
  botaoPlayPause.classList.remove("tocando");
}

function tocarOuPausar() {
  if (taTocando === true) {
    pausarFaixa();
  } else {
    tocarFaixa();
  }
}


function capituloAnterior() {
    pausarFaixa();
  
    if (capituloAtual === 1) {
      capituloAtual = qtdCapitulos;
    } else {
      capituloAtual -= 1;
    }
    audio.src = "/audios/" + capituloAtual + ".mp3";
    capitulo.innerText = "Capítulo " + capituloAtual;
  }

function proximoCapitulo() {
    pausarFaixa();
  if (capituloAtual < qtdCapitulos) {
    capituloAtual += 1;
  } else {
    capituloAtual = 1;
  }
  audio.src = "/audios/" + capituloAtual + ".mp3";
  capitulo.innerText = "Capítulo " + capituloAtual;
}



botaoPlayPause.addEventListener("click", tocarOuPausar);
botaoProximoCapitulo.addEventListener("click", proximoCapitulo);
botaocapituloAnterior.addEventListener("click", capituloAnterior);
