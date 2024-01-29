#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

#define TAMANHO 50  /*não podemos utilizar const*/

// calcula media  - usa matriz

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    float notas[TAMANHO], media=0.0;
    int i=0,j;

    do
    {
        printf("Digite a nota do aluno %d ",i+1);
        scanf("%f",&notas[i]);
        
    } while (notas[i++] >=0.0);

    i--;

    for(j=0; j<i; j++)
        media += notas[j];
    
    media/= i;
    printf("Média das notas: %.2f\n",media);
    



    printf("\n");
    return 0;
}
