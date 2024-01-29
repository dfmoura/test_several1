//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    
    int i = 0;


    printf("\n\nIIIIIIII\n");
    printf("IIIIIIII\n");
    for(i=0;i<6;i++)
    {printf("III    \n"); }
    printf("IIIIIIII\n");
    printf("IIIIIIII\n");
    for(i=0;i<6;i++)
    {printf("III    \n"); }
    printf("IIIIIIII\n");
    printf("IIIIIIII\n");
    printf("\n");
    return 0;
}

