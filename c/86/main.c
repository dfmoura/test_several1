
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");


    int num[100];
    int count=0;
    int totalnums;

    do
    {
        printf ("Entre com um numero (-999 p/ terminar): ");
        scanf ("%d",&num[count]);
        count++;
    
    } while (num[count-1]!=-999);



    printf("\n");
    return 0;
}


