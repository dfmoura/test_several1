package test_set;

import java.util.HashSet;
import java.util.Set;

public class ExemploSet {
    public static void main(String[] args) {
        Set<String> frutas = new HashSet<>();
        frutas.add("Ba");
        frutas.add("Banana");
        frutas.add("Maçã");

        frutas.add("Maçã"); // Duplicata será ignorada


        System.out.println(frutas); // Exemplo: [Banana, Maçã] (ordem pode variar)
    }
}
