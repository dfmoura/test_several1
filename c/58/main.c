//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i=5;
    {
        int i=150;
        printf("%d\n",i);
    }
    printf("%d\n",i);
    
    printf("\n");
    return 0;
}

