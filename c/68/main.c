//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    
    int i = 0;


    for (i=32;i<=255;i++){
        printf(" %d:%c ",i,i);
    }

    printf("\n");
    return 0;
}

