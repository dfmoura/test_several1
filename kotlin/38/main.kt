//passar outra função como parametro para ser executada em um segundo momento
//para casos que tem uma encadeamento de chamadas muito complexo, para ser utilizado de forma mais elegante

fun calculate(x: Int, y: Int, operation: (Int, Int) -> Int): Int {  // 1
    return operation(x, y)                                          // 2
}

fun sum(x: Int, y: Int) = x + y                                     // 3

fun main() {
    val sumResult = calculate(4, 5, ::sum)                          // 4
    val mulResult = calculate(4, 5) { a, b -> a * b }               // 5 lambda de higher order funcions
    println("sumResult $sumResult, mulResult $mulResult")
}