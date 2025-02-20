package test_map;

import java.util.HashMap;
import java.util.Map;

public class ExemploMap {
    public static void main(String[] args) {
        Map<String, Integer> idadePessoas = new HashMap<>();
        idadePessoas.put("Carlos", 30);
        idadePessoas.put("Ana", 25);
        idadePessoas.put("Carlos", 35); // Substitui o valor da chave "Carlos"

        System.out.println(idadePessoas); // {Ana=25, Carlos=35}
        System.out.println(idadePessoas.get("Ana")); // Acessa pelo nome (25)
    }
}
