package org.example;

public class Exemplo4 {
    public static void main(String[] args) {
        int[] valores = {15,8,22,13,9};
        int maior = valores[0];
        int menor = valores[0];

        for (int valor:valores){
            if(valor > maior){
                maior = valor;
            }
        }

        for (int valor1: valores){
            if (valor1 < menor){
                menor = valor1;
            }
        }

        System.out.println("O maior valor é: "+maior);
        System.out.println("O menor valor é: "+menor);
    }
}
