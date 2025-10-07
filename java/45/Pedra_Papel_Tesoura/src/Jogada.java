import java.util.Random;
import java.util.Scanner;


public enum Jogada {

    PEDRA, PAPEL, TESOURA;


    public Resultado jogarContra( Jogada outra){
        if (this == outra){
            return Resultado.EMPATE;
        }
        return switch (this) {
            case PEDRA -> (outra == TESOURA) ? Resultado.VITORIA : Resultado.DERROTA;
            case PAPEL -> (outra == PEDRA) ? Resultado.VITORIA : Resultado.DERROTA;
            case TESOURA -> (outra == PAPEL) ? Resultado.VITORIA : Resultado.DERROTA;
        };
    }
}

// Enum para resultado da partida
enum Resultado {
    VITORIA, DERROTA, EMPATE
}


// Classe representando o jogador
class Jogador {
    private String nome;

    public Jogador(String nome) {
        this.nome = nome;
    }

    public String getNome() {
        return nome;
    }

    // Método para escolher a jogada (no caso, entrada do usuário)
    public Jogada escolherJogada(Scanner scanner) {
        System.out.print(nome + ", escolha (pedra, papel ou tesoura): ");
        String escolha = scanner.nextLine().trim().toUpperCase();
        try {
            return Jogada.valueOf(escolha);
        } catch (IllegalArgumentException e) {
            System.out.println("Escolha inválida! Tentando novamente...");
            return escolherJogada(scanner);
        }
    }
}

// Classe representando o computador
class Computador extends Jogador {
    private Random random = new Random();

    public Computador() {
        super("Computador");
    }

    @Override
    public Jogada escolherJogada(Scanner scanner) {
        Jogada jogada = Jogada.values()[random.nextInt(Jogada.values().length)];
        System.out.println("Computador escolheu: " + jogada);
        return jogada;
    }
}


