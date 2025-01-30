package br.com.trigger.jogosoma;

public class Soma extends OperacaoMatematica {
    public Soma(int numero1, int numero2) {
        super(numero1, numero2);
    }

    @Override
    public int calcular(int a, int b) {
        return a + b;
    }
}
