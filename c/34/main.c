#include <stdio.h>
#include <stdlib.h>  
#include <locale.h>
//diagonal
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int dia,mes;
    printf("Digite: dia mes: ");
    scanf("%d%d",&dia,&mes);
    if(mes ==12 && dia == 25){
        printf("FELIZ NATAL!\n");
    }else{
        printf("BOM DIA!\n");
    }
    
    return 0;
}
