// Exercios

//1) Crie um script que imprima "Olá, Mundo!" no console

console.log("Olá, Mundo!")

//2) Conversão de tipos, dado o valor de uma string "1234", converta-o em número e exiba o tipo da variável no console.
const meuNumero1 = "1234"
console.log("Para converter: " + meuNumero1)
console.log(typeof meuNumero1);
const meuNumeroConvertido = Number(meuNumero1)
console.log("Convertido: " + meuNumeroConvertido);
console.log(typeof meuNumeroConvertido);

//3)Dado uma string "JavaScript é incrível", escreva um código que conte quantos caracteres a string tem e quantas palavras tem na frase 
const frase = "JavaScript é incrível"
console.log("O número de caracteres é: " + frase.length)

const contarPalavras = frase.split(" ").length
console.log(`O número de palavras é: ${contarPalavras}`)

//Exercício 4: loops e arrays
// 4)Crie um array com cinco nomes. Use um loop for para imprimir

const nomes = ["diogo", "debora", "joao", "felipe", "barbara"];
for (let i = 0; i < nomes.length; i++) {
  console.log("O nome é: " + nomes[i]);

}

//Exercicio 5: Funções, Strings e Math
//Crie uma função que aceita uma string representando um horário no formato 24 horas (por exemplo, "14:30").
//A função deve retornar uma string que converta o horário para o formato de 12 horas (por exemplo, "2:30").
//Use ao objeto math para auxiliar nesta converão.
//Certifique-se de que sua função lida corretamente com horário da meia noite e meio dia.

function convertTo12HourFormat(horario) {
  var timeParts = horario.split(':');
  var hours = parseInt(timeParts[0], 10);
  var minutes = timeParts[1];
  var amPm = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) {
    hours -= 12;
  }
  if (hours === 0) {
    hours = 12;
  }
  var timeIn12HourFormat = hours + ':' + minutes + ' ' + amPm;
  return timeIn12HourFormat;
}

var horario = "19:30";
var timeIn12HourFormat = convertTo12HourFormat(horario);
console.log(timeIn12HourFormat);


function converterHorario(horario24) {
  //14:20 => hora 14, minuto = 20

  /*const hora = horario24.split(":")[0];
  const minuto = horario24.split(":")[1];*/

  const [hora, minuto] = horario24.split(":");

  // 15 /12 = 3, 23 % 12 ==11
  // Falsy 12 % 12 = 0 => 12
  const hora12 = hora % 12 || 12;

  let periodo = "AM"

  if (hora > 12){
    periodo = "PM"
  }

  console.log(`${hora12}:${minuto} ${periodo}`);
}

  converterHorario("15:15");
  converterHorario("09:28");
  converterHorario("13:00");

