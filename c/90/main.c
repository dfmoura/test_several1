
#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include <string.h>
#define MAX_NOMES 100
#define TAM_NOME 50

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");
    char nomes[MAX_NOMES][TAM_NOME];
    int totalNomes = 0;
    int i;

    printf("Dgite os nomes (presseione ENTER para finalizar):\n");

    for (i=0;i<MAX_NOMES;i++){
        printf("Nome %d: ", i+1);
        fgets(nomes[i], TAM_NOME,stdin);
        nomes[i][strcspn(nomes[i],"\n")] = '\0';
        if (nomes[i][0]=='\0'){
            break;
        }
        totalNomes++;
    }

    printf("\n%d",totalNomes);
    bubbleSort(nomes,totalNomes);

    printf("\nNomes digitados:\n");
    for (i=0; i < totalNomes; i++){
        printf("%s\n", nomes[i]);
    }


    printf("\n");
    return 0;
}
