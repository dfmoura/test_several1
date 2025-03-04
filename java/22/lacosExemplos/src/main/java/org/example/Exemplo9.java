package org.example;

public class Exemplo9 {
    public static void main(String[] args) {
        int[] numeros = {5,3,8,5,2,5,7,8,5};
        int busca = 8;
        int contador = 0;

        for (int i = 0; i< numeros.length; i++){
            if(numeros[i]==busca){
                contador++;
            }
        }
        System.out.println("O número "+busca+" aparece "+contador+" vezes no array");
    }
}
