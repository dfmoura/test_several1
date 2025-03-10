package org.ordenacao;

/**
 * Exemplo 4: Bubble Sort com objetos - ordenando Strings
 * Este exemplo mostra como ordenar um array de Strings usando Bubble Sort
 */

public class Exemplo4 {
    public static void main(String[] args) {
        //Array de strings para ordenação
        String[] frutas = {"Maçã","Banana","Abacaxi","Uva","Laranja","Pêra"};

        System.out.println("Lista original de frutas:");
        imprimirArray(frutas);

        //Ordenando as frutas em ordem alfatética
        bubbleSortString(frutas);

        System.out.println("\nLista ordenada de frutas:");
        imprimirArray(frutas);
    }

    //Metodo de bubble sort adaptado para strings
    static void bubbleSortString(String[] arr){
        int n = arr.length;

        for(int i = 0; i < n - 1; i++){
            for(int j=0; j<n-i-1; j++){
                //Usando o metodo compareTo() para comparar Strings
                if(arr[j].compareTo(arr[j+1])>0){
                    //Troca os elementos
                    String temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1]=temp;
                }
            }
        }
    }

    //Metodo auxliar para imprimir o array de Strings
    static void imprimirArray(String[] arr){
        for(String item: arr){
            System.out.print(item + " ");
        }
        System.out.println();
    }
}
