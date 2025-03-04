package org.example;

public class Exemplo3 {
    public static void main(String[] args) {
        int[] valores = {5,8,12,3,9};
        int soma = 0;

        for (int i = 0; i < valores.length;i++){
            soma += valores[i];
        }
        System.out.println("A soma dos elementos é: "+soma);
    }
}
