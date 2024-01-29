/*calculador com switch*/

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

        if (n1 == 0.0) {
            break;
        }

        switch (op) {
            case '+':
                printf("\n%f", n1 + n2);
                break;
            case '-':
                printf("\n%f", n1 - n2);
                break;
            case '*':
                printf("\n%f", n1 * n2);
                break;
            case '/':
                if (n2 != 0.0) {
                    printf("\n%f", n1 / n2);
                } else {
                    printf("\nErro: Divisão por zero.");
                }
                break;
            default:
                printf("\nOperador desconhecido.");
        }
    }

    printf("\n");
    return 0;
}
