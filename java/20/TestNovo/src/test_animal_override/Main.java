package test_animal_override;

public class Main {
    public static void main(String[] args) {
        Animal meuAnimal = new Cachorro();
        meuAnimal.emitirSom();  // Chama o método sobrescrito em Cachorro

        Animal meuAnimal1 = new Animal();
        meuAnimal.emitirSom();
    }
}