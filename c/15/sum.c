#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
//ano bissexto
int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");
    int ano;
    printf("Digite o ano: ");
    scanf("%d",&ano);
    printf("%d\n",(((ano % 4 == 0)&&(ano % 100 != 0))||(ano%400 == 0)));
    if (((ano % 4 == 0)&&(ano % 100 != 0))||(ano%400 == 0))
    printf("Ano Bissexto\n");
    else
    printf("Ano Não-Bissexto\n");
    return 0;
}
