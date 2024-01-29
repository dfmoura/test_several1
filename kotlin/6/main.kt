fun someCondition() = true 

fun main() {

    //var e: Int  // 1 variavel declarada precisa ser inicializada
    //println(e)  // 2



    val d: Int  // 1
    
    if (someCondition()) {
        d = 1   // 2
    } else {
        d = 2   // 2
    }
    
    println(d) // 3

}

//neste caso a val sera atribuida na condição, ou seja, a estrutura de condicao inicializara a variavel
//val é uma boa pratica para ser sempre utilizada
//var reatribui valor no momento que quiser