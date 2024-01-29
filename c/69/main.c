//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    
    int a;
    while (a!=27)
    {
        scanf("%d",&a);
        if(a>=97 && a<=122)
        printf("%c\n",a-32);
        else
        printf("%d\n",a);
    }

    printf("\nPrograma encerrado com sucesso!\n");
    printf("\n");
    return 0;
}

