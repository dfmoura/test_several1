// Exercicios de Manipulacao de Array

//Crie uma lista de compras que é inicialmente vazia 
// Adicione 5 intens á lista usando push()
// Agora, remova o primeiro item da lista usando shift()
// Imprima a lista final no console

const criptos = [];
criptos.push("Crifrot","Beecrip","Tedcrip","Cowcrip","Suezcrip");
console.log(criptos);
criptos.shift();
console.log(criptos);

// Exercicio de Manipulação de Array - find()

// Você tem um array de números [3,7,14,21,29,36,42]
// Use a função find() para encontrar o primeiro número que eh divisivel por 7
// e maior que 10

const num = [3,7,14,21,29,36,42];
const exer = num.find((num) => (num % 7 === 0) && (num > 10));
console.log(exer);

 // Exercicio de Manipulação de Array - filter()

 // Dado o array de números: [5,10,15,20,25,30,40]
 // Use a função filter() para criar um novo array que contenha apenas os numeros
 // que são maiores que 20

 const nume = [5,10,15,20,25,30,40];
 const exerc = nume.filter(nume => nume > 20);
 console.log(exerc);

 // Exercicio de manipulacao de string - split(), trim()
 // Dada a string: "Bom dia, mundo!"
 // Remova os espaços em branco no início e no final da string
 // em seguida, divida a string em duas palavras
 const frase = " Bom dia, mundo! ";
 const palavras = frase.trim().split(" ");
 console.log(palavras);

 //Exercício de manipulação de String - strartsWith(), endsWith()
 // Dada a string: "O rato roeu a roupa do rei de Roma"
 // Verifique se a string começa com a palavra "O" e termina com a palavra "Roma"
const frase2 = "O rato roeu a roupa do rei de Roma";
console.log(frase2.startsWith("O"));
console.log(frase2.endsWith("Roma"));

