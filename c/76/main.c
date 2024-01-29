#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

// irrf repetição com while

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");


    int nota0,nota1,nota2,nota3,nota4;
    float media;

    printf("Digite a nota do aluno 1 "); scanf("%d",&nota0);
    printf("Digite a nota do aluno 2 "); scanf("%d",&nota1);
    printf("Digite a nota do aluno 3 "); scanf("%d",&nota2);
    printf("Digite a nota do aluno 4 "); scanf("%d",&nota3);
    printf("Digite a nota do aluno 5 "); scanf("%d",&nota4);

    media = (nota0+nota1+nota2+nota3+nota4)/5;
    printf("Média das notas: %.2f\n",media);

    printf("\n");
    return 0;
}
