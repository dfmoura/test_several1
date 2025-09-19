package aula02;

public class Lampada {

    String cor;
    boolean acesa;

    public Lampada(String cor) {
        this.cor = cor;
        this.acesa = false;
    }

    public void acender(){
        acesa = true;
        System.out.println("A lâmpada "+cor+" está acesa.");
    }

    public void apagar(){
        acesa = false;
        System.out.println("A lâmpada "+cor+" está apagada.");
    }

    public static void main(String[] args) {
        Lampada lamp = new Lampada("Branca");
        lamp.acender();
        lamp.apagar();
    }


}


