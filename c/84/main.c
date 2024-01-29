
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");
    float nota1, nota2, nota3, nota4, nota5, media, total;

    printf("Digite a nota do primeiro aluno: ");
    scanf("%f", &nota1);
    printf("Digite a nota do segundo aluno: ");
    scanf("%f", &nota2);
    printf("Digite a nota do terceiro aluno: ");
    scanf("%f", &nota3);
    printf("Digite a nota do quarto aluno: ");
    scanf("%f", &nota4);
    printf("Digite a nota do quinto aluno: ");
    scanf("%f", &nota5);

    total = (nota1 + nota2 + nota3 + nota4 + nota5);
    media = total / 5;

    printf("\nA média geral é de %.2f.\n", media);

    printf("\n");
    return 0;
}
