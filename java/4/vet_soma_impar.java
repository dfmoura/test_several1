import java.util.Scanner;

public class vet_soma_impar {
    public static void main(String[] args) {
        final int tamanho = 5;
        int[] a = new int[tamanho];
        int soma = 0;
        String num;

        try {
            Scanner scanner = new Scanner(System.in);

            for (int i = 0; i < tamanho; i++) {
                System.out.print("Digite o valor " + i + ": ");
                num = scanner.nextLine();
                a[i] = Integer.parseInt(num);
            }

            for (int i = 0; i < tamanho; i++) {
                if (a[i] % 2 != 0)
                    soma = soma + a[i];
            }

            System.out.println("Soma dos ímpares = " + soma);
        } catch (Exception e) {
            System.err.println("Ocorreu um erro durante a leitura!");
        }
    }
}
