//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int i,j,k;
    for(k=0;k<=1;k++)
    {
        printf("\n");
        for(i=1;i<=4;i++)
            printf("TABUADA DO %3d ",i+4*k+1);
        printf("\n");
    
        for(i=1;i<=9;i++)
        {
            for(j=2+4*k;j<=5+4*k;j++)
                printf("%3d x %3d = %3d",j,i,j*i);
            printf("\n");
        }
    }
    
    printf("\n");
    return 0;
}

