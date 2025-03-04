package org.example;

public class Exemplo8 {
    public static void main(String[] args) {
        int[] original = {10,20,30,40,50};
        int[] copia = new int[original.length];

        for(int i = 0;i<original.length;i++){
            copia[i] = original[i];
        }
        System.out.println("Array copiado:");
        for(int valor: copia){
            System.out.print(valor + " ");
        }
    }
}
