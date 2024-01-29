/*
 * da onde que é o tigre, herdar uma classe passando um padrao
 * polimorfismo... lidar com a variavel respeitando a hierarquia do tipo dela para o que
 * for mais conveniente
 * */


open class Tiger(val origin: String) {
    fun sayHello() {
        println("A tiger from $origin says: grrhhh!")
    }
}

class SiberianTiger : Tiger("Siberia")                  // 1

fun main() {
    val tiger: Tiger = SiberianTiger()
    tiger.sayHello()
}