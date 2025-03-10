package org.ordenacao;

/**
 * Exemplo 3: Bubble Sort otimizado
 * Esta versão inclui duas otimizações:
 * 1. Para a execução se nenhuma troca foi feita em uma passagem (array já ordenado)
 * 2. Reduz o tamanho da iteração interna a cada passagem
 */


public class Exemplo3 {
    public static void main(String[] args) {
        //array de exemplo
        int[] array = {64,34,25,12,22,11,90};
        int[] arrayQuaseOrdenado = {1,2,3,5,4,6,7,8};

        System.out.println("Desempenho para array desordenado");
        medirDesempenho(array);

        System.out.println("\nDesempenho para array quase ordenado:");
        medirDesempenho(arrayQuaseOrdenado);
    }

    //Metodo que implementa o Bubble Sort Otimizado
    static void bubbleSortOtimizado(int[]arr){
        int n = arr.length;
        boolean trocaRealizada;
        int contadorComparacoes = 0;
        int contadorTrocas = 0;

        //Loop externo - controla o número de passagens
        for(int i = 0; i < n - 1; i++){
            trocaRealizada = false;

            //Loop interno - compara elementos adjacentes
            //Note que a cada passagem, o maior elemento já esta posicionado
            //entao podemos reduzir o tamanho da iteração
            for(int j=0;j < n-i-1;j++){
                contadorComparacoes++;

                //Se o elemento atual for maior que o próximo, troca-os
                if(arr[j]> arr[j+1]){
                    //Troca os elementos
                    int temp = arr[j];
                    arr[j]=arr[j+1];
                    arr[j+1] = temp;
                    trocaRealizada = true;
                    contadorTrocas++;
                }
            }

            //Se nenhuma troca foi realizada, o array já está ordenado
            if(!trocaRealizada){
                System.out.println(" Array ordenado após "+ (i+1)+" passagens");
                System.out.println(" Total de comparações: "+ contadorComparacoes);
                System.out.println(" Total de trocas: "+ contadorTrocas);
                return;
            }
        }

        System.out.println(" Total de comparações: "+contadorComparacoes);
        System.out.println(" Total de trocas: "+ contadorTrocas);
    }

    //Método para testar e medir o desempenho do algoritmo
    static void medirDesempenho(int[] arr){
        int[] arrCopia = arr.clone();

        System.out.println("Array original:");
        imprimirArray(arrCopia);

        long inicio = System.nanoTime();
        bubbleSortOtimizado(arrCopia);
        long fim = System.nanoTime();

        System.out.println("Array ordenado:");
        imprimirArray(arrCopia);

        System.out.println("Tempo de execução: "+((fim - inicio)/1000)+" microssegundos");
    }

    //Metod auxiliar para imprimir o array
    static void imprimirArray(int[]arr){
        for(int valor : arr){
            System.out.print(valor + " ");
        }
        System.out.println();
    }
}
