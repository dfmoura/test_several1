package aula02;

public class Carro {

    String modelo;
    String cor;
    boolean ligado;

    public Carro(String modelo, String cor) {
        this.modelo = modelo;
        this.cor = cor;
        boolean ligado = false;
    }

    public void  ligar(){
        ligado = true;
        System.out.println(modelo+" está ligado");
    }

    public void  desligar(){
        ligado = false;
        System.out.println(modelo+" está desligado");
    }


    public static void main(String[] args) {
        Carro meuCarro = new Carro("Fusca","Azul");
        meuCarro.ligar();

    }


}
