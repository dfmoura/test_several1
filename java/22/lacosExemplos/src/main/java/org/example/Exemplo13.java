package org.example;

public class Exemplo13 {
    public static void main(String[] args) {
        double[] notas = {8.5,9.2,7.0,6.8,9.5,8.8,7.5};
        double  menor = notas[0];
        double  maior = notas[0];
        double  soma = 0;

        // encontra maior e menor
        for (int i=0; i< notas.length;i++){
            if(notas[i]<menor){
                menor = notas[i];
            }
            if(notas[i]<maior){
                maior = notas[i];
            }
            soma +=notas[i];
        }

        // calcula media excluindo extremos
        double media = (soma - menor - maior) / (notas.length - 2);
        System.out.printf("Média excluindo extremos: %.2f", media);
    }
}
