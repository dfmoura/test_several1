class Pessoa {
    var nome: String = ""
    var idade: Int = 0

    fun saudacao() {
        println("Olá, meu nome é $nome e eu tenho $idade anos.")
    }
}

fun main() {
    val pessoa1 = Pessoa()
    pessoa1.nome = "Alice"
    pessoa1.idade = 30
    pessoa1.saudacao()

    val pessoa2 = Pessoa()
    pessoa2.nome="Diogo"
    pessoa2.idade=39
    pessoa2.saudacao()

    val pessoa3 = Pessoa()
    pessoa3.nome="Debora"
    pessoa3.idade=19
    pessoa3.saudacao()
}
