fun main() {

    fun printAll(vararg messages: String) {                            // 1 --- vararg - quantos elementos dos mesmo tipo forem necessários..
        for (m in messages) println(m)									// serao inserido como um array
    }
    printAll("Olá","Hello", "Hallo", "Salut", "Hola", "你好")                 // 2
    
    fun printAllWithPrefix(vararg messages: String, prefix: String) {  // 3
        for (m in messages) println(prefix + m)
    }
    printAllWithPrefix(
            "Hello", "Hallo", "Salut", "Hola", "你好",
            prefix = "Greeting: "                                          // 4
    )

    fun log(vararg entries: String) {
        printAll(*entries)                                             // 5
    }
    log("Hello", "Hallo", "Salut", "Hola", "你好")						// se vc tem uma função que vai chamar outra que tambem é um vararg utilizar o *

    
    
    
}