// fundamentos
var minhaVariavel = "Olá, mundo!";
console.log(minhaVariavel);

// variaveis e tipos de dados

var meuNumero = 10;
console.log(meuNumero);
console.log(meuNumero + 5);
console.log("10" + 5);

console.log(typeof meuNumero);

var booleano = true;

console.log(typeof booleano);

var meuObjeto = {};
var meuarray = [];
var meuNull = null;
var meuUndefined = undefined;

console.log(typeof meuObjeto);
console.log(typeof meuarray);
console.log(typeof meuNull);
console.log(typeof meuUndefined);

// let e const
// novas formas de declarar variávei...
let x = 10;
const y = 5;

console.log(typeof x);
console.log(x,y);

// operadores aritmeticos
console.log(x + y);
console.log(x - y);
console.log(x * y);
console.log(x / y);
console.log(x ** y);

// Operadores de comparação
console.log(x == y);
console.log(x != y);

console.log("5"==5);  // comparar o valor
console.log("5"===5); // comparar o tipo
console.log("5"!==5); // comparar o tipo


// Operadores lógicos
// and  &&
// or ||
console.log(10> 5 && 20 > 5);
console.log(10> 5 && 20 < 5);
console.log(10< 5 && 20 < 5);


console.log(10> 5 || 20 > 5);
console.log(10> 5 || 20 < 5);
console.log(10 < 5 || 20 < 5);

// Conversao de tipos
const meuNumero1 = "123"
const meuNumeroConvertido = Number(meuNumero1)

console.log(meuNumeroConvertido);
console.log(typeof meuNumeroConvertido);

//38:26

// Estrutura de condição - if, else, else if

const idade = 20

if(idade < 13){
    console.log("Criança")
}else if(idade<20){
    console.log("Adolescente")    
}else{
    console.log("Adulto")
}



if (true){
    console.log("Isso executa");
}else{
}

// swicht

const fruta = "Mamão"

switch(fruta){
    case "Banana":
        console.log("Banana é uma fruta!");
        break;
    case "maçã":
        console.log("Maçã é uma fruta!");
        break;
    default:
        console.log("Fruta não encontrada!");
        break;
}

//Estruturas de repetição


///contador, condição de limite, incremento

for(let i = 0;i<5;i++){
    console.log("O valor de i é: " + i);

}

// while 
let k = 0;
while(k<5){
    console.log("O valor de k é: " + k);
    k++;
}


// do while
let j = 0;

do{

    console.log("O valor de j é: " + j);
    j++;

}while(j<5);

//funcoes
//function nome(arg1,arg2){corpo}

function cumprimentar(nome){
    console.log("Olá!" + nome)
}

//invocacao funcao = nome()
cumprimentar("Diogo");


// escopo de variáveis 
let cor = "azul"; //escopo global

function mostrarCor(){ //escopo local
    let cor = "verde";
    console.log(cor);
}


console.log(cor);
mostrarCor();


// hoisting = içamento

testeHoisting();

function testeHoisting(){
    console.log("Deu certo!")
}


// arrow function

const testeArrow = () => console.log("Isso também é uma função.");
testeArrow();

// truthy e falsy
const minhaVariavel1 = "" // falsy
const minhaVariavel2 = "Algum texto"

if(minhaVariavel1){
    console.log("É verdadeiro!")
}else{
    console.log("É falso!")
}

if (minhaVariavel2){
    console.log("É verdadeiro! 2");
}else {
    console.log("É falso! 2");
}


//array, listas
const numeros = [1,2,3,4,5];
//o array começa sempre com indice 0
console.log(numeros);
console.log(numeros[0]);
console.log(numeros[3]);

numeros.push(6);
console.log(numeros);

// lembre-se que exite a estrutura prototype => pega um objeto e deriva para outro objeto
// Array => nosso array
numeros.pop()
console.log(numeros);

// strings
const minhaStringNova = "Olá, Mundo!"

//concatenção = +
const minhaString3 = minhaStringNova + " Como você esta?"
console.log(minhaString3)

// interpolação
const minhaSting4 = `${minhaStringNova} Como você esta?`
console.log(minhaSting4);

console.log(minhaSting4.length) // quantidade de caracteres
console.log(minhaSting4[5]);
console.log(minhaSting4.toUpperCase());

// Data e Hora
const agora = Date();
console.log(agora);

const natal = new Date(2023,11,25);
console.log(natal);

//Math
console.log(Math.PI);
console.log(Math.round(3.6));
console.log(Math.sqrt(16));
console.log(Math.pow(8,2));

//1:15:12
