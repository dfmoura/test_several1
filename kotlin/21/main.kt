/* uma lista no kotlin é uma estrutura ordenada de dados
 a gente pode variar de uma lista mutavel para uma imutavel 
 pela forma como nos instanciamos a variavel especifica que
 estamos querendo receber o valor
 a função listof sempre vai criar uma lista read-only,imutavel.
 enquanto que uma o mutableListOf() vai criar uma lista mutavel

*/

val systemUsers: MutableList<Int> = mutableListOf(1, 2, 3)        // 1 criando uma variavel imutavel, mas recebemos um mutable list...(uma coisa nao tem nada a ver com a outra)
val sudoers: List<Int> = systemUsers                              // 2 vai criar uma copia imutavel da lista anterior

fun addSystemUser(newUser: Int) {                                 // 3 adiciona elementos na lista mutavel
    systemUsers.add(newUser)                      
}

fun getSysSudoers(): List<Int> {                                  // 4 retorna
    return sudoers
}

fun main() {
    addSystemUser(4)                                              // 5 
    println("Tot sudoers: ${getSysSudoers().size}")               // 6
    getSysSudoers().forEach {                                     // 7
        i -> println("Some useful info on user $i")
    }
    // getSysSudoers().add(5) <- Error!                           // 8
}