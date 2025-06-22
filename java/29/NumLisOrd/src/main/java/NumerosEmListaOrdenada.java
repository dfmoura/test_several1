import java.util.*;
import java.util.stream.*;

public class NumerosEmListaOrdenada {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Digite uma sequência de números (ex: 58321): ");
        String entrada = scanner.nextLine();

        List<Integer> numeros = entrada.chars()
                .filter(Character::isDigit)
                .mapToObj(Character::getNumericValue)
                .collect(Collectors.toList());

        // Ordena a lista em ordem crescente
        numeros.sort(Comparator.naturalOrder());

        System.out.println("Lista ordenada: " + numeros);
    }
}
