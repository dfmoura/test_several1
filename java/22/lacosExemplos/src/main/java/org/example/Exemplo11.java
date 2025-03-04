package org.example;

public class Exemplo11 {
    public static void main(String[] args) {
        int[] quadrados = new int[10];

        for (int i=0; i < quadrados.length; i++){
            quadrados[i] = (i+1)*(i+1);
        }

        //Exibindo o resultado
        for (int quadrado: quadrados){
            System.out.print(quadrado+" ");
        }
    }
}
