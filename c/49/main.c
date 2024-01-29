#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    int mes;
    printf("Digite um mês entre 1 e 12: ");
    scanf("%d", &mes);
    if (mes < 1 || mes > 12) {
        printf("Digite novamente.\n");
    } else {
        switch (mes) {
            case 1:
                printf("Janeiro %d\n", mes);
                break;
            case 2:
                printf("Fevereiro %d\n", mes);
                break;
            case 3:
                printf("Março %d\n", mes);
                break;
            case 4:
                printf("Abril %d\n", mes);
                break;
            case 5:
                printf("Maio %d\n", mes);
                break;
            case 6:
                printf("Junho %d\n", mes);
                break;
            case 7:
                printf("Julho %d\n", mes);
                break;
            case 8:
                printf("Augusto %d\n", mes);
                break;
            case 9:
                printf("Setembro %d\n", mes);
                break;
            case 10:
                printf("Outubro %d\n", mes);
                break;
            case 11:
                printf("Novembro %d\n", mes);
                break;
            case 12:
                printf("Dezembro %d\n", mes);
                break;
            default:
                printf("Errado... mes!\n");
                break;
        }
    }
    return 0;
}
