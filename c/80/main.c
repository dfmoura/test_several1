#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

#define TAMANHO 50  /*não podemos utilizar const*/

// calcula media  - usa matriz

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");


    int dmes[12]={31,28,31,30,31,30,31,31,30,31,30,31};
    int dia, mes,ano, total, i;
    printf("Digite a data no formato DD/MM/AAAA: ");
    scanf("%d%*c%d%*c%d",&dia,&mes,&ano);

    if(((!(ano%4)&& ano%100))||!(ano%400))
        dmes[1]=29;
    
    total = dia;

    for(i=0;i<mes-1;i++)
        total+=dmes[i];
    
    printf("Total de dias transcorridos desde o início do ano: %d\n", total);


    printf("\n");
    return 0;
}
