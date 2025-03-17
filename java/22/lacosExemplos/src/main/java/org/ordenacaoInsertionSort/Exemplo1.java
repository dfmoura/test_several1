package org.ordenacaoInsertionSort;

import java.util.*;

public class Exemplo1 {
    public static void main(String[] args) {
        int[] X = new int[5];
        int i,j,eleito;

        Scanner entrada = new Scanner(System.in);
        // carregando os números no vetor
        for(i=0;i<=4;i++){
            System.out.println("Digite o "+(i+1)+"º número: ");
            X[i]= entrada.nextInt();
        }
        //ordenando de forma crescente
        //laço com a quantidade de elementos do vetor -1
        for(i=1;i<=4;i++){
            eleito=X[i];
            j=i-1;
            //laço que percorre os elemento
            //esquerda do número eleito
            //ou até encontrar a posição para
            //recoloção do número eleito
            //respeitando a ordenação procurada
            while (j >=0 && X[j] > eleito){
                X[j+1] = X[j];
                j=j-1;
            }
            X[j+1]= eleito;
        }
        //mostrando o vetor ordenado
        for(i=0;i<=4;i++){
            System.out.println((i+1)+"º número: "+X[i]);
        }
    }
}
