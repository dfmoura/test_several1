
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int contar;
    float vl1, vl2, vl3, vl4, medi, total, comissao;
    contar = 1;

    while (contar <= 4)
    {
        if (contar == 1)
            printf("PRIMEIRO VENDEDOR:\n");
        else if (contar == 2)
            printf("SEGUNDO VENDEDOR: \n");
        else if (contar == 3)
            printf("TERCEIRO VENDEDOR: \n");
        else
            printf("QUARTO VENDEDOR: \n");
        printf("Digite a primeira venda: ");
        scanf("%f", &vl1);
        printf("Digite a segunda venda: ");
        scanf("%f", &vl2);
        printf("Digite a terceira venda: ");
        scanf("%f", &vl3);
        printf("Digite a quarta venda: ");
        scanf("%f", &vl4);

        total = vl1 + vl2 + vl3 + vl4;
        medi = total / 4;
        printf("\nO total de venda é: %.2f\n", total);
        printf("\nA média de vendas foi de: %.2f\n", medi);

        if (total <= 5000)
            comissao = total * 0.075;
        else if (total > 5000 && total <= 10000)
            comissao = total * 0.1;
        else if (total > 10000 && total <= 15000)
            comissao = total * 0.12;
        else
            comissao = total * 0.15;

        printf("\nA sua comissão é de: %.2f\n\n",comissao);
        contar++;
    }

    printf("\n");
    return 0;
}
