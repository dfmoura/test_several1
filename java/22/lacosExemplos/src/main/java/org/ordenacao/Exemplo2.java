package org.ordenacao;

/**
 * Exemplo 2: Bubble Sort com visualização dos passos
 * Esta versão mostra o estado do array após cada passagem
 */

public class Exemplo2 {
    public static void main(String[] args) {
        //Array de exemplo
        int[] array = {64,34,25,12,22,11,90};

        System.out.println("Array original:");
        imprimirArray(array);


        //Chamada do método bubbleSort com visualização
        bubbleSortComVisualizacao(array);

        System.out.println("\nArray ordenado:");
        imprimirArray(array);
    }

    //Metodo que implementa o Bubble Sort com visualização
    static void bubbleSortComVisualizacao(int[] arr){
        int n = arr.length;
        boolean trocaRealizada;

        //Loop externo - controla o número de passagens
        for (int i = 0; i < n - 1; i++){
            System.out.println("\nPassagem "+(i+1)+":");
            trocaRealizada = false;

            //Loop interno - compara elementos adjacentes
            for(int j=0;j<n-i-1;j++){
                //Se o elemento atual for maior que o próximo, troca-os
                if (arr[j] > arr[j+1]){
                    //Troca os elementos
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1]=temp;
                    trocaRealizada=true;

                    //Mostra o estado do array após a troca
                    System.out.println(" Troca "+arr[j]+" com "+arr[j+1]+": ");
                    imprimirArray(arr);
                }
            }

            //Se nenhuma troca foi realizada, o array ja esta ordenado
            if (!trocaRealizada){
                System.out.println(" Nenhuma troca necessária, array já ordenado!");
                break;
            }
        }
    }

    //Metodo auxliar para imprimir o array
    static void imprimirArray(int[] arr){
        for(int valor: arr){
            System.out.print(valor+" ");
        }
        System.out.println();
    }
}
