#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");

    int k,j=3;
    k = j ==3;
    printf("%d\n",k);


    float y;
    int x;
    x = 22345;
    y = (float)(x);
    printf("%f\n",y);

    return 0;
}
