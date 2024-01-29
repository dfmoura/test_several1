/*idade if else - aninhado*/

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int idade;
    printf("\nDigite a sua idade: ");
    scanf("%d",&idade);
    if(idade >=18)
        printf("\nVocê é maior de idade!\n");
    else if ((idade <18)&&(idade != 0))
        printf("\nVocê é menor de idade!\n");
    else
        printf("\nVocê digitou ZERO para idade!");

    printf("\n");
    return 0;
}
