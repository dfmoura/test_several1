

data class Pais(var populacao: Double, val taxaCrescimento: Double) {
    fun crescPopulacional() {
        populacao *= (1 + taxaCrescimento / 100)
    }
}

fun main() {
    val populacaoPaisA = readLine()!!.toDouble()
    val populacaoPaisB = readLine()!!.toDouble()
    val PaisA = Pais(populacaoPaisA, taxaCrescimento = 3.0)
    val PaisB = Pais(populacaoPaisB, taxaCrescimento = 1.5)

    var anos = 0
    while (PaisA.populacao < PaisB.populacao) {
        PaisA.crescPopulacional()
        PaisB.crescPopulacional()
        anos++
    }

    println("$anos anos")
}