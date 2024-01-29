fun main() {
    val a = 10
    val b = 0
        
    //ou voce especifica que divisao: Int? (é nulo) ou deixa que a inferencia do kotlin faça
    //sem que quizer atribuir para try expression tem que ser o ultico codigo do bloco
    	val divisao = try{ 
            println("Tentando fazer a divisão...")
            a/b 
        } catch(e: ArithmeticException){ 
            println("Divisão com erro!")
            null 
        }finally {
            println("Finally!")
        }
        println(divisao)
}