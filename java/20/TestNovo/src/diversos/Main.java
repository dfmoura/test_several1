package diversos;

public class Main {
    public static void main(String[] args) {
        Carro meuCarro = new Carro(); // Criando um objeto da classe Carro
        meuCarro.modelo = "Fusca";
        meuCarro.ano = 1972;

        System.out.println("Modelo: " + meuCarro.modelo);
        System.out.println("Ano: " + meuCarro.ano);
        meuCarro.buzinar();
    }
}
