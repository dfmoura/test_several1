// 1047

#include <bits/stdc++.h>
using namespace std;

int main()
{

    int h1, h2, m1, m2, hora = 0, min = 0, inicio = 0,fim = 0,resultado=0;
    cin >> h1 >> m1 >> h2 >> m2;

    inicio = (60*h1+m1);
    fim = (60*h2+m2);
    
    if ( inicio >= fim ){
        resultado = 1440 - (inicio - fim);
    }else if (inicio < fim){
        resultado = fim - inicio;
    }

    hora = resultado / 60;
    min = resultado % 60;

    cout << "O JOGO DUROU " << hora << " HORA(S) E " << min << " MINUTO(S)" << endl;
}
