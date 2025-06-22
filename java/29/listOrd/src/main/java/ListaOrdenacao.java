import java.util.*;
import java.util.stream.*;


public class ListaOrdenacao {

    public static void main(String[] args) {
        String entrada = lerEntrada();
        List<Integer> numeros = converterParaLista(entrada);
        System.out.println("Lista original: "  + numeros);
        List<Integer> listaOrdenada = ordenarLista(numeros);
        System.out.println("Lista ordenada: "+listaOrdenada);
    }



    /**
     *
     * Ler sequencia digitado e retornar string
     *
     * */
    private static String lerEntrada(){
        Scanner scanner = new Scanner(System.in);
        System.out.print("Digite uma sequencia de números (ex: 8414684414511): ");
        return scanner.nextLine();
    }

    /**
     *
     * Converter uma string de caracteres para um lista de inteiros
     *
     * */
    private static List<Integer> converterParaLista(String entrada){
        return entrada.chars()
                .filter(Character::isDigit)
                .mapToObj(Character::getNumericValue)
                .collect(Collectors.toList());
    }

    /**
     * Ordenar uma lista de inteiros em ordem crescente
     *
     * */
    private static List<Integer> ordenarLista(List<Integer> numeros){
        List<Integer> copia = new ArrayList<>(numeros);
        copia.sort(Comparator.naturalOrder());
        return copia;
    }

}
