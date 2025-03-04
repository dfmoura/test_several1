package org.ordenacao;


public class testeFor {
    public static void main(String[] args) {
        int m = 0, n = 3, y = 0;

        for (int i = 0; i < n - 1; i++) {
            m++;
            System.out.println("Valor de m: " + m + " Valor de i: "+ i);

            for (int c = 0; c < n - 1; c++) {
                y++;
                System.out.println("Valor de y: " + y);
            }

        }


    }
}
