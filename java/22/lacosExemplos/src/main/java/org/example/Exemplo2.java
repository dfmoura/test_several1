package org.example;

public class Exemplo2 {
    public static void main (String[] args){
        String[] nomes = {"Ana","Carlos","João","Maria"};

        // for-each (mais moderno e mais legível)
        for (String nome : nomes){
            System.out.println("Nome: " + nome);
        }
    }
}