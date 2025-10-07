import java.util.Scanner;

// Classe principal do jogo
public class PedraPapelTesouraPOO {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Jogador jogador = new Jogador("Você");
        Computador computador = new Computador();

        Jogada jogadaJogador = jogador.escolherJogada(scanner);
        Jogada jogadaComputador = computador.escolherJogada(scanner);

        Resultado resultado = jogadaJogador.jogarContra(jogadaComputador);

        switch (resultado) {
            case VITORIA -> System.out.println("Você venceu!");
            case DERROTA -> System.out.println("Você perdeu!");
            case EMPATE -> System.out.println("Empate!");
        }

        scanner.close();
    }
}
