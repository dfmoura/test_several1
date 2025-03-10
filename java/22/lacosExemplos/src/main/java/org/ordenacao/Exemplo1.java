package org.ordenacao;

/**
 * Exemplo 1: Implementação básica do Bubble Sort
 * Este é o algoritmo Bubble Sort em sua forma mais simples
 */

public class Exemplo1 {
    public static void main(String[] args) {
        //Array de exemplo
        int[] array = {64,34,25,12,22,11,90};

        System.out.println("Array original:");
        imprimirArray(array);

        //Chamda do metodo bubbleSort
        bubbleSort(array);

        System.out.println("\nArray ordenado:");
        imprimirArray(array);
    }

    //Metodo que implementa o bubble sort
    static void bubbleSort(int[]arr){
        int n = arr.length;

        //Loop externo - controla o número de passagens
        for(int i = 0; i< n-1;i++){

            //Loo interno - compara elementos adjacentes
            for(int j=0;j<n-i-1;j++){
                //Se o elemento atual for maior que o próximo, troca-os
                if(arr[j]>arr[j+1]){
                    //Troca os elementos
                    int temp = arr[j];
                    System.out.println(temp);
                    arr[j] = arr[j+1];
                    arr[j+1]=temp;
                }
            }
        }
    }


    //Metodo auxliar para imprimir o array
    static void imprimirArray(int[]arr){
        for(int valor : arr){
            System.out.print(valor+ " ");
        }
        System.out.println();
    }
}
