#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");

    int i = 1, j=2, k=3, n=2;
    float x=3.3, y=4.4;   
    
    printf("%d\n", i < j + 3);//1
    printf("%d\n", 2 * i - 7 <= j - 8);//0
    printf("%d\n", -x + y >= 2.0 * y); //0
    printf("%d\n", x ==y); //0
    printf("%d\n", x !=y); //1
    printf("%d\n", i+j+k == -2 * -k); //1
    printf("%d\n", !(n-j)); //1
    printf("%d\n", !n-j); //-2
    printf("%d\n", !x*!x); //0
    printf("%d\n", i&&j&&k); //1
    printf("%d\n", i||j-3&&0); //1
    printf("%d\n", i<j&&2>=k); //0
    printf("%d\n", i<j||2>=k); //1
    printf("%d\n", i==2||j==4||k==5); //0
    printf("%d\n", i=2||j==4||k==5); //1
    printf("%d\n", x<=5&&x!=1.0||i>j); //1
    printf("%d\n", !j); //1
    printf("%d\n", j-); //1

    return 0;
}
