#include <stdio.h>
#include <stdlib.h>

int main() {

    //printf dec hexa octa
    char a='A';
    printf("\nDigite um caractere e veja o em decimal,");
    printf(" octal e hexadecimal: ");
    scanf("%c",&a);
    printf("\nCaractere = %c\nDec\t= %d\nOct\t= %o\nHex\t= %x\n",a,a,a,a);

    return 0;

}
