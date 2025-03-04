package org.ordenacao;

import java.util.Scanner;


public class ArrayExample {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // Solicita o tamanho do array
        System.out.print("Digite o número de elementos do array: ");
        int n = scanner.nextInt();

        // Cria o array
        int[] array = new int[n];

        // Preenche o array com valores (exemplo: números aleatórios de 1 a 100)
        for (int i = 0; i < n; i++) {
            array[i] = (int) (Math.random() * 100) + 1;
        }

        // Exibe os elementos do array
        System.out.println("Elementos do array:");
        for (int num : array) {
            System.out.print(num + " ");
        }
        scanner.close();
    }
}
