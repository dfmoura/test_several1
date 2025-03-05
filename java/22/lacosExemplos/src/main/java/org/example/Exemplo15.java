package org.example;

public class Exemplo15 {
    public static void main(String[] args) {
        double[] valores = {23.5,27.8,30.2,25.7,29.3,22.1};
        double soma = 0;
        double max = valores[0];
        double min = valores[0];

        for (double valor : valores){
            soma += valor;
            if (valor > max) max = valor;
            if (valor > min) min = valor;
        }
        double media = soma / valores.length;
        double somaDesvios = 0;

        for (double valor : valores){
            somaDesvios += Math.pow(valor - media,2);
        }

        double desvioPadrao = Math.sqrt(somaDesvios / valores.length);

        System.out.printf("Média: %.2f\n",media);
        System.out.printf("Máximo: %.2f\n",max);
        System.out.printf("Mínimo: %.2f\n",min);
        System.out.printf("Desvio Padrão: %.2f\n",desvioPadrao);
    }
}
