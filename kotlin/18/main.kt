// ranges - intervalos do kotlin - facil de ler
// pode ser usados em laços

fun main() {

    for(i in 0..3) {             // 1  de 0 a 3 inclusive
        print(i)
    }
    println(" ")

    for(i in 0 until 3) {        // 2 -- exclusive
        print(i)
    }
    println(" ")

    for(i in 2..8 step 2) {      // 3  -- pulando de 2 em 2
        print(i)
    }
    println(" ")

    for (i in 3 downTo 0) {      // 4  -- contagem regressiva
        print(i)
    }
    println(" ")


}