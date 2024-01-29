fun main() {
    val a = 10
    val b = 2
    
    // tenta fazer a divisao e se tiver um erro eu gostaria de tratar
    
    try{
    	val divisao = a/b 
        println(divisao)
        
    } catch(e: ArithmeticException){
        println("Ocorreu uma exceção aritmética.")
    } catch(e: Throwable){  // o throwable é a excessao genérica, mas existem diversos tipo, por exemplo 
        				    // arithmeticexpression, arrayindexoutofboundsexception, etc...
        				    // tambem o catch pode ser utilizado multiplas vezes
        //e.printStackTrace(); mensagem completa
        println(e.message) //somente a mensagem
    } finally{   //bloco opcional, vai executar independente de estar certo ou errado
        println("Finally executado!")
    }
    
    //quando o finally é interessante: quando tem um codigo, cria um objeto que vai ler um arquivo, 
    //dai no meio da leitura do arquivo ocorre uma exceção, mas vc já esta com o buffer aberto por exemplo,
    //entao é interessante que voce utilize o finally para dar o close desse buffer caso ele esteja aberto
    //voce pode fazer uma verificação de null se ele estiver aberto voce fecha...para nao consumir memora em demasia
    
}