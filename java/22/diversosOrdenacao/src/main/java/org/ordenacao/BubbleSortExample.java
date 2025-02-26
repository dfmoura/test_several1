package org.ordenacao;

import java.util.Arrays;

public class BubbleSortExample {
    public static void  main(String[] args){
        int[] arr = {5, 3, 8, 4, 2};
        int ciclos = bubbleSort(arr);  // Agora a função retorna o número de ciclos
        System.out.println("Total de ciclos: " + ciclos );
        System.out.println("Array ordenado: "+ Arrays.toString(arr));
    }

    public static int bubbleSort(int[] arr){
        int n = arr.length;
        int m = 0;
        boolean swapped;

        for (int i = 0; i<n -1;i++){
            swapped = false;
            m++;

            for (int j = 0;j<n-1-i;j++){
                if(arr[j]>arr[j+1]){
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1]=temp;
                    swapped=true;
                }

            }
            if(!swapped) break;
        }
        return m;
    }
}
