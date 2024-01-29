//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    char sd, se;
    int i,k,j;
    printf("\nSinal interno direito: ");
    sd = getchar();
    printf("\nSinal interno esquerdo: ");
    se = getchar();
    printf("\n\n");

    for(i=0;i<4;i++)
    {
        for(k=1;k<5; k++)
        {
            for(j=1;j<=40-(2*i+k);j++)
            printf(" ");
            printf("/");
            for(j=1; j<(2*i+k);j++)
                printf("%c",se);
            for(j=1;j<(2*i+k);j++)
                printf("%c",sd);
            printf("\\\n");
        }
    }
    for(i=0;i<2; i++)
    {
        for(j=0;j<38;j++) printf(" ");
        printf("| |\n");
    }

    printf("\n");;
    for(j=0;j<35;j++) printf(" ");
    printf("FELIZ NATAL\n");
    for(j=0;j<31;j++) printf(" ");
    printf("E UM PRÓSPERO 2024!\n");
    return 0;
}

