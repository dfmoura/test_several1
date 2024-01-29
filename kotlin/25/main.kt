/*
paradigma de orientacao de objeto...


*/

/**toda a função no kotlin é final
 * com o paramentro override eu cosigo isso sobrepor o final
 * dizer que é uma open class
 * com função aberta
 * 
 */

open class Dog {                // 1
    open fun sayHello() {       // 2
        println("wow wow!")
    }
}

class Yorkshire : Dog() {       // 3
    override fun sayHello() {   // 4
        println("wif wif!")
    }
}

fun main() {
    val dog: Dog = Yorkshire()
    dog.sayHello()
}