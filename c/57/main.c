//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    float soma =0.0;
    const int max = 10;
    int i;
    for (i=0; i < max;i++)
    {    
        float nota;
        printf("\nDigite a nota %d: ", i+1);
        scanf("%f",&nota);
        soma += nota;
    }
    printf("\nMédia = %.2f\n",soma/max);
    
    printf("\n");
    return 0;
}

