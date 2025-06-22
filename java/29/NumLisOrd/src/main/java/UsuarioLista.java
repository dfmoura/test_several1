import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Scanner;

public class UsuarioLista {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        List<String> lista = new ArrayList<>();

        System.out.println("Digite valores (digite 'sair' para encerrar):");

        while (true) {
            System.out.print("Digite um valor: ");
            String entrada = scanner.nextLine();

            if (entrada.equalsIgnoreCase("sair")) {
                break;
            }

            lista.add(entrada);
        }

        // Ordenar a lista
        Collections.sort(lista);

        System.out.println("\nValores digitados (ordenados):");
        for (String valor : lista) {
            System.out.println(valor);
        }

        scanner.close();
    }
}
