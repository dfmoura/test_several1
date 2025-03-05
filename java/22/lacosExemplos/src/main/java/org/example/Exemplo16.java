package org.example;

public class Exemplo16 {
    public static void main(String[] args) {
        int[] array = {3,5,2,5,8,3,9,2,7};

        //Primeiro contamos quantos elementos único temos
        int contadorUnicos = 0;

        for (int i = 0; i < array.length; i++){
            boolean ehUnico = true;

            for(int j =0; j< i; j++){
                if(array[i] == array[j]){
                    ehUnico = false;
                    break;
                }
            }
            if (ehUnico){
                contadorUnicos++;
            }
        }

        // Criamos um array para os elementos únicos
        int[] semDuplicatas = new int[contadorUnicos];
        int posicao = 0;

        for (int i = 0; i < array.length; i++){
            boolean duplicado = false;

            for (int j=0; j < i;j++){
                if(array[i] == array[j]){
                    duplicado = true;
                    break;
                }
            }

            if (!duplicado){
                semDuplicatas[posicao] = array[i];
                posicao++;
            }
        }

        // Exibindo o resultado
        for (int valor : semDuplicatas){
            System.out.print(valor + " ");
        }
    }
}
