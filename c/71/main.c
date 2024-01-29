
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include <time.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    srand(time(NULL));
    int aleatorio = rand();
    int num_aleatorio = (aleatorio % 16)+3;
    printf("%d\n",num_aleatorio);

    int n1 = 0;

    for (int lancam1 = 1; lancam1 <= 6; lancam1++) {
        for (int lancam2 = 1; lancam2 <= 6; lancam2++) {
            for (int lancam3 = 1; lancam3 <= 6; lancam3++) {
                int sum = lancam1 + lancam2 + lancam3;
                if (sum == num_aleatorio) {
                    n1++;
                    printf("(%d, %d, %d)\n", lancam1, lancam2, lancam3);
                }
            }
        }
    }

    printf("Número de casos: %d.\n", n1);
    double probab = ((double)n1/(double)(num_aleatorio*num_aleatorio*num_aleatorio))*100;
    printf("A probabilidade de sair %d é de %.2lf%%.\n",num_aleatorio,probab);

    printf("\n");
    return 0;
}

