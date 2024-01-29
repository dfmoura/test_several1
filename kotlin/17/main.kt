class Animal(val name: String)

class Zoo(val animals: List<Animal>) {

    operator fun iterator(): Iterator<Animal> {             // 1 cria a capacidade da função ser iterada
        return animals.iterator()                           // 2
    }
}

fun main() {

    val animals = listOf(Animal("zebra"),Animal("lion"))
    val zoo = Zoo(animals)

    for (animal in zoo) {                                   // 3 o zoo vira um iterador especifico com capacidade de ser iterado
        println("Watch out, it's a ${animal.name}")
    }

}