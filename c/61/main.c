//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i,fat=1;
    //fatorial
    for (i=10;i>0;i--){
        
        printf(" %d ", i);
        if(i>1) printf("x");
        if(i==1) printf("= ");
        fat*=i;
    }
    printf("%d",fat);
    printf("\n");
    return 0;
}

