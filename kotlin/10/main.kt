/*CLASSES
 * 
 * classe é , de maneira geral a representação de objetos que podem ser instanciados na pratica, a 
 *class é o modelo para criação de objetos.   */

class Customer                                  // 1 - classe simple - somente instaciada - somente a casca

class Contact(val id: Int, var email: String)   // 2 - possui 2 paramentos, val imutavel - var mutavel

fun main() {

    val customer = Customer()                   // 3 - como criar uma instancia da classe customer, ou seja, criando um objeto do tipo customer
    
    val contact = Contact(1, "mary@gmail.com")  // 4 - instanciando outro objeto do tipo contact

    println(contact.id)                         // 5 - imprimindo o id
    println(contact.email)
    contact.email = "jane@gmail.com"            // 6 - reatribuindo o email - é possivel pois esta tipado com uma propriedade var
	println(contact.email)
}