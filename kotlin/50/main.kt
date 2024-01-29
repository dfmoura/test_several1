data class Livro(val título: String, val autor: String, val anoPublicação: Int)

fun main() {
    val livro1 = Livro("O Senhor dos Anéis", "J.R.R. Tolkien", 1954)
    val livro2 = Livro("O Senhor dos Anéis", "J.R.R. Tolkien", 1954)

    println(livro1) // Imprime: Livro(título=O Senhor dos Anéis, autor=J.R.R. Tolkien, anoPublicação=1954)

    // Comparação de igualdade com base nos valores das propriedades, não na identidade
    println(livro1 == livro2) // Imprime: true

    // Cria uma cópia com uma propriedade modificada
    val livro3 = livro1.copy(título = "O Hobbit")
    println(livro3) // Imprime: Livro(título=O Hobbit, autor=J.R.R. Tolkien, anoPublicação=1954)
}
