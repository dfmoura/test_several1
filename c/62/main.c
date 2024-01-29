//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i=0;
    while (i<20)
    {
        printf("%c",'*');
        i++;
    }

    printf("\n");
    return 0;
}

