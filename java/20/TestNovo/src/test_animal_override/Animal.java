package test_animal_override;

class Animal {
    void emitirSom() {
        System.out.println("Algum som...");
    }
}

class Cachorro extends Animal {
    @Override
    void emitirSom() {  // Sobrescrita: mesmo nome e parâmetros, mas comportamento diferente
        System.out.println("Au Au!");
    }
}