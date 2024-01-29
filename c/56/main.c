//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    char ch;
    for(ch='a';ch <='z';ch++)
        printf("\nO valor ASCII de %c é %d",ch, ch);
    


    printf("\n");
    return 0;
}

