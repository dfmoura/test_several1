#include <stdio.h>
#include <stdlib.h>
#include <locale.h>


int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    float salario_anual, imposto_devido;
    printf("Digite o seu salário anual: ");
    scanf("%f", &salario_anual);
    switch (salario_anual >= 2112.00)
    {
        case 0:
            imposto_devido = 0;
            break;
        case 1:
            switch (salario_anual <= 2826.65)
            {
                case 1:
                    imposto_devido = (salario_anual * 0.075) - 158.40;
                    break;
                default:
                    switch (salario_anual <= 3751.05)
                    {
                        case 1:
                            imposto_devido = (salario_anual * 0.15) - 370.40;
                            break;
                        default:
                            switch (salario_anual <= 4664.68)
                            {
                                case 1:
                                    imposto_devido = (salario_anual * 0.225) - 651.73;
                                    break;
                                default:
                                    imposto_devido = (salario_anual * 0.275) - 894.96;
                            }
                    }
            }
    }
    printf("O valor do seu imposto devido é: R$ %.2f\n", imposto_devido);
    
    return 0;
    
}
