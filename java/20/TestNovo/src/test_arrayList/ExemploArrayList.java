package test_arrayList;

import java.util.ArrayList;

public class ExemploArrayList {
    public static void main(String[] args) {
        ArrayList<String> lista = new ArrayList<>();
        lista.add("Maçã");
        lista.add("Banana");
        lista.add("Maçã"); // Permite duplicatas

        System.out.println(lista); // [Maçã, Banana, Maçã]
        System.out.println(lista.get(1)); // Acessa pelo índice (Banana)
    }
}
