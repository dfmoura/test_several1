
#include <bits/stdc++.h>
using namespace std;


typedef struct
{
    string paises;
    int ouro, prata, bronze;
}Quadro_Medalhas;



int main()
{

int n;
cin>>n;

Quadro_Medalhas paises[n];

for(int i=0;i<n;i++){

    cin>>paises[i].paises;
    cin>>paises[i].ouro;
    cin>>paises[i].prata;
    cin>>paises[i].bronze;
}

for (int i = 0; i<n;i++){
    cout<<"País: "<<paises[i].paises<<endl;
    cout<<"Ouro: "<<paises[i].ouro<<endl;
    cout<<"Prata: "<<paises[i].prata<<endl;
    cout<<"Bronze: "<<paises[i].bronze<<endl;
}

}
