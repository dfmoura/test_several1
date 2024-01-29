// para sair de algo muito verboso

fun main() {

    fun maxOld(a: Int, b: Int): Int{
        if(a>b){
            return a
        }else{
            return b
        }
    }



    fun max(a: Int, b: Int) = if (a > b) a else b         // 1

    println(maxOld(99, -42))
    println(max(99, -42))

}