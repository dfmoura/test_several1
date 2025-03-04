package org.example;

public class Exemplo1 {
    public static void main(String[] args) {
        int[] numeros = {10, 20, 30, 40, 50};

        // for tradicional
        for (int i = 0; i < numeros.length; i++) {
            System.out.println("Elementos na posição "+i+": "+numeros[i]);
        }
    }
}