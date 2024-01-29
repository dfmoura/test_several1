enum class DiaDaSemana {
    DOMINGO,
    SEGUNDA,
    TERCA,
    QUARTA,
    QUINTA,
    SEXTA,
    SABADO
}

fun main() {
    val dia = DiaDaSemana.SEGUNDA

    when (dia) {
        DiaDaSemana.DOMINGO -> println("Hoje é domingo!")
        DiaDaSemana.SEGUNDA -> println("Hoje é segunda-feira!")
        DiaDaSemana.TERCA -> println("Hoje é terça-feira!")
        DiaDaSemana.QUARTA -> println("Hoje é quarta-feira!")
        DiaDaSemana.QUINTA -> println("Hoje é quinta-feira!")
        DiaDaSemana.SEXTA -> println("Hoje é sexta-feira!")
        DiaDaSemana.SABADO -> println("Hoje é sábado!")
    }
}
