#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    float salb, irrf, sall;
    int conta=1;
    do
     {
        printf("++++++++++++++++++++++++++++++++++++++++\n");
        if(conta==1)
            printf("CONTRIBUINTE 1\n");
        else if (conta==2)
            printf("CONTRIBUINTE 2\n");
        else if(conta==3)
            printf("CONTRIBUINTE 3\n");
        else if(conta==4)
            printf("CONTRIBUINTE 4\n");
        else if(conta==5)
            printf("CONTRIBUINTE 5\n");
        irrf=0;
        printf("Informe o salário bruto: ");
        scanf("%f", &salb);
        if(salb<=2112.00)
            printf("Você é isento do IRRF\n");
        else if( salb>2112.00 && salb<=2826.65)
            irrf=((salb*(7.5/100))-158.40);
        else if(salb>2826.65 && salb<=3751.05)
            irrf=((salb*(15.0/100))-370.40);
        else if(salb>3751.05 && salb<=4664.68)
            irrf=((salb*(22.5/100))-651.73);
        else
            irrf=((salb*(27.5/100))-894.96);
        sall=salb-irrf;
        printf("O seu salário bruto é de: R$ %.2f\n",salb);
        printf("O imposto retido na fonte é de: %.2f\n", irrf);
        printf("Seu salário líquido é de: %.2f\n",sall);
        printf("========================================\n");
        conta++;
     }  while (conta<=5);
    return 0;
}
