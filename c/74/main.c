
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

// irrf repetição com while

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    // IRRF = ((SALRIO BRUTO X ALIQUOTA) - DEDUÇÃO)

    float salb, irrf, sall;
    int conta=1;

    while (conta <= 5)
    {
        printf("+++++++++++++++++++++++++++++++++++++++++++++++++++++\n");
        if (conta == 1)
            printf("CONTRIBUINTE 01\n");
        else if (conta == 2)
            printf("CONTRIBUINTE 02\n");
        else if (conta == 3)
            printf("CONTRIBUINTE 03\n");
        else if (conta == 4)
            printf("CONTRIBUINTE 04\n");
        else
            printf("CONTRIBUINTE 05\n");

        irrf = 0;
        printf("Digite o seu salário: ");
        scanf("%f", &salb);
        if (salb <= 1903.98)
            printf("Você é isento do IRRF!");
        else if (salb > 1903.98 && salb <= 2826.65)
            irrf = ((salb * (7.5 / 100)) - 142.80);
        else if (salb > 2826.65 && salb <= 3751.05)
            irrf = ((salb * (15.0 / 100.0)) - 354.80);
        else if (salb > 3751.05 && salb <= 4664.68)
            irrf = ((salb * (22.5 / 100)) - 636.13);
        else
            irrf = ((salb * (27.5 / 100.0)) - 869.36);
        sall = salb - irrf;
        printf("O seu salário bruto é de: R$ %.2f.\n", salb);
        printf("O imposto retido na fonte é de: R$ %.2f.\n", irrf);
        printf("Seu salário líquido é de: R$ %.2f.\n", sall);
        conta++;
    }
    printf("+++++++++++++++++++++++++++++++++++++++++++++++++++++\n");
    printf("\n");
    return 0;
}
