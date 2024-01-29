#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

#define JOGOS 50  /*não podemos utilizar const*/
#define N 6
// 50 combinacoes para mega sena

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int matriz[JOGOS][N],k,j;
    for(k=0;k<JOGOS;k++)
        for(j=0;j<N;j++)
            matriz[k][j]=rand()%60+1;

    for(k=0;k<JOGOS;k++)
    {
        printf("Combinação %2d: ",k+1);
        for(j = 0;j<N;j++)
            printf("%2d ",matriz[k][j]);
            printf("\n");
    }


    printf("\n");
    return 0;
}
