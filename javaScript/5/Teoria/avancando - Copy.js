//Avançando

// Manipulação de arrays

const fruta = ["Maçã", "Laranja"];

fruta.unshift("Acerola");

console.log(fruta);

fruta.shift();

console.log(fruta);

// map, filter, reduce -> arrow function

const numeros = [1, 2, 3, 4, 5, 6];

// find => retorna somente o primeiro elemento do criterio
const numeroPar = numeros.find((num) => num % 2 === 0);

console.log(numeroPar);

// filter => retorna todos os elementos que batem com meu criterio
const numerosPares = numeros.filter((num) => num % 2 === 0);

console.log(numerosPares);

// Manipulação de strings
const frase = "Olá mundo!  ";


const palavras = frase.trim().split(" ");
console.log(frase);
console.log(palavras);
const palavras2 = frase.trim(" ");
console.log(frase);
console.log(palavras2);
const palavras1 = frase.split(" ");
console.log(frase);
console.log(palavras1);

const frase2 = "JavaScript é incrível!"
console.log(frase2.startsWith("Java"));
console.log(frase2.endsWith("!"));

//Exceções e tratamento de erros
const idade = 15;
/* if (idade < 18) {
    throw new Error("Você deve ter pelo menos 18 anos!");
}*/

try {
    const idade = 15;

    if (idade < 18) {
        throw new Error("Você deve ter pelo menos 18 anos!");
    }
} catch (error) {
    console.log(error.message);
}

console.log("continuando o programa...");


/* // Callback => funcao
function cumprimentar(nome,callback){
    console.log("Olá, " + nome);
    callback();
}

function mostrarSaudacao(){
    console.log("Como você está?");
}

cumprimentar("Diogo",mostrarSaudacao);

cumprimentar("Debora",function(){
    console.log("Tá tudo bem?");
});

// settimeout => depois de um tempo excecuta algo, uma vez
function mostrarMensagem(){
    console.log("Essa mensagem será exibida após 3 segundos.")
}

//1000ms = 1s
setTimeout(mostrarMensagem, 3000);

setTimeout(function(){
    console.log("Oi");
},1000); */

// Promises

const promessa = new Promise((resolve, reject) => {

    const condicao = true

    if (condicao) {
        resolve("A condição é verdadeira!");
    } else {
        reject("A condição é false!");
    }
});

promessa.then((mensagem) => {
    console.log(mensagem);
})
    .catch((erro) => {
        console.log(erro);
    });

// Bibliotecas feitas que são "promise based"

const promise1 = Promise.resolve(3);
const promise2 = new Promise((resolve, reject) => {
    setTimeout(resolve, 2500, "testando");
});

Promise.all([promise1, promise2]).then((valores) => console.log(valores));




//Async Await
async function obterValor() {
    const promessa = new Promise((resolve, reject) => {
        setTimeout(() => resolve("Valor obtido"), 2000);
    });

    const valor = await promessa;

    console.log(valor);
}

obterValor();

async function obterValorComErro() {
    try {
        const promessa = new Promise((resolve, reject) => {
            setTimeout(() => reject("Valor com erro"), 2000);
        });

        const valor = await promessa;

        console.log(valor);
    } catch (error) {
        console.log(error);
    }

}

obterValorComErro();

// JSON (JavaScript Object Notation)

// {nome: "teste"} => {"nome": "teste"}
// Padroniza a comunicação
// front-end e back-end em uma linguagem só
const objeto = { nome: "João", idade: 30 };

const jsonString = JSON.stringify(objeto);

console.log(jsonString);
console.log(typeof jsonString);

const json = '{"nome": "João","idade":30}';

const objeto2 = JSON.parse(json);

console.log(objeto2);