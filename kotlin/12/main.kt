class MutableStack<E>(vararg items: E) {              // 1

  private val elements = items.toMutableList()

  fun push(element: E) = elements.add(element)        // 2

  fun peek(): E = elements.last()                     // 3

  fun pop(): E = elements.removeAt(elements.size - 1)

  fun isEmpty() = elements.isEmpty()

  fun size() = elements.size

  override fun toString() = "MutableStack(${elements.joinToString()})"
}


fun <E> mutableStackOf(vararg elements: E) = MutableStack(*elements)

fun main() {

  //<String>("A","B","C") // ("A","B","C") -- com inferencia generica
  
  val stack = mutableStackOf<Int>(1,2,3)     //(0.62, 3.14, 2.7)   
  println(stack)
}


/*
 * função utilitaria mutableStackOf - segue padrão de nomenclatura
 * 
 * (*)passar o vararg como 
 * 
 * a função acima recebe um vararg de elementos e tambem tem o tipo generico <E> sendo passado para ele
 * e quando esta função for chamada eu quero criar uma nova MutableStack passando o vararg para ela, ou seja,
 * eu estou propagando este vararg de elements para o construtor da MutableStack
 * 
 * */