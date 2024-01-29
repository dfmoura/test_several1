// classes - estruturas de dados que podem moldar de acordo com nossa necessidade
// importante para o paradigma de orientação a objeto


fun describeString(maybeString: String?): String {              // 1
    if (maybeString != null && maybeString.length > 0) {        // 2
        return "String of length ${maybeString.length}"
    } else {
        return "Empty or null string"                           // 3
    }
}

fun main() {
    println(describeString(null))
    println(describeString(""))
    println(describeString("dio.me"))
}


