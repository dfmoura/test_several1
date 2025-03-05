package org.example;

public class Exemplo14 {
    public static void main(String[] args) {
        int[] array = {1,2,3,4,5};
        int posicoes = 3; // posições para rotacionar

        // rotacionando à direita
        for (int p = 0; p< posicoes; p++){
            int ultimo = array[array.length - 1];

            for (int i = array.length - 1; i > 0; i--){
                array[i] = array[i - 1];
            }
            array[0] = ultimo;
        }

        // exibindo o resultado
        for (int valor : array){
            System.out.print(valor + " ");
        }
    }
}
