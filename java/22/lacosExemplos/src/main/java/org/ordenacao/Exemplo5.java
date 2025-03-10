package org.ordenacao;


/**
 * Exemplo 5: Bubble Sort com uma classe personalizada
 * Este exemplo mostra como ordenar objetos de uma classe usando Bubble Sort
 */

public class Exemplo5 {
    public static void main(String[] args) {
        //Criando alguns alunos
        Aluno[] alunos = {
                new Aluno("Carlos",8.5),
                new Aluno("Ana",9.0),
                new Aluno("Pedro",7.2),
                new Aluno("Beatriz",9.8),
                new Aluno("Julia",8.9)
        };

        System.out.println("Lista original de alunos:");
        imprimirAlunos(alunos);

        //Ordenando os alunos por nota (do maior para o menor)
        bubbleSortAlunos(alunos);

        System.out.println("\nLista de alunos ordenada por nota (maior para menor):");
        imprimirAlunos(alunos);
    }

    //Classe Aluno para demonstrar ordenação de objetos
    static class Aluno{
        String nome;
        double nota;

        public Aluno(String nome, double nota){
            this.nome = nome;
            this.nota = nota;
        }

        @Override
        public String toString() {
            return nome + " (Nota: "+nota + ")";
        }
    }

    //Metodo de bubble sort adaptado para ordenar Alunos por nota
    static void bubbleSortAlunos(Aluno[] arr){
        int n = arr.length;

        for(int i = 0;i<n-1;i++){
            for(int j=0; j<n-i-1;j++){
                //Ordenado por nota em ordem decrescente
                if(arr[j].nota < arr[j+1].nota){
                    //Troca os elementos
                    Aluno temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1]=temp;
                }
            }
        }
    }

    //Metodo auxiliar para imprimir o array de alunos
    static void imprimirAlunos(Aluno[] arr){
        for(Aluno aluno : arr){
            System.out.println(aluno);
        }
    }
}
