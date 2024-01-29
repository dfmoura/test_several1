//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i;
    for (i=3;i<=100;i+=3)
        printf("%d\t",i);


    printf("\n");
    return 0;
}

