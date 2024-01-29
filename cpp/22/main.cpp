
#include <bits/stdc++.h>
using namespace std;


struct Pessoas
{
    string nome;
    int idade;
    double altura;
};


int main()
{

Pessoas pessoa;
pessoa.nome = "Diogo Moura";
pessoa.idade = 39;
pessoa.altura = 184.5;

cout<< "Nome: "<< pessoa.nome<<endl;
cout<< "Idade: "<< pessoa.idade<<endl;
cout<< "Altura: "<<pessoa.altura<<endl;
}
