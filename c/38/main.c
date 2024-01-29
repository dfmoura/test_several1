/*dia da samana */
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int dia, mes, ano, dSemana;
    const char ESC = 27;


    do {
        printf("Digite a data na forma dd mm aaaa: ");
        scanf("%d%d%d", &dia, &mes, &ano);

        dSemana = ano + dia + 3 * (mes - 1) - 1;

        if (mes < 3) {
            ano--;
        } else {
            dSemana -= (int)(0.4 * mes + 2.3);
            dSemana += (int)(ano / 4) - (int)((ano / 100 + 1) * 0.75);
            dSemana %= 7;
        }

        switch (dSemana) {
            case 0:
                printf("Domingo");
                break;
            case 1:
                printf("Segunda-Feira");
                break;
            case 2:
                printf("Terça-Feira");
                break;
            case 3:
                printf("Quarta-Feira");
                break;
            case 4:
                printf("Quinta-Feira");
                break;
            case 5:
                printf("Sexta-Feira");
                break;
            case 6:
                printf("Sábado");
                break;
        }

        printf("\nESC para terminar ou ENTER para recomeçar\n");

    } while (getchar() != ESC);

    printf("\n");
    return 0;
}
