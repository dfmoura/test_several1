//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    int i;
    for (i=0;i<20;i++)
        printf("%c",'*');


    printf("\n");
    return 0;
}

