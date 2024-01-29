#include <stdio.h>
#include <stdlib.h>

int main() {

    //tamanho de campo com ponto flutuante
    float lapis=4.875,borrachas=234.542,canetas=42.036,cadernos=8.0,fitas=13.05;
    printf("\nLapis          %12.2f",lapis);
    printf("\nBorrachas      %12.2f",borrachas);
    printf("\nCanetas        %12.2f",canetas);
    printf("\nCadernos       %12.2f",cadernos);
    printf("\nFitas          %12.2f\n\n",fitas);

    printf("%4.2f\n",3456.78);
    printf("%3.2f\n",3456.78);
    printf("%3.1f\n",3456.78);
    printf("%10.3f\n\n\n",3456.78);

    // sem tamanho de campo
    printf("%.2f %.2f %.2f\n",8.0,15.3,584.13);
    printf("%.2f %.2f %.2f\n\n\n",834.0,1500.55,4890.21);


    //tamanho de campo e justificado a esquerda
    printf("%-10.2f %-10.2f %-10.2f\n",8.0,15.3,584.13);
    printf("%-10.2f %-10.2f %-10.2f\n",834.0,1500.55,4890.21);

    //tamanho de campo com cadeias de caracteres
    printf("\nOBJETO         %12s","CODIGO");
    printf("\nLapis          %12s","WQR");
    printf("\nBorrachas      %12s","ASO");
    printf("\nCanetas        %12s","KPX");
    printf("\nCadernos       %12s","FJI");
    printf("\nFitas          %12s\n\n","TYE");


    //Tamanho de campo e complementando com zeros
    printf("\n%04d",21);
    printf("\n%06d",21);
    printf("\n%6.4d",21);
    printf("\n%6.0d\n\n",21);
    
    //Definindo a base numerica
    printf("\nDecimal: %d",65);
    printf("\nHexadecimal: %x",65);
    printf("\nOctal: %o",65);
    printf("\nCaractere: %c\n\n",65);

    
    return 0;

}
