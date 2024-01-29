//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i;
    for (i=9;i>0;i--)
        printf("\n%4d x 6 = %4d",i,i*6);


    printf("\n");
    return 0;
}

