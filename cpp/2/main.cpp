// 1848 Corvo Contador https://www.beecrowd.com.br/judge/pt/problems/view/1848

#include <bits/stdc++.h>
using namespace std;

int main()
{
    int grito = 0, piscada = 0;
    string acao;
    while (grito < 3)
    {
        getline(cin, acao);

        if (acao == "caw caw")
        {
            cout << piscada << endl;
            grito++;
            piscada = 0;
        }
        else if (acao == "--*")
        {
            piscada+= 1;
        }
        else if (acao == "-*-")
        {
            piscada +=  2;
        }
        else if (acao == "-**")
        {
            piscada +=  3;
        }
        else if (acao == "*--")
        {
            piscada +=  4;
        }
        else if (acao == "*-*")
        {
            piscada +=  5;
        }
        else if (acao == "**-")
        {
            piscada +=  6;
        }
        else if (acao == "***")
        {
            piscada +=  7;
        }        
        else
        {
            piscada =  0;
        }
    }
}
