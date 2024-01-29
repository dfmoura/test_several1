data class Estudante(val codigo: Int, val nome: String, val idade: Int, val tempoProva5Km: Double)

enum class Nivel {
    INICIANTE, INTERMEDIARIO, AVANCADO, BRIGADEIRO
}

enum class Disciplina(val niveisPermitidos: List<Nivel>) {
    CORREDOR_ESCALADOR(listOf(Nivel.INICIANTE, Nivel.INTERMEDIARIO, Nivel.AVANCADO, Nivel.BRIGADEIRO)),
    CORREDOR_PANTANOSO(listOf(Nivel.INICIANTE, Nivel.INTERMEDIARIO, Nivel.AVANCADO, Nivel.BRIGADEIRO)),
    CORREDOR_DESERTICO(listOf(Nivel.INICIANTE, Nivel.INTERMEDIARIO, Nivel.AVANCADO, Nivel.BRIGADEIRO))
}

fun encontrarNivel(tempo: Double): Nivel {
    return when {
        tempo <= 18.0 -> Nivel.BRIGADEIRO
        tempo <= 22.0 -> Nivel.AVANCADO
        tempo <= 30.0 -> Nivel.INTERMEDIARIO
        else -> Nivel.INICIANTE
    }
}

fun main() {
    val estudantes = mutableListOf(
        Estudante(1, "João", 25, 17.5),
        Estudante(2, "Maria", 30, 22.5),
        Estudante(3, "Pedro", 22, 28.0),
        Estudante(4, "Ana", 18, 15.0)
    )

    val disciplinasDisponiveis = Disciplina.values()

    for (estudante in estudantes) {
        val nivelEstudante = encontrarNivel(estudante.tempoProva5Km)
        println("${estudante.nome} - Nível: $nivelEstudante")

        val disciplinasParaCursar = disciplinasDisponiveis.filter { it.niveisPermitidos.contains(nivelEstudante) }
        println("Disciplinas disponíveis para ${estudante.nome}:")
        for (disciplina in disciplinasParaCursar) {
            println("- ${disciplina.name}")
        }
        println()
    }
}
