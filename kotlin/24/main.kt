/*
flat map

*/

fun main() {


    val fruitsBag = listOf("apple","orange","banana","grapes")  // 1
    val clothesBag = listOf("shirts","pants","jeans")           // 2
    val cart = listOf(fruitsBag, clothesBag)                    // 3
    val mapBag = cart.map { it }                                // 4 vai manter as estruturas de listas originais
    val flatMapBag = cart.flatMap { it }                        // 5 vai juntar todo mundo


    println("Your bags are: $mapBag")
    println("The things you bought are: $flatMapBag")
}