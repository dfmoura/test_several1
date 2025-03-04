package org.example;

public class Exemplo10 {
    public static void main(String[] args) {
        int[] numeros = {5,9,1,11,3,7};
        boolean ordenado = true;

        for (int i = 0; i < numeros.length - 1; i++){
            if(numeros[i] > numeros[i+1]){
                ordenado = false;
                break;
            }
        }
        System.out.println("O array está ordenado? "+ordenado);
    }
}
