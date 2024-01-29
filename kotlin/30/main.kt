/** 
*
*fun main() {
*    val vendedor = "Diogo"
*    val vendas = 400
*    val meta = 500
*    
*    if (vendas >= meta) {
*        println("Bateu a meta")
*    } else {
*        println("Não bateu a meta")
*    }
*}
**
*Abaix exemplo de POO
**/

class Vendedor(nome: String) {
    var nome = nome
    var vendas = 0

    fun vendeu(vendas: Int) {
        this.vendas = vendas
    }

    fun bateuMeta(meta: Int) {
        if (vendas > meta) {
            println("$nome Bateu a meta")
        } else {
            println("$nome Não bateu a meta")
        }
    }
}

fun main() {
    val vendedor1 = Vendedor("Vander")
    vendedor1.vendeu(1000)
    vendedor1.bateuMeta(600)

    val vendedor2 = Vendedor("Diogo")
    vendedor2.vendeu(300)
    vendedor2.bateuMeta(600)
}