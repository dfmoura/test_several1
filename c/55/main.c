//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i,j;
    for (i=0,j=i;(i+j)<100;i++,j++)
        printf("%d",i+j);


    printf("\n");
    return 0;
}

