import java.util.*;
import java.util.stream.*;

public class ListaOrdenacao {

    public static void main(String[] args) {
        // Lê a entrada do usuário (ex: "58321")
        String entrada = lerEntrada();

        // Converte a string de dígitos em uma lista de inteiros
        List<Integer> numeros = converterParaLista(entrada);

        // Imprime a lista original, antes da ordenação
        System.out.println("Lista original: " + numeros);

        // Ordena a lista (sem modificar a original) e imprime
        List<Integer> listaOrdenada = ordenarLista(numeros);
        System.out.println("Lista ordenada: " + listaOrdenada);
    }

    /**
     * Lê a sequência digitada pelo usuário e retorna como String
     */
    private static String lerEntrada() {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Digite uma sequência de números (ex: 58321): ");
        return scanner.nextLine();
    }

    /**
     * Converte uma string de caracteres numéricos em uma lista de inteiros
     * Ex: "58321" -> [5, 8, 3, 2, 1]
     */
    private static List<Integer> converterParaLista(String entrada) {
        return entrada.chars() // Transforma a string em uma sequência de códigos de caracteres
                .filter(Character::isDigit) // Filtra apenas os caracteres numéricos
                .mapToObj(Character::getNumericValue) // Converte cada caractere para número inteiro
                .collect(Collectors.toList()); // Coleta em uma lista
    }

    /**
     * Ordena uma lista de inteiros em ordem crescente
     * (sem alterar a lista original)
     */
    private static List<Integer> ordenarLista(List<Integer> numeros) {
        List<Integer> copia = new ArrayList<>(numeros); // Faz uma cópia da lista original
        copia.sort(Comparator.naturalOrder()); // Ordena a cópia
        return copia; // Retorna a lista ordenada
    }
}
