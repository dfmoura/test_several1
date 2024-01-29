
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int notas[5];
    int i;
    float media=0.0;

    for (i=0;i<5;i++)
    {
        printf("Digite a nota do aluno %d: ",i+1);
        scanf("%d",&notas[i]);
        media+=notas[i];
    }
    media /=5.0;
    printf("A média das notas %.2f.\n",media);
    printf("\n");
    return 0;
}
