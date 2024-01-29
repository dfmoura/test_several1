#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int diasemana;
    printf("Digite o número do dia da semana: ");
    scanf("%d",&diasemana);

    switch(diasemana)
    {
        case 0:
            printf("Domingo, dia de descanso!\n");
            break;
        case 1:
            printf("Segunda-feira!\n");
            break;
        case 2:
            printf("Terça-feira!\n");
            break;
        case 3:
            printf("Quarta-feira!\n");
            break;
        case 4:
            printf("Quinta-feira!\n");
            break;
        case 5:
            printf("Sexta-feira!\n");
            break;
        case 6:
            printf("Sábado!\n");
            break;
    }

    return 0;
}
