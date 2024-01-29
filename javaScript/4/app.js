var isSquare = function(n){
    return false; // fix me
  }


function isSquare(n) {

    if (n < 0) {
        return false; 
    }
  
    let isSquare = Math.sqrt(n);

    
    if (isSquare === Math.floor(isSquare)) {
        return true; 
    } else {
        return false; 
    }
}

// Exemplos de uso
console.log(isSquare(16)); // true, pois a raiz quadrada de 16 é 4 (um número inteiro)
console.log(isSquare(25)); // true, pois a raiz quadrada de 25 é 5 (um número inteiro)
console.log(isSquare(10)); // false, pois a raiz quadrada de 10 não é um número inteiro
console.log(isSquare(-4)); // false, pois a raiz quadrada de um número negativo não é um número real