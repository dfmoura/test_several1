#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

#define TAMANHO 5  /*não podemos utilizar const*/

// calcula media  - usa matriz

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    float notas[TAMANHO], media=0.0;
    int i;

    for(i=0;i<TAMANHO;i++)
    {
        printf("Digite a nota do aluno %d ", i+1);
        scanf("%f",&notas[i]);
        media += notas[i];
    }
    media /= 5.0;
    printf("Média das notas: %.2f\n",media);


    printf("\n");
    return 0;
}
