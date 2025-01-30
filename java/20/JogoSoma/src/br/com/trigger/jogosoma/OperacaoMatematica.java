package br.com.trigger.jogosoma;

public abstract class OperacaoMatematica implements Operacao {
    private int numero1;
    private int numero2;

    public OperacaoMatematica(int numero1, int numero2) {
        this.numero1 = numero1;
        this.numero2 = numero2;
    }

    public int getNumero1() {
        return numero1;
    }

    public int getNumero2() {
        return numero2;
    }
}
