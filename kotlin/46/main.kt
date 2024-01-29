class IllegalVoterException(message: String): Throwable(message)


@Throws(IllegalArgumentException::class)
fun vote(name: String, age: Int){
    if(age < 16){
        throw IllegalArgumentException("$name não pode votar.")
    }
    println("Voto de $name realizado com sucesso!")
}

fun main() {	
    vote("Diogo",33)
    vote("Joana",14)
}

    