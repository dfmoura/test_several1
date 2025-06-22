import java.util.*;
import java.util.stream.*;

public class NumerosEmLista {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Digite uma sequência de números (ex: 123456): ");
        String entrada = scanner.nextLine();

        // Converter cada caractere numérico para inteiro e colocar na lista
        List<Integer> numeros = entrada.chars() // retorna um IntStream
                .filter(Character::isDigit) // garante que sejam apenas dígitos
                .mapToObj(c -> Character.getNumericValue(c)) // converte char para int
                .collect(Collectors.toList());

        System.out.println("Lista de números: " + numeros);
    }
}
