
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main() {
    int numAdvinhacoes, adivinhador, tentativas = 0;
    srand(time(0)); // gerador de números aleatórios com a hora atual
    numAdvinhacoes = rand() % 100 + 1; // Gera um número aleatório entre 1 e 100
    printf("\n");
    printf("_________________________________________________\n");
    printf("|  ___________________________________________  |\n");
    printf("| |                                           | |\n");
    printf("| |   0   0    ADIVINHE O NUMERO!!!!!!        | |\n");
    printf("| |     -                                     | |\n");
    printf("| |   \___/          O JOGO                    | |\n");
    printf("| |____________________     __________________| |\n");
    printf("|______________________|\_/|____________________|\n");
    printf("                   _|__|/ \|_|_                  \n");
    printf("                  / ********** \                 \n");
    printf("                /  ************  \               \n");
    printf("               --------------------              \n");
    printf("\n");

    int contadorRegressivo = 3; // definir o tempo de contagem regressiva em segundos
    while (contadorRegressivo >= 0) {
        printf("= %d \n", contadorRegressivo);
        sleep(1); // esperar 1 segundo
        contadorRegressivo--;
    }
    printf("\n");
    system("clear");
    printf("┌─┐┌─┐┌─┐┬─┐┌─┐  ┌─┐  ┌─┐┬ ┬┌─┐  ┬  ┬┌─┐┌─┐\n");
    printf("├─┤│ ┬│ │├┬┘├─┤  ├┤   └─┐│ │├─┤  └┐┌┘├┤ ┌─┘\n");
    printf("┴ ┴└─┘└─┘┴└─┴ ┴  └─┘  └─┘└─┘┴ ┴   └┘ └─┘└─┘\n");

    contadorRegressivo = 3; // definir o tempo de contagem regressiva em segundos
    while (contadorRegressivo >= 0) {
        printf("= %d \n", contadorRegressivo);
        sleep(1); // esperar 1 segundo
        contadorRegressivo--;
    }

    system("clear");
    printf("   .-****-.\n");
    printf("   / -   -  ]\n");
    printf("  |  .-. .- ]\n");
    printf("  |  \o| |o (\n");
    printf("  \     ^    ]\n");
    printf("   '.  )--'  ]       Selecionei um número entre 1 e 100. Tente adivinhar!\n");
    printf("    '-...-'`\n");

      sleep(3);
  system("clear");

    do {
        printf("Digite seu palpite:: ");
        scanf("%d", &adivinhador);
        tentativas++;

        if (adivinhador < numAdvinhacoes) {
            printf("Muito baixo! Tente novamente.\n");
        } else if (adivinhador > numAdvinhacoes) {
            printf("Muito alto! Tente novamente.\n");
        } else {
            printf("Parabéns! Você adivinhou o número %d em %d tentativas!\n", numAdvinhacoes, tentativas);
        }
    } while (adivinhador != numAdvinhacoes);

    return 0;
}
