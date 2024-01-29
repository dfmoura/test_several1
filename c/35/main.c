#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    const int TRUE = 1;
    while (TRUE) {
        float n1, n2;
        char op;

        printf("\nDigite número operador número: ");
        scanf("%f %c %f", &n1, &op, &n2);

        float result;
        if (op == '+') {
            printf("\n%f",n1 + n2);
        } else if (op == '-') {
            printf("\n%f",n1 + n2);
        } else if (op == '*') {
            printf("\n%f",n1 * n2);;
        } else if (op == '/') {
            if (n2 != 0) {
                printf("\n%f",n1 / n2);;
            } else {
                printf("Erro: Divisão por zero não é permitida.\n");
                continue;  
            }
        } else {
            printf("Op. desconhecido.\n");
            continue;  
        }
    }

    return 0;
}
