package org.example;

public class Exemplo7 {
    public static void main(String[] args) {
        int[] numeros = {2,5,7,8,10,13,15,18};

        System.out.println("Números pares: ");
        for(int numero : numeros){
            if(numero % 2 == 0){
                System.out.print(numero+" ");
            }
        }
    }
}
