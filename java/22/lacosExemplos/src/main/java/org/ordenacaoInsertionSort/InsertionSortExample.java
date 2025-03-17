package org.ordenacaoInsertionSort;

import java.util.Arrays;

public class InsertionSortExample {
    public static void insertionSort(int[] arr) {
        int n = arr.length;
        for(int i = 1;i<n;i++){
            int key = arr[i];
            int j=i-1;

            //Move os elementos maiores que key uma posição para frente
            while(j >= 0 && arr[j] > key){
                arr[j+1] = arr[j];
                j=j-1;
            }
            arr[j+1]=key;
        }
    }

    public static void main(String[] args) {
        int[]numbers = {9,5,1,4,3};
        System.out.println("Array antes da ordenção: "+Arrays.toString(numbers));
        insertionSort(numbers);
        System.out.println("Array após a ordenação: "+Arrays.toString(numbers));
    }
}
