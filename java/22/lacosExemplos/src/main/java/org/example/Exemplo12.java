package org.example;

public class Exemplo12 {
    public static void main(String[] args) {
        int[] array1 = {1,3,9,7,5};
        int[] array2 = {2,8,6,4,10};
        int[] resultado = new int[array1.length+array2.length];

        int i=0, j=0, k=0;

        // mesclando os arrays
        while (i < array1.length && j < array2.length){
            if(array1[i] < array2[j]){
                resultado[k++]= array1[i++];
            }else{
                resultado[k++] = array2[j++];
            }
        }

        // adicionando elementos restantes
        while (i< array1.length){
            resultado[k++] = array1[i++];
        }

        while (j< array2.length){
            resultado[k++] = array2[j++];
        }

        // exibindo o resultado
        for (int valor : resultado){
            System.out.print(valor + " ");
        }
    }
}
