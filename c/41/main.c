/*idade if else*/

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int idade;
    int n=9;
    printf("\nDigite a sua idade: ");
    scanf("%d",&idade);
    if(idade >=18)
        printf("\nVocê é maior de idade!\n");
    else
        printf("\nVocê é menor de idade!\n");


    printf("\n");
    printf("Valor=%d, endereco=%p\n",n,&n);
    return 0;
}
