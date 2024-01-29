



    //null safety --- segurança nula
    // tem que deixar explicito se determinada variavel pode receber valor nulo ou não
    //no kotlin somos obrigados a lidar com situações de nulabilidade
    

fun main() {

    var neverNull: String = "This can't be null"            // 1 quando eu declaro de um tipo e nao especifico que ela pode ser nula
    //neverNull = null                                      // 2 eu nao consigo atribui para nulo
    
    //var nullable: String? = "You can keep a null here"      // 3 se eu quiser, terei que explicitamente dizer diretamente que a variavel
    //nullable = null                                         // 4 vai ser daquele tipo e eu gostaria de aceitar nulo como uma atribuição válida para ela
    
    var nullable: String?              // 3 Se quiser, terá que explicitamente dizer diretamente que a variável é nula
    nullable = "You can keep a null here"


    //var inferredNonNull = "The compiler assumes non-null"   // 5 se quiser atribuiir como não nulo tera que tipar a string?
    //inferredNonNull = null                                // 6
    

    var inferredNonNull: String        // 5 Se quiser atribuir como não nulo, terá que tipar a string
    inferredNonNull = "The compiler assumes non-null"
    println(inferredNonNull) 


    fun strLength(str: String?): Int {                      // 7
        return str?.length ?:0
    }
    
    println(strLength(neverNull))                                    // 8
    println(strLength(nullable))                                     // 9

}

//objetivo dos exemplos é conseguir entender que caso a gente queira lidar com valores nulos a gente precisa se preocupar com isso em tempo de implementação
//seja minha variavel var ou val com uma atribuição nula ou não nula dependendo por exemplo de uma estrutura condicional, a gente tem que garantir que a tipagem
//das minhas variaveis vão estar observando para isso se a variavel pode ou não ser nula e a gente precisa definir isso no tipo efetivamente dela de maneira
//explicita porque caso contrario vamos ter problemas iguais no exemplo 1 - um valor não nulo a gente atribui um valor nulo...
//exemplo 2 a gente declarou e o compilador fez a inferencia de que o valor é nulo e a gente tentar atribuir um valor nulo...



