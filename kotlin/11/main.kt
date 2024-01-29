/**
 * class mutablestack - generic no contexto de uma pilha,
 * recebe como paramente um vararg de E, que pode ser qualquer coisa, pois esta como paramente generico <E>
 * que vai receber um array de E
 * 
 * tem uma propriedade que estao chegando como elementos do construtor que ele converte para um mutablelist
 * e tambem possui uma serie de funções uteis que toda pilha deveria ter
 * 
 * 
 * o poder do generics é a gente conseguir parametrizar o tipo de dados que vamos lidar internamente
 * desde que todas as operações seja genŕicas o suficiente para lidar com qualquer tipo de informação
 * 
 * criar classes mais flexiveis
 * 
 * */


class MutableStack<E>(vararg items: E) {              // 1

  private val elements = items.toMutableList()

  fun push(element: E) = elements.add(element)        // 2 recebe um elemento do tipo E e adiciona na lista

  fun peek(): E = elements.last()                     // 3 pegar o ultimo sem remover

  fun pop(): E = elements.removeAt(elements.size - 1)  // pega o ultimo e remove

  fun isEmpty() = elements.isEmpty()

  fun size() = elements.size

  override fun toString() = "MutableStack(${elements.joinToString()})"   // converte a pilha para texto para ficar mais visual no console
}


fun main() {
  val stack = MutableStack(0.62, 3.14, 2.7)
  stack.push(9.87)
  println(stack)

  println("peek(): ${stack.peek()}")
  println(stack)

 for (i in 1..stack.size()) {
     println("pop(): ${stack.pop()}")
     println(stack)
  }

}