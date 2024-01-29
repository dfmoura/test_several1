#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");
    /*
        1) soma -> +=
        2) subtração -> -=
        3) multiplicação -> *=
        4) divisão -> /=
        5) resto (módulo) -> %=
    */
    int i = 1;
    printf( "%i\n", i );
    printf( "%i\n", ++i );
    i++;
    printf( "%i\n", i );
    system("clear");
    int i2 = 5;
    printf("%i\n", i2);
    printf("%i\n", --i2);
    i2--;
    printf("%i\n", i2 );
    /*
        1) Incremento\
        >Pré ou Pos
        2) Decremento/
        Pre -> o valor será incrementado/decrementado na instrução
                que a variável estiver contida
        Pos -> o valor será incrementado/decrementado na próxima
                instrução
    */
    int x = 0;
    x = x + 10;//incrementar qntas unidades desejarmos
    x += 10;//incrementar qntas unidades desejarmos
    ++x;// op. incremento, só podemos incrementar
        // uma unica unidade
    system( "clear");
    printf("%i\n", x);
    return 0;
}
